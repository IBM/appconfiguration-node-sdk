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

const WebSocketClient = require('websocket').client
const client = new WebSocketClient({
  closeTimeout: 120000
})
const {
  events
} = require('./Events')
const {
  Constants
} = require('./Constants')
const {
  Logger
} = require('../../core/Logger')

const emitter = events.getInstance()
const logger = Logger.getInstance()
let connectionObj;

function closeWebSocket() {
  if (connectionObj && connectionObj.connected) {
    connectionObj.close(Constants.CUSTOM_SOCKET_CLOSE_REASON_CODE)
  }
}

client.on('connectFailed', function (error) {
  emitter.emit(Constants.SOCKET_CONNECTION_ERROR, `Error while connecting to server ${error.message}`)
})

client.on('connect', function (connection) {

  connectionObj = connection
  // add a listener that closes the websocket connection when triggered intentionally
  if (emitter.listenerCount(Constants.DELIBERATE_SOCKET_CLOSE) < 1) {
    emitter.on(Constants.DELIBERATE_SOCKET_CLOSE, function () {
      connection.close(Constants.DELIBERATE_SOCKET_CLOSE_REASON_CODE)
    })
  }

  emitter.emit(Constants.SOCKET_CONNECTION_SUCCESS_COPY, function () { })

  emitter.emit(Constants.SOCKET_CONNECTION_SUCCESS, `Successfully connected to App Configuration server`)

  connection.on('error', function (error) {
    emitter.emit(Constants.SOCKET_LOST_ERROR, `Error while connecting to App Configuration server ${error.message}`)
  })

  connection.on('close', function (result) {
    if (result === Constants.CUSTOM_SOCKET_CLOSE_REASON_CODE) {
      // logger.log(`#:`, 'Do Nothing')
    } else if (result === Constants.DELIBERATE_SOCKET_CLOSE_REASON_CODE) {
      logger.log(`#:`, 'Socket connection closed. Working with local configuration file');
    }
    else {
      emitter.emit(Constants.SOCKET_CONNECTION_CLOSE, "Connection to server closed")
    }
  })

  connection.on('message', function (message) {
    if (message.type === 'utf8') {

      let dataJson = {};

      if (message.utf8Data === 'test message') {
        emitter.emit(Constants.SOCKET_MESSAGE_RECEIVED, `Heartbeat message`)
        return
      }

      let msgArray = message.utf8Data.split(';')

      msgArray.forEach(msg => {
        let keyValue = msg.replace(/\s/g, '').split(':')
        dataJson[keyValue[0]] = keyValue[1];
      });
      dataJson = JSON.parse(JSON.stringify(dataJson));

      emitter.emit(Constants.SOCKET_MESSAGE_RECEIVED, `Message received from server ${JSON.stringify(dataJson)}`)
      emitter.emit(Constants.SOCKET_CALLBACK, dataJson)

    } else {
      emitter.emit(Constants.SOCKET_MESSAGE_ERROR, "Message received from server is invalid")
    }
  })
})

module.exports = {
  socketClient: client,
  closeWebSocket: closeWebSocket
}