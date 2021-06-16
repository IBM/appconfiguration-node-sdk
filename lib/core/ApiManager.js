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

const {
  BaseService
} = require('ibm-cloud-sdk-core');
const {
  Logger,
} = require('./Logger');
const {
  UrlBuilder,
} = require('./UrlBuilder');

const options = {};
const logger = Logger.getInstance();
const urlBuilder = UrlBuilder.getInstance();

/**
 * Create the API call request.
 * 
 * @async
 * @param {object} parameters API request options
 * @returns {Promise<any>} 
 */
async function createRequest(parameters) {
  try {
    options.authenticator = urlBuilder.getIamAuthenticator();
    const baseRequest = new BaseService(options);
    const response = await baseRequest.createRequest(parameters);
    if (response && response.status >= 200 && response.status < 300) {
      return response;
    }
    return null;
  } catch (error) {
    logger.error(error.body);
    return null;
  }
}

module.exports.ApiManager = {
  createRequest,
};
