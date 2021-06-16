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
 * Internal client to handle the configuration
 * @module ConfigurationHandler
 */

const path = require('path');

const filePath = path.join(__dirname, 'internal', 'appconfiguration.json');

const { UrlBuilder } = require('../core/UrlBuilder');
const { ApiManager } = require('../core/ApiManager');
const { Logger } = require('../core/Logger');
const { Metering } = require('../core/Metering');
const { Feature } = require('./models/Feature');
const { Property } = require('./models/Property');
const { Segment } = require('./models/Segment');
const { SegmentRules } = require('./models/SegmentRules');
const { FileManager } = require('./internal/FileManager');
const { socketClient, closeWebSocket } = require('./internal/Socket');
const { events } = require('./internal/Events');
const { Constants } = require('./internal/Constants');
const { checkInternet } = require('./internal/Connectivity');

const ConfigurationHandler = () => {
  let instance = null;
  let _collectionId = '';
  let _environmentId = '';
  let _guid = '';
  let _isConnected = true;
  let retryCount = 3;
  const retryTime = 10;
  let interval;
  let intervalShort;
  let _liveUpdate = true;
  let _configurationFile = null;
  let _onSocketRetry = false;

  let _featureMap = {};
  let _propertyMap = {};
  let _segmentMap = {};

  const meteObj = Metering.getInstance();
  const logger = Logger.getInstance();
  const urlBuilder = UrlBuilder.getInstance();
  const emitter = events.getInstance();

  /**
   * Constructs an instance of ConfigurationHandler
   * @method module:ConfigurationHandler#createInstance
   */
  function createInstance() {

    /**
     * Initialize the configuration.
     * 
     * @method module:ConfigurationHandler#init
     * @param {string} region - REGION name where the App Configuration service instance is
     * created.
     * @param {string} guid - GUID of the App Configuration service.
     * @param {string} apikey - APIKEY of the App Configuration service.
     */
    function init(region, guid, apikey) {
      _guid = guid;
      urlBuilder.setRegion(region);
      urlBuilder.setGuid(guid);
      urlBuilder.setApikey(apikey);
      urlBuilder.setAuthenticator();
    }

    /**
     * Used to re-initialize this module
     * 
     * 1. Clears the interval set for internet check
     * 2. Clears the interval set for any retries if they were scheduled
     * 3. Deletes the configurations stored in SDK defined file path
     * @method module:ConfigurationHandler#cleanUp
     */
    function cleanup() {
      clearInterval(interval);
      clearInterval(intervalShort);
      FileManager.deleteFileData(filePath);
      _onSocketRetry = false;
    }

    /**
     * Synchronously read the json configurations stored in the cache file, and load them into
     * respective maps (_featureMap, _propertyMap, _segmentMap)
     * @method module:ConfigurationHandler#loadConfigurations
     */
    function loadConfigurations() {
      const data = FileManager.getFileData(filePath);
      if (data) {
        if (data.features && Object.keys(data.features).length) {
          const { features } = data;
          _featureMap = {};
          features.forEach((feature) => {
            _featureMap[feature.feature_id] = new Feature(feature, feature.enabled);
          });
        }
        if (data.properties && Object.keys(data.properties).length) {
          const { properties } = data;
          _propertyMap = {};
          properties.forEach((property) => {
            _propertyMap[property.property_id] = new Property(property);
          });
        }
        if (data.segments && Object.keys(data.segments).length) {
          const { segments } = data;
          _segmentMap = {};
          segments.forEach((segment) => {
            _segmentMap[segment.segment_id] = new Segment(segment);
          });
        }
      }
    }

    /**
     * Read the configurations from the file path given. And store the same in SDK defined
     * file.
     */
    function storeFiles() {
      const result = FileManager.getFileData(_configurationFile);
      if (Object.keys(result).length > 0) {
        const json = JSON.stringify(result);
        FileManager.storeFiles(json, filePath, () => {
          logger.log('Stored config file');
          emitter.emit(Constants.CACHE_ACTION_SUCCESS);
        });
      }
    }

    /**
     * Writes the given data on to the SDK defined file.
     * 
     * @async
     * @param {JSON|string} fileData - The data to be written
     * @returns {undefined} If fileData is null
     */
    async function writeTofile(fileData) {
      if (fileData == null) {
        logger.log('No data');
        return;
      }
      const json = JSON.stringify(fileData);
      FileManager.storeFiles(json, filePath, () => {
        emitter.emit(Constants.CACHE_ACTION_SUCCESS);
      });
    }

    /**
     * Creates API request and waits for the response.
     * If response has data, then passes the response data to `writeTofile()` method for further
     * actions. Else, logs the error message to console.
     * 
     * @async
     * @method module:ConfigurationHandler#fetchFromAPI
     */
    async function fetchFromAPI() {
      try {
        const query = {
          'environment_id': _environmentId,
        };
        const parameters = {
          options: {
            url: `/apprapp/feature/v1/instances/${_guid}/collections/${_collectionId}/config`,
            method: 'GET',
            qs: query,
          },
          defaultOptions: {
            serviceUrl: urlBuilder.getBaseServiceUrl(),
            headers: urlBuilder.getHeaders(),
          },
        };
        const response = await ApiManager.createRequest(parameters);
        if (response && _liveUpdate) {
          writeTofile(response.result)
        }
      } catch (error) {
        logger.error(error.message);
      }

    }

    /**
     * Perform websocket connect to appconfiguration server
     * 
     * @async
     * @method module:ConfigurationHandler#connectWebSocket
     */
    async function connectWebSocket() {
      try {
        const urlForWebsocket = urlBuilder.getWebSocketUrl(_collectionId, _environmentId);
        const _bearerToken = await urlBuilder.getToken();
        const headers = {
          'Authorization': _bearerToken,
        }
        closeWebSocket(); // close existing websocket connection if any
        socketClient.connect(
          urlForWebsocket, [], [], headers,
        );
      } catch (error) {
        logger.warning(error.message);
        logger.warning('Connection to the App Configuration server failed with unexpected error');
      }
    }

    async function fetchConfigurationsData() {
      if (_configurationFile) {
        storeFiles();
      }
      if (_liveUpdate) {
        await fetchFromAPI();
        retryCount = 3;
        connectWebSocket();
      }
    }

    /**
     *  Sets the context of the SDK
     * 
     * @method module:ConfigurationHandler#setContext
     * @param {string} collectionId - Id of the collection created in App Configuration service
     * instance.
     * @param {string} environmentId - Id of the environment created in App Configuration
     * service instance.
     * @param {string} configurationFile - Path to the JSON file which contains configuration details.
     * @param {boolean} liveConfigUpdateEnabled - live configurations update from the
     * server. Set this value to `false` if the new configuration values shouldn't be fetched
     * from the server.
     */
    function setContext(collectionId, environmentId, configurationFile, liveConfigUpdateEnabled) {
      if ((_collectionId !== collectionId)
        || (_environmentId !== environmentId)
        || (_configurationFile !== configurationFile)
        || (_liveUpdate !== liveConfigUpdateEnabled)) {
        cleanup();
      }
      _collectionId = collectionId;
      _environmentId = environmentId;
      _configurationFile = configurationFile;
      _liveUpdate = liveConfigUpdateEnabled;

      checkInternet().then((val) => {
        if (!val) {
          logger.warning(Constants.NO_INTERNET_CONNECTION_ERROR);
          _isConnected = false;
        }
      });

      if (_liveUpdate) {
        intervalShort = setInterval(() => {
          checkInternet().then((val) => {
            if (!val) {
              logger.warning(Constants.NO_INTERNET_CONNECTION_ERROR);
              _isConnected = false;
            } else {
              if (!_isConnected) {
                _onSocketRetry = false;
                fetchFromAPI();
                connectWebSocket();
              }
              _isConnected = true;
            }
          });
        }, 30000); // 30 second
      }
      loadConfigurations();
      fetchConfigurationsData();

      emitter.on(Constants.CACHE_ACTION_SUCCESS, () => {
        loadConfigurations();
        emitter.emit(Constants.APPCONFIGURATION_CLIENT_EMITTER);
      });
    }

    async function socketActions() {
      fetchFromAPI();
    }

    /**
     * Get the Feature object containing all features
     * 
     * @method module:ConfigurationHandler#getFeatures
     * @returns {object} Feature object
     */
    function getFeatures() {
      return _featureMap;
    }

    /**
     * Get the Feature with give Feature Id
     * 
     * @method module:ConfigurationHandler#getFeature
     * @param {string} featureId - The Feature Id
     * @returns {object|null} Feature object
     */
    function getFeature(featureId) {
      /**
       * check if we already fetched that from cache and have in out featureMap
       * ELSE
       * that means we haven't fetched it, so get it from cache
       * store fetched result in feature map
       */
      if (Object.prototype.hasOwnProperty.call(_featureMap, featureId)) {
        return _featureMap[featureId];
      }
      loadConfigurations();
      if (Object.prototype.hasOwnProperty.call(_featureMap, featureId)) {
        return _featureMap[featureId];
      }
      logger.error(`Invalid feature id - ${featureId}`);
      return null;
    }

    /**
     * Get the Property object containing all properties
     * 
     * @method module:ConfigurationHandler#getProperties
     * @returns {object} Property object
     */
    function getProperties() {
      return _propertyMap;
    }

    /**
     * Get the Property with give Property Id
     * 
     * @method module:ConfigurationHandler#getProperty
     * @param {string} propertyId - The Property Id
     * @returns {object|null} Property object
     */
    function getProperty(propertyId) {
      if (Object.prototype.hasOwnProperty.call(_propertyMap, propertyId)) {
        return _propertyMap[propertyId];
      }
      loadConfigurations();
      if (Object.prototype.hasOwnProperty.call(_propertyMap, propertyId)) {
        return _propertyMap[propertyId];
      }
      logger.error(`Invalid property id - ${propertyId}`);
      return null;
    }

    function getSegment(segmentId) {
      if (Object.prototype.hasOwnProperty.call(_segmentMap, segmentId)) {
        return _segmentMap[segmentId];
      }
      logger.error(`Invalid segment id - ${segmentId}`);
      return null;
    }

    function evaluateSegment(segmentKey, entityAttributes) {
      if (Object.prototype.hasOwnProperty.call(_segmentMap, segmentKey)) {
        const segmentObjc = _segmentMap[segmentKey];
        return segmentObjc.evaluateRule(entityAttributes);
      }
      return null;
    }

    function _parseRules(segmentRules) {
      const rulesMap = {};
      segmentRules.forEach((rules) => {
        rulesMap[rules.order] = new SegmentRules(rules);
      });
      return rulesMap;
    }

    function evaluateRules(_rulesMap, entityAttributes, feature, property) {
      const resultDict = {
        evaluated_segment_id: Constants.DEFAULT_SEGMENT_ID,
        value: null,
      };

      try {
        for (let index = 1; index <= Object.keys(_rulesMap).length; index += 1) {
          const segmentRule = _rulesMap[index];

          if (segmentRule.rules.length > 0) {
            for (let level = 0; level < segmentRule.rules.length; level += 1) {
              const rule = segmentRule.rules[level];

              const { segments } = rule;
              if (segments.length > 0) {
                for (let innerLevel = 0; innerLevel < segments.length; innerLevel += 1) {
                  const segmentKey = segments[innerLevel];

                  if (evaluateSegment(segmentKey, entityAttributes)) {
                    resultDict.evaluated_segment_id = segmentKey;
                    if (segmentRule.value === '$default') {
                      if (feature !== null) {
                        resultDict.value = feature.enabled_value;
                      } else {
                        resultDict.value = property.value;
                      }
                    } else {
                      resultDict.value = segmentRule.value;
                    }
                    return resultDict;
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        logger.error(`RuleEvaluation ${error}`);
      }

      if (feature !== null) {
        resultDict.value = feature.enabled_value;
      } else {
        resultDict.value = property.value;
      }
      return resultDict;
    }

    /**
     * Records each of feature & property evaluations done by sending it to metering module.
     * See {@link module:Metering}
     * 
     * @method module:ConfigurationHandler#recordEvaluation
     * @param {string} featureId - The Feature Id
     * @param {string} propertyId - The Property Id
     * @param {string} entityId - The Entity Id
     * @param {string} segmentId - The Segment Id
     */
    function recordEvaluation(featureId, propertyId, entityId, segmentId) {
      meteObj.addMetering(_guid,
        _environmentId,
        _collectionId,
        entityId,
        segmentId,
        featureId,
        propertyId);
    }

    /**
     * Feature evaluation
     * 
     * @method module:ConfigurationHandler#featureEvaluation
     * @param {object} feature - Feature object
     * @param {string} entityId - Entity Id
     * @param {object} entityAttributes - Entity attributes object
     * @returns {boolean|string|number} Feature evaluated value
     */
    function featureEvaluation(feature, entityId, entityAttributes) {
      let resultDict = {
        evaluated_segment_id: Constants.DEFAULT_SEGMENT_ID,
        value: null,
      };
      try {
        if (feature.enabled) {
          if (!entityAttributes || Object.keys(entityAttributes).length <= 0) {
            return feature.enabled_value;
          }
          if (feature.segment_rules && feature.segment_rules.length > 0) {
            const _rulesMap = _parseRules(feature.segment_rules);
            resultDict = evaluateRules(_rulesMap, entityAttributes, feature, null);
            return resultDict.value;
          }
          return feature.enabled_value;
        }
        return feature.disabled_value;
      } finally {
        recordEvaluation(feature.feature_id, null, entityId, resultDict.evaluated_segment_id);
      }
    }

    /**
     * Property evaluation
     * 
     * @method module:ConfigurationHandler#propertyEvaluation
     * @param {object} property - Property object
     * @param {string} entityId - Entity Id
     * @param {object} entityAttributes - Entity attributes object
     * @returns {boolean|string|number} Property evaluated value
     */
    function propertyEvaluation(property, entityId, entityAttributes) {
      let resultDict = {
        evaluated_segment_id: Constants.DEFAULT_SEGMENT_ID,
        value: null,
      };
      try {
        if (!entityAttributes || Object.keys(entityAttributes).length <= 0) {
          return property.value;
        }
        if (property.segment_rules && property.segment_rules.length > 0) {
          const _rulesMap = _parseRules(property.segment_rules);
          resultDict = evaluateRules(_rulesMap, entityAttributes, null, property);
          return resultDict.value;
        }
        return property.value;
      } finally {
        recordEvaluation(null, property.property_id, entityId, resultDict.evaluated_segment_id);
      }
    }

    /**
     * Method used to schedule re-connect to configuration server, if it has failed
     * in the first attempt.
     * 
     * @method module:ConfigurationHandler#startTimer
     */
    function startTimer() {
      if (interval) {
        clearInterval(interval);
      }
      interval = setInterval(() => {
        _onSocketRetry = false;
        fetchFromAPI();
        connectWebSocket();
      }, retryTime * 60000);
    }

    // Socket Listeners
    emitter.on(Constants.SOCKET_CONNECTION_ERROR, (error) => {
      _onSocketRetry = true;
      if (retryCount > 0) {
        logger.error(`Retrying connection to the App Configuration server failed. ${error}`);
        retryCount -= 1;
        connectWebSocket();
      } else {
        logger.error(`Failed connecting to the App Configuration server. Retrying after ${retryTime} minutes.`);
        startTimer();
      }
    });

    emitter.on(Constants.SOCKET_LOST_ERROR, (error) => {
      logger.warning(`Error while connecting to App Configuration server. ${error}. Starting timer to get data in every ${retryTime} minutes.`);
      startTimer();
    });

    emitter.on(Constants.SOCKET_CONNECTION_CLOSE, () => {
      logger.warning('server connection closed. Creating a new connection to the server.');
      _onSocketRetry = true;
      connectWebSocket();
    });

    emitter.on(Constants.SOCKET_MESSAGE_RECEIVED, (data) => {
      logger.log(`Received message from server. ${data}`);
    });

    emitter.on(Constants.SOCKET_CALLBACK, () => {
      socketActions();
    });

    emitter.on(Constants.SOCKET_MESSAGE_ERROR, () => {
      logger.warning('Message received from server is invalid.');
    });

    emitter.on(Constants.SOCKET_CONNECTION_SUCCESS, () => {
      logger.log('Successfully connected to App Configuration server');
      if (_onSocketRetry === true) {
        socketActions();
      }
      if (interval) {
        clearInterval(interval);
      }
    });

    return {
      init,
      setContext,
      getFeature,
      getFeatures,
      getProperty,
      getProperties,
      getSegment,
      featureEvaluation,
      propertyEvaluation,
      cleanup,
    };
  }

   // Return for ConfigurationHandler
  return {
    getInstance: () => {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    },
    currentInstance: () => {
      if (instance) {
        return instance;
      }
      throw Error(' Initialize object first');
    },
  };
};

const handler = ConfigurationHandler();
module.exports = {
  configurationHandler: handler,
};
