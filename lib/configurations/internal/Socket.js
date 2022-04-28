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

const client = new WebSocketClient({
  closeTimeout: 120000,
});
const {
  events,
} = require('./Events');
const {
  Constants,
} = require('./Constants');

const emitter = events.getInstance();
let connectionObj;

/**
 * Checks the connection status.
 * If connection exists, it closes the connection.
 *
 * @method module:WebSocketClient#closeWebSocket
 */
function closeWebSocket() {
  if (connectionObj && connectionObj.connected) {
    connectionObj.close(Constants.CUSTOM_SOCKET_CLOSE_REASON_CODE);
  }
}

/**
 * Listeners for websocket connection.
 */
client.on('connectFailed', (error) => {
  emitter.emit(Constants.SOCKET_CONNECTION_ERROR, `Error while connecting to server ${error.message}`);
});

client.on('connect', (connection) => {
  connectionObj = connection;

  emitter.emit(Constants.SOCKET_CONNECTION_SUCCESS);

  connection.on('error', (error) => {
    emitter.emit(Constants.SOCKET_LOST_ERROR, `Error while connecting to App Configuration server ${error.message}`);
  });

  connection.on('close', (result) => {
    if (result === Constants.CUSTOM_SOCKET_CLOSE_REASON_CODE) {
      // logger.log('Do Nothing');
    } else {
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

      emitter.emit(Constants.SOCKET_MESSAGE_RECEIVED, `Message received from server ${JSON.stringify(dataJson)}`);
      emitter.emit(Constants.SOCKET_CALLBACK);
    } else {
      emitter.emit(Constants.SOCKET_MESSAGE_ERROR);
    }
  });
});

module.exports = {
  socketClient: client,
  closeWebSocket,
};
