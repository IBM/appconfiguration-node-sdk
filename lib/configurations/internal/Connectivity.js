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
 * Module to check the internet connectivity.
 * @module Connectivity
 */
const dnsSocket = require('dns-socket');

/**
 * It returns a promise that is fulfilled if there's internet, otherwise if there's no internet
 * it will be rejected
 *
 * @method module:Connectivity#checkInternet
 * @returns {Promise<any>}
 */
module.exports.checkInternet = function isConnected() {
  return new Promise((resolve) => {

    const socket = dnsSocket({
      timeout: 5000,
      retries: 2
    });

    socket.query({
      questions: [{
        type: 'A',
        name: 'cloud.ibm.com'
      }]
    }, 53, '8.8.8.8');

    socket.on('response', () => {
      socket.destroy(() => {
        resolve(true);
      });
    });

    socket.on('timeout', () => {
      socket.destroy(() => {
        resolve(false);
      });
    });

  });
};
