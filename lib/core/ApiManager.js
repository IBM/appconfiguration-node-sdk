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

const { BaseService, IamAuthenticator } = require('ibm-cloud-sdk-core');
const { UrlBuilder } = require('./UrlBuilder');
const { Constants } = require('../configurations/internal/Constants');
const pkg = require('../../package.json');

const urlBuilder = UrlBuilder.getInstance();
let _iamAuthenticator = null;
let _baseServiceClient = null;

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
    return headers;
}

/**
 * Sets the Authenticator
 * @method module:ApiManager#setAuthenticator
 */
function setAuthenticator() {
    _iamAuthenticator = new IamAuthenticator({
        apikey: urlBuilder.getApikey(),
        url: urlBuilder.getIamUrl()
    })
}

/** Get BaseService client.
 * 
 * @method module:ApiManager#getBaseServiceClient
 * @returns {BaseService} BaseService client
 */
function getBaseServiceClient() {
    if (_baseServiceClient === null) {
        _baseServiceClient = new BaseService({ authenticator: _iamAuthenticator });
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
    await _iamAuthenticator.authenticate(options);
    return options.headers.Authorization; // will return the string "Bearer <token>"
}

/**
 * @method module:ApiManager#getIamAuthenticator
 * @returns {object} The IAM Authenticator object
 */
function getIamAuthenticator() { return _iamAuthenticator; }

module.exports = {
    getHeaders,
    setAuthenticator,
    getBaseServiceClient,
    getToken,
    getIamAuthenticator,
};
