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
 * This module provides methods to construct headers & different url's used by the SDK.
 * @module UrlBuilder
 */
const UrlBuilder = () => {
  let instance = null;

  const _https = 'https://';
  const _webSocket = 'wss://';
  const _baseUrl = '.apprapp.cloud.ibm.com';
  let _region = '';
  const wsUrl = '/wsfeature';
  const _service = '/apprapp';
  const _privateEndpointPrefix = 'private.';

  let _instanceGuid = null;
  let _apikey = null;
  let _overrideServiceUrl = null;
  let _usePrivateEndpoint = false;
  let _webSocketFullUrl = null;

  /**
   * Set the region value
   * @method module:UrlBuilder#setRegion
   * @param {string} region - Region name
   */
  const setRegion = (region) => {
    _region = region;
  };

  /**
   * Set the app guid
   * @method module:UrlBuilder#setGuid
   * @param {string} guid - GUID of the service instance
   */
  const setGuid = (guid) => {
    _instanceGuid = guid;
  };

  /**
   * Set the apikey
   * @method module:UrlBuilder#setApikey
   * @param {string} apikey - APIKEY of the srvice instance
   */
  const setApikey = (apikey) => {
    _apikey = apikey;
  };

  /**
   * Get the apikey
   * @method module:UrlBuilder#getApikey
   * @returns {string} APIKEY of the srvice instance
   */
  const getApikey = () => _apikey;

  /**
   * Set the overridden base service url.
   * Used for testing purpose.
   * @method module:UrlBuilder#setBaseServiceUrl
   * @param {string} url - The Base service url
   */
  const setBaseServiceUrl = (url) => {
    _overrideServiceUrl = url;
  };

  /**
   * Get the base url for the App Configuration service instance
   * @method module:UrlBuilder#getBaseServiceUrl
   * @returns {string} The base service url
   */
  const getBaseServiceUrl = () => {

    // for dev & stage
    if (_overrideServiceUrl) {
      if (_usePrivateEndpoint) {
        const temp = _overrideServiceUrl.split('://');
        return `${temp[0]}://${_privateEndpointPrefix}${temp[1]}`;
      }
      return _overrideServiceUrl;
    }

    // prod
    if (_usePrivateEndpoint) {
      return _https + _privateEndpointPrefix + _region + _baseUrl;
    }
    return _https + _region + _baseUrl;
  };

  /**
   * Get the IAM url
   * @method module:UrlBuilder#getIamUrl
   * @returns {string} The IAM url
   */
  const getIamUrl = () => {

    // for dev & stage
    if (_overrideServiceUrl) {
      if (_usePrivateEndpoint) {
        return `${_https}private.iam.test.cloud.ibm.com`;
      }
      return `${_https}iam.test.cloud.ibm.com`;
    }

    // prod
    if (_usePrivateEndpoint) {
      return `${_https}private.iam.cloud.ibm.com`;
    }
    return `${_https}iam.cloud.ibm.com`;
  };

  /**
   * Set the websocket url
   * @method module:UrlBuilder#setWebSocketUrl
   * @param {String} collectionId - The collection Id
   * @param {String} environmentId - The environment Id
   */
  const setWebSocketUrl = (collectionId, environmentId) => {
    let ws = _webSocket;

    if (_overrideServiceUrl) {
      // for dev & stage
      const temp = _overrideServiceUrl.replace('https://', '').replace('http://', '');
      if (_usePrivateEndpoint) {
        ws += _privateEndpointPrefix;
      }
      ws += temp;
    } else {
      // for prod
      if (_usePrivateEndpoint) {
        ws += _privateEndpointPrefix;
      }
      ws += _region;
      ws += _baseUrl;
    }
    _webSocketFullUrl = `${ws + _service + wsUrl}?instance_id=${_instanceGuid}&collection_id=${collectionId}&environment_id=${environmentId}`;
  };

  /**
   * Get the websocket url
   * @method module:UrlBuilder#getWebSocketUrl
   * @returns {String} The websocket url
   */
  const getWebSocketUrl = () => _webSocketFullUrl;

  /**
   * Use the private endpoint to connect to App Configuration service instance
   * @method module:UrlBuilder#usePrivateEndpoint
   * @param {boolean} usePrivateEndpointParam - Set to true if the SDK should connect to 
   * App Configuration using private endpoint through IBM Cloud private network.
   */
  const usePrivateEndpoint = (usePrivateEndpointParam) => {
    _usePrivateEndpoint = usePrivateEndpointParam;
  };

  /**
   * @method module:UrlBuilder#createInstance
   */
  function createInstance() {
    return {
      setRegion,
      setGuid,
      setBaseServiceUrl,
      setApikey,
      getApikey,
      getIamUrl,
      getBaseServiceUrl,
      getWebSocketUrl,
      setWebSocketUrl,
      usePrivateEndpoint,
    };
  }

  // Return for UrlBuilder
  return {
    getInstance: () => {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    },
  };
};

const Builder = UrlBuilder();

module.exports = {
  UrlBuilder: Builder,
};
