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
 * UrlBuilder
 * @module UrlBuilder
 */
const UrlBuilder = () => {
  let instance = null

  let _https = 'https://'
  let _webSocket = 'wss://'
  let _baseUrl = '.apprapp.cloud.ibm.com'
  let _region = ''
  let wsUrl = '/wsfeature'
  let _path = '/feature/v1/instances/'
  let _events = '/events/v1/instances/'
  let _service = '/apprapp'

  let _instanceGuid = null
  let _featuresUrl = null
  let _apikey = null
  let _overrideServerHost = null

  /**
   * Set the region value
   * @method module:UrlBuilder#setRegion
   * @param {String} region
   */
  const setRegion = region => {
    _region = region
    setConfigBaseUrl()
  }

  /**
   * Set the app guid
   * @method module:UrlBuilder#setGuid
   * @param {String} guid
   */
  const setGuid = guid => {
    _instanceGuid = guid
    setConfigBaseUrl()
  }

  /**
   * Set the custom server url
   * @method module:UrlBuilder#setOverrideServerHost
   * @param {String} overrideServerHost
   */
  const setOverrideServerHost = overrideServerHost => {
    _overrideServerHost = overrideServerHost
    setConfigBaseUrl()
  }

  /**
   * Create the app config base url
   * @method module:UrlBuilder#setConfigBaseUrl
   */
  const setConfigBaseUrl = () => {
    _featuresUrl = getBaseUrl() + '/collections'
  }

  /**
   * Set the apikey
   * @method module:UrlBuilder#setApikey
   * @param {String} apikey
   */
  const setApikey = apikey => {
    _apikey = apikey;
  }

  /**
   * Get the Request headers
   * @method module:UrlBuilder#getHeaders
   * @param bool isPost
   */
  const getHeaders = (isPost = false) => {
    if (isPost) {
      return {
        'Content-Type': 'application/json',
        'Authorization': _apikey
      };
    } else {
      return {
        'Authorization': _apikey
      };
    }
  }

  /**
   * Get the app config url
   * @method module:UrlBuilder#getConfigUrl
   * @param {String} collectionId
   * @returns {String} url
   */
  const getConfigUrl = (collectionId) => {
    return _featuresUrl + `/${collectionId}/config`
  }

  /**
   * Get the websocket url
   * @method module:UrlBuilder#getWebSocketUrl
   * @param {String} collectionId
   */
  const getWebSocketUrl = (collectionId) => {
    let ws = _webSocket
    if (_overrideServerHost) {
      ws += _overrideServerHost
    } else {
      ws += _region
      ws += _baseUrl
    }
    return ws + _service + wsUrl + `?instance_id=${_instanceGuid}&collection_id=${collectionId}`
  }

  /**
   * Return the base url for the App Configuration service instance
   * @method module:UrlBuilder#getBaseUrl
   */
  const getBaseUrl = () => {
    if (_overrideServerHost) {
      return _https + _overrideServerHost + _service + _path + _instanceGuid;
    } else {
      return _https + _region + _baseUrl + _service + _path + _instanceGuid;
    }
  }

  /**
   * Get the metering url
   * @method module:UrlBuilder#getMeteringurl
   * @param {String} instanceGuid
   */
  const getMeteringurl = (instanceGuid) => {

    var base = _https + _region + _baseUrl + _service
    if (_overrideServerHost) {
      base = _https + _overrideServerHost + _service;
    }

    return base + _events + `${instanceGuid}` + "/usage"
  }

  /**
   * @method module:UrlBuilder#createInstance
   */
  function createInstance() {
    return {
      setRegion,
      setGuid,
      setOverrideServerHost,
      setApikey,
      getConfigUrl,
      getHeaders,
      getWebSocketUrl,
      getBaseUrl,
      getMeteringurl
    }
  }

  return {
    getInstance: () => {

      if (!instance) {
        instance = createInstance()
      }
      return instance
    }
  }
}

const Builder = UrlBuilder()

module.exports = {
  UrlBuilder: Builder
}