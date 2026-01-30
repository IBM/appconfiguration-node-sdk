/**
 * Copyright 2021 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * This module provides methods to perform operations on the websocket connection to the server.
 *
 * @module WebSocketClient
 */

const WebSocketClient = require('websocket').client;
const { events } = require('./Events');
const { Constants } = require('./Constants');
const { UrlBuilder } = require('../../core/UrlBuilder');
const { Logger } = require('../../core/Logger');
const { getToken } = require('../../core/ApiManager');
const pkg = require('../../../package.json');

const socketClient = new WebSocketClient({ closeTimeout: 120000 });
const logger = Logger.getInstance();
const urlBuilder = UrlBuilder.getInstance();
const emitter = events.getInstance();

let socketConnectComplete = true;
let connectionObj;
let _isActive = false;

// Retry configuration
const RETRY_CONFIG = {
  initialDelay: 15 * 1000,      // Start with 15 seconds
  maxDelay: 1 * 60 * 60 * 1000, // Cap at 1 hour
  multiplier: 2,                // Double the delay each time
  jitterFactor: 0.3             // Add up to 30% random jitter
};

// Watchdog configuration
const WATCHDOG_CONFIG = {
  checkInterval: 60 * 1000,     // Check every 60 seconds (2x heartbeat interval)
  heartbeatTimeout: 120 * 1000  // Expect heartbeat within 120 seconds (4x heartbeat interval)
};

// Retry state
const retryState = {
  attempt: 0,
  currentDelay: RETRY_CONFIG.initialDelay,
  retryTimeoutId: null
};

// Watchdog state
const watchdogState = {
  intervalId: null,         // the setInterval id
  lastHeartbeatTime: null,  //
  isEnabled: false          // tells if watchdog is active (i.e., setInterval is running or not)
};

// Attempt: 0,  1,   2,  3,  4,  5,  6,   7,   8,   9,   10   ...
// Output: 15s, 30s, 1m, 2m, 4m, 8m, 16m, 32m, 60m, 60m, 60m  ...
function calculateRetryDelay() {
  const baseDelay = Math.min(RETRY_CONFIG.initialDelay * (RETRY_CONFIG.multiplier ** retryState.attempt), RETRY_CONFIG.maxDelay);
  const jitter = baseDelay * RETRY_CONFIG.jitterFactor * (Math.random() * 2 - 1);
  const delayWithJitter = Math.max(0, baseDelay + jitter);
  retryState.currentDelay = delayWithJitter;
  return delayWithJitter;
}

// Reset the websocket retry after successful connection
function resetRetryState() {
  if (retryState.retryTimeoutId) {
    clearTimeout(retryState.retryTimeoutId);
    retryState.retryTimeoutId = null;
  }
  retryState.attempt = 0;
  retryState.currentDelay = RETRY_CONFIG.initialDelay;
}

// Schedule a retry attempt with exponential backoff
async function scheduleRetry(eventToEmit, eventData, logMsg) {
  // Prevent multiple concurrent reconnection attempts if already triggered by any of 'error', 'close', 'connectFailed', 'httpResponse', 'watchdogTimer'.
  if (retryState.retryTimeoutId !== null) {
    logger.log(`${logMsg} Retry already scheduled, skipping duplicate retry attempt`);
    return;
  }
  const delay = calculateRetryDelay();
  const seconds = (delay / 1000).toFixed(2);
  logger.warning(`${logMsg} Retrying websocket connection in ${seconds} seconds (attempt ${retryState.attempt + 1})...`);

  retryState.retryTimeoutId = setTimeout(() => {
    retryState.attempt++;
    retryState.retryTimeoutId = null;
    emitter.emit(eventToEmit, eventData);
  }, delay);
}

// Watchdog timer to monitor heartbeat messages
// If 'close' or 'error' handlers fails to detect the disconnection, this watchdog initiates a reconnect - if heartbeats received from the server are stopped.
function startWatchdog() {
  stopWatchdog(); // Stop existing watchdog if any
  watchdogState.lastHeartbeatTime = Date.now(); // Initialize last heartbeat time to current time
  watchdogState.isEnabled = true;
  logger.log(`Watchdog timer started - monitoring heartbeat every ${WATCHDOG_CONFIG.checkInterval / 1000}s`);

  watchdogState.intervalId = setInterval(() => {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - watchdogState.lastHeartbeatTime;
    if (timeSinceLastHeartbeat > WATCHDOG_CONFIG.heartbeatTimeout) {
      const logMsg = `Watchdog detected stale connection - no heartbeat received for ${(timeSinceLastHeartbeat / 1000).toFixed(1)}s (threshold: ${WATCHDOG_CONFIG.heartbeatTimeout / 1000}s)`;
      stopWatchdog();
      _isActive = false;
      scheduleRetry(Constants.SOCKET_CONNECTION_CLOSE, { reason: 'watchdog_timeout' }, logMsg);
    }
  }, WATCHDOG_CONFIG.checkInterval);
}

function stopWatchdog() {
  if (watchdogState.intervalId) {
    clearInterval(watchdogState.intervalId);
    watchdogState.intervalId = null;
  }
  watchdogState.isEnabled = false;
  watchdogState.lastHeartbeatTime = null;
}

