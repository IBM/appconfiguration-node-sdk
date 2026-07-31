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
 * This module provides the methods to facilitate the API requests to the App Configuration service.
 * @module ApiManager
 */

const { BaseService, IamAuthenticator, NoAuthAuthenticator } = require('ibm-cloud-sdk-core');
const { UrlBuilder } = require('./UrlBuilder');
const { Constants } = require('../configurations/internal/Constants');
const pkg = require('../../package.json');

const urlBuilder = UrlBuilder.getInstance();
let _authenticator = null;
let _baseServiceClient = null;
let relayProxyConfigured = false;

function setRelayProxyConfigured() {
  relayProxyConfigured = true;
}

function getRelayProxyConfigured() {
  return relayProxyConfigured;
}

/**
 * Get the Request headers
 *
 * @method module:ApiManager#getHeaders
 * @param {boolean} isPost for POST API requests
 * @returns {object} required headers
 */
function getHeaders(isPost = false) {
  const headers = {
    'Accept': 'application/json',
    'User-Agent': `appconfiguration-node-sdk/${pkg.version}`,
  };
  if (isPost) {
    headers['Content-Type'] = 'application/json';
  }
  if (relayProxyConfigured) {
    // this is for the case when sdk is set to relay proxy mode, apikey is directly set as Auth header
    headers.Authorization = urlBuilder.getApikey();
  }
  return headers;
}

/**
 * Sets the Authenticator
 * @method module:ApiManager#setAuthenticator
 */
function setAuthenticator() {
  if (relayProxyConfigured) {
    _authenticator = new NoAuthAuthenticator();
  } else {
    _authenticator = new IamAuthenticator({
      apikey: urlBuilder.getApikey(),
      url: urlBuilder.getIamUrl(),
    });
  }
}

/** Get BaseService client.
 *
 * @method module:ApiManager#getBaseServiceClient
 * @returns {BaseService} BaseService client
 */
function getBaseServiceClient() {
  if (_baseServiceClient === null) {
    _baseServiceClient = new BaseService({ authenticator: _authenticator });
    // Maximum number of retries is put as 3. The maximum interval between two successive retries is used as default value (30 seconds), but we can override it too.
    _baseServiceClient.enableRetries({ maxRetries: Constants.MAX_NUMBER_OF_RETRIES });
    return _baseServiceClient;
  }
  return _baseServiceClient;
}

/**
 * Get the IAM bearer token stored in the `ibm-cloud-sdk-core`
 *
 * @async
 * @method module:ApiManager#getToken
 * @returns {string} The Bearer token
 */
async function getToken() {
  const options = {};
  try {
    await _authenticator.authenticate(options);
  } catch (e) {
    const errMsg = `Failed to get authentication token for websocket connect. Error ${e}`
    throw new Error(errMsg)
  }
  return options.headers.Authorization; // will return the string "Bearer <token>"
}

/**
 * @method module:ApiManager#getIamAuthenticator
 * @returns {object} The IAM Authenticator object
 */
function getIamAuthenticator() { return _authenticator; }

module.exports = {
  getHeaders,
  setAuthenticator,
  getBaseServiceClient,
  getToken,
  setRelayProxyConfigured,
  getRelayProxyConfigured,
};
