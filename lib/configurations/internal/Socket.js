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

/**
 * Listeners for websocket connection.
 */
socketClient.on('httpResponse', async (response) => {
  socketConnectComplete = true;
  const { statusCode } = response;
  const errMsg =
    `WebSocket connect request to the App Configuration server failed. Status code: ${statusCode}. Message: ${response.statusMessage}`
  if (statusCode >= 400 && statusCode <= 499 && statusCode !== 429) {
    // 'Do Nothing! Since websocket connect failed due to client-side error.
    logger.error(errMsg);
    return;
  }
  logger.warning(`${errMsg} Retrying websocket connect in 15 seconds...`);
  await new Promise(resolve => setTimeout(resolve, 15000));
  emitter.emit(Constants.SOCKET_CONNECTION_ERROR, response);
})

socketClient.on('connectFailed', async (error) => {
  socketConnectComplete = true;
  logger.warning(`connectFailed: ${error.message} Retrying websocket connect in 15 seconds...`);
  await new Promise(resolve => setTimeout(resolve, 15000));
  emitter.emit(Constants.SOCKET_CONNECTION_ERROR, error);
});

socketClient.on('connect', (connection) => {
  socketConnectComplete = true;
  connectionObj = connection;

  emitter.emit(Constants.SOCKET_CONNECTION_SUCCESS);

  connection.on('error', async (error) => {
    logger.warning(`websocket: received error event. ${error.message} Retrying websocket connect in 15 seconds...`)
    await new Promise(resolve => setTimeout(resolve, 15000));
    emitter.emit(Constants.SOCKET_LOST_ERROR, error);
  });

  connection.on('close', async (result, description) => {
    if (result === Constants.CUSTOM_SOCKET_CLOSE_REASON_CODE) {
      // logger.log('Do Nothing');
    } else {
      logger.warning(`websocket: received close event. ${result} ${description} Retrying websocket connect in 15 seconds...`)
      await new Promise(resolve => setTimeout(resolve, 15000));
      emitter.emit(Constants.SOCKET_CONNECTION_CLOSE);
    }
  });

  connection.on('message', (message) => {
    if (message.type === 'utf8') {
      let dataJson = {};

      if (message.utf8Data === 'test message') {
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
      emitter.emit(Constants.SOCKET_MESSAGE_ERROR);
    }
  });
});

function closeWebSocket() {
  if (connectionObj && connectionObj.connected) {
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
    logger.warning(`WebSocket connect request to the App Configuration server failed with unexpected error ${e}`);
  }
}

module.exports = {
  connectWebSocket,
  socketClient, // exported only for testing purpose
};