function updateHeartbeat() {
  watchdogState.lastHeartbeatTime = Date.now();
}

/**
 * Listeners for websocket connection.
 */
socketClient.on('httpResponse', async (response) => {
  socketConnectComplete = true;
  _isActive = false;
  const { statusCode } = response;
  const errMsg = `WebSocket connect request to the App Configuration server failed. Status code: ${statusCode}. Message: ${response.statusMessage}`
  if (statusCode >= 400 && statusCode < 499 && statusCode !== 429) {
    // 'Do Nothing! Since websocket connect failed due to client-side error.
    logger.error(errMsg);
    return;
  }
  await scheduleRetry(Constants.SOCKET_CONNECTION_ERROR, response, errMsg);
})

socketClient.on('connectFailed', async (error) => {
  socketConnectComplete = true;
  _isActive = false;
  const logMsg = `connectFailed: ${error?.message ?? String(error)}`;
  await scheduleRetry(Constants.SOCKET_CONNECTION_ERROR, error, logMsg);
});

socketClient.on('connect', (connection) => {
  socketConnectComplete = true;
  _isActive = true;
  connectionObj = connection;

  // Connection successful: Reset the retry(delay, attempt) and start watchdog timer to monitor heartbeats.
  resetRetryState();
  startWatchdog();
  emitter.emit(Constants.SOCKET_CONNECTION_SUCCESS);

  connection.on('error', async (error) => {
    _isActive = false;
    stopWatchdog();
    const logMsg = `websocket: received error event. ${error?.message ?? String(error)}`;
    await scheduleRetry(Constants.SOCKET_LOST_ERROR, error, logMsg);
  });

  connection.on('close', async (result, description) => {
    _isActive = false;
    stopWatchdog();
    if (result === Constants.CUSTOM_SOCKET_CLOSE_REASON_CODE) {
      resetRetryState();
      // logger.log('Do Nothing');
    } else {
      const logMsg = `websocket: received close event. ${result} ${description}`;
      await scheduleRetry(Constants.SOCKET_CONNECTION_CLOSE, null, logMsg);
    }
  });

  connection.on('message', (message) => {
    _isActive = true;
    if (message.type === 'utf8') {
      let dataJson = {};
      if (message.utf8Data === 'test message') {
        updateHeartbeat();
        emitter.emit(Constants.SOCKET_MESSAGE_RECEIVED, 'Heartbeat message');
        return;
      }

      const msgArray = message.utf8Data.split(';');
      msgArray.forEach((msg) => {
        const [key, value,] = msg.replace(/\s/g, '').split(':');
        dataJson[key] = value;
      });

      dataJson = JSON.parse(JSON.stringify(dataJson));
      emitter.emit(Constants.SOCKET_MESSAGE_RECEIVED, `${JSON.stringify(dataJson)}`);
      emitter.emit(Constants.SOCKET_CALLBACK);
    } else {
      emitter.emit(Constants.SOCKET_MESSAGE_ERROR, message.type);
    }
  });
});

function closeWebSocket() {
  if (connectionObj && connectionObj.connected) {
    stopWatchdog();
    connectionObj.close(Constants.CUSTOM_SOCKET_CLOSE_REASON_CODE);
  }
}

async function connectWebSocket() {
  try {
    if (socketConnectComplete === false) return;
    socketConnectComplete = false;
    const urlForWebsocket = urlBuilder.getWebSocketUrl();
    const _bearerToken = await getToken();
    const headers = {
      Authorization: _bearerToken,
      'User-Agent': `appconfiguration-node-sdk/${pkg.version}`
    };
    closeWebSocket(); // close existing websocket connection if any
    socketClient.connect(
      urlForWebsocket, [], [], headers,
    );
  } catch (e) {
    logger.error(`WebSocket connect request to the App Configuration server failed with unexpected error ${e}`);
  }
}

/**
 * isConnected function return the status of websocket connection
 * @returns {boolean} status of the websocket connection
 */
function isConnected() {
  return _isActive;
}

// Note: currently this function is not used anywhere. It is useful for debugging/monitoring
function getRetryState() {
  return {
    attempt: retryState.attempt,
    currentDelay: retryState.currentDelay,
    hasScheduledRetry: retryState.retryTimeoutId !== null
  };
}

// Note: currently this function is not used anywhere. It is useful for debugging/monitoring
function getWatchdogState() {
  const now = Date.now();
  const timeSinceLastHeartbeat = watchdogState.lastHeartbeatTime ? now - watchdogState.lastHeartbeatTime : null;

  return {
    isEnabled: watchdogState.isEnabled,
    lastHeartbeatTime: watchdogState.lastHeartbeatTime,
    timeSinceLastHeartbeat: timeSinceLastHeartbeat,
    heartbeatTimeoutThreshold: WATCHDOG_CONFIG.heartbeatTimeout,
    checkInterval: WATCHDOG_CONFIG.checkInterval
  };
}

module.exports = {
  connectWebSocket,
  isConnected,

  // exported only for testing purposes
  socketClient,
  getRetryState,
  getWatchdogState
};
