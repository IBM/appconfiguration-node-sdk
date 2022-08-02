/* eslint-disable camelcase */
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
const fs = require('fs');
const { UrlBuilder } = require('../core/UrlBuilder');
const { Logger } = require('../core/Logger');
const { Metering } = require('../core/Metering');
const { getBaseServiceClient, getHeaders, getToken, setAuthenticator } = require('../core/ApiManager');
const { Feature } = require('./models/Feature');
const { Property } = require('./models/Property');
const { Segment } = require('./models/Segment');
const { SegmentRules } = require('./models/SegmentRules');
const { FileManager } = require('./internal/FileManager');
const { getNormalizedValue } = require('./internal/Utils');
const { socketClient, closeWebSocket } = require('./internal/Socket');
const { events } = require('./internal/Events');
const { Constants } = require('./internal/Constants');
const { checkInternet } = require('./internal/Connectivity');
const { reasonSegmentValueFeatureFlag,
  reasonSegmentValueProperty,
  reasonEnabledValueFeatureFlag_1,
  reasonEnabledValueFeatureFlag_2,
  reasonDisabledValueFeatureFlag_1,
  reasonDisabledValueFeatureFlag_2,
  reasonDisabledValueFeatureFlag_3,
  reasonDisabledValueFeatureFlag_4,
  reasonDefaultValueProperty_1,
  reasonDefaultValueProperty_2,
  reasonErrorInEvaluation,
} = require('./internal/Messages');

const ConfigurationHandler = () => {
  let instance = null;
  let _collectionId;
  let _environmentId;
  let _guid;
  let _isConnected = true;
  let retryScheduled;
  const retryTime = 10;
  let interval;
  let _liveUpdate = true;
  let _bootstrapFile;
  let _persistentCacheDirectory;
  let persistentData;
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
      setAuthenticator();
    }

    /**
     * Used to re-initialize this module
     *
     * 1. Clears the interval set for internet check
     * 2. Clears any scheduled retries if they were set
     * 3. Deletes the configurations stored in SDK defined file path
     * @method module:ConfigurationHandler#cleanup
     */
    function cleanup() {
      clearInterval(interval);
      clearTimeout(retryScheduled);
      if (_persistentCacheDirectory) {
        FileManager.deleteFileData(path.join(_persistentCacheDirectory, 'appconfiguration.json'));
      }
      _onSocketRetry = false;
    }

    /**
     * Stores the given configurations data into respective maps.
     * (_featureMap, _propertyMap, _segmentMap)
     *
     * @method module:ConfigurationHandler#loadConfigurationsToCache
     * @param {JSON} data - The configurations data
     */
    function loadConfigurationsToCache(data) {
      if (data) {
        if (data.features && Object.keys(data.features).length) {
          const { features } = data;
          _featureMap = {};
          features.forEach((feature) => {
            _featureMap[feature.feature_id] = new Feature(feature);
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
     * Writes the given data on to the persistent volume.
     *
     * @async
     * @param {JSON|string} fileData - The data to be written
     * @returns {undefined} If fileData is null
     */
    async function writeToPersistentStorage(fileData) {
      if (fileData == null) {
        logger.log('No data');
        return;
      }
      const json = JSON.stringify(fileData);
      FileManager.storeFiles(json, (path.join(_persistentCacheDirectory, 'appconfiguration.json')), () => { });
    }

    /**
     * Creates API request and waits for the response.
     * If response has data, then passes the response data to `writeToPersistentStorage()` method
     * for further actions. Else, logs the error message to console.
     *
     * @async
     * @method module:ConfigurationHandler#fetchFromAPI
     */
    async function fetchFromAPI() {
      const query = {
        environment_id: _environmentId,
      };
      const parameters = {
        options: {
          url: `/apprapp/feature/v1/instances/${_guid}/collections/${_collectionId}/config`,
          method: 'GET',
          qs: query,
        },
        defaultOptions: {
          serviceUrl: urlBuilder.getBaseServiceUrl(),
          headers: getHeaders(),
        },
      };

      // 2xx - Do not retry (Success)
      // 3xx - Do not retry (Redirect)
      // 4xx - Do not retry (Client errors)
      // 429 - Retry ("Too Many Requests")
      // 5xx - Retry (Server errors)

      // The createRequest() below is itself an retryableRequest. Hence, we don't need to write the retry login again.
      //
      // The API call gets retried within createRequest() for 3 times in an exponential interval(0.5s, 1s, 1.5s) between each retries.
      // If all the 3 retries fails, the "await" gets completed. The execution goes to catch block
      //
      // For 429 error code - The createRequest() will retry the request 3 times in an interval of time mentioned in ["retry-after"] header.
      // If all the 3 retries exhausts the "await" gets completed. The execution goes to catch block
      //
      // Both the cases [429 & 5xx] we schedule a retry after 10 minutes.

      let _response;

      try {
        _response = await getBaseServiceClient().createRequest(parameters);
      } catch (_exception) {
        logger.error(`${Constants.ERROR_FETCH_FROM_API}. ${_exception}`);
        if ((_exception.status >= Constants.STATUS_CODE_SERVER_ERROR_BEGIN && _exception.status <= Constants.STATUS_CODE_SERVER_ERROR_END) || (_exception.status === Constants.STATUS_CODE_TOO_MANY_REQUESTS) || (_exception.status === undefined)) {
          logger.error(`Failed to fetch the configurations. Retrying again after ${retryTime} minutes`);
          retryScheduled = setTimeout(() => fetchFromAPI(), retryTime * 60000);
        }
        return;
      }

      if (_response && _response.status === Constants.STATUS_CODE_OK) {
        logger.log(Constants.SUCCESSFULLY_FETCHED_THE_CONFIGURATIONS);
        // load the configurations in the response to cache maps
        loadConfigurationsToCache(_response.result);
        emitter.emit(Constants.MEMORY_CACHE_ACTION_SUCCESS);
        // asynchronously write the response to persistent volume, if enabled
        if (_persistentCacheDirectory) {
          writeToPersistentStorage(_response.result);
        }
      } else {
        // rare or impossible case
        logger.error(`Failed to fetch the configurations due to unknown reasons. ${_response}`);
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
        const _bearerToken = await getToken();
        const headers = {
          Authorization: _bearerToken,
        };
        closeWebSocket(); // close existing websocket connection if any
        socketClient.connect(
          urlForWebsocket, [], [], headers,
        );
      } catch (error) {
        logger.warning(error.message);
        logger.warning('Connection to the App Configuration server failed with unexpected error');
      }
    }

    function isJSONDataEmpty(jsonData) {
      if (Object.keys(jsonData).length === 0) {
        return true;
      }
      return false;
    }

    async function fetchConfigurationsData() {
      if (_liveUpdate) {
        await fetchFromAPI();
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
     * @param {object} [options] - Options object
     * @param {string} [options.persistentCacheDirectory] - Absolute path to a directory which has
     * read & write permissions for file operations.
     * @param {string} [options.bootstrapFile] - Absolute path of configuration file. This parameter
     * when passed along with `liveConfigUpdateEnabled` value will drive the SDK to use the
     * configurations of this file to perform feature & property evaluations.
     * @param {boolean} [options.liveConfigUpdateEnabled] - live configurations update from the server.
     * Set this value to `false` if the new configuration values shouldn't be fetched from the server.
     */
    function setContext(collectionId, environmentId, options) {
      // when setContext is called more than one time with any of collectionId, environmentId or options
      // different from its previous time, cleanup method is invoked.
      // don't do the cleanup when setContext is called for the first time.
      if ((_collectionId && (_collectionId !== collectionId))
        || (_environmentId && (_environmentId !== environmentId))
        || (_persistentCacheDirectory && (_persistentCacheDirectory !== options.persistentCacheDirectory))
        || (_bootstrapFile && (_bootstrapFile !== options.bootstrapFile))
      ) {
        cleanup();
      }
      _collectionId = collectionId;
      _environmentId = environmentId;
      _persistentCacheDirectory = options.persistentCacheDirectory;
      _bootstrapFile = options.bootstrapFile;
      _liveUpdate = options.liveConfigUpdateEnabled;

      if (_persistentCacheDirectory) {
        persistentData = FileManager.getFileData(path.join(_persistentCacheDirectory, 'appconfiguration.json'));
        // no emitting the event here. Only updating cache is enough
        loadConfigurationsToCache(persistentData);
        try {
          fs.accessSync(_persistentCacheDirectory, fs.constants.W_OK);
        } catch (err) {
          logger.error(Constants.ERROR_NO_WRITE_PERMISSION);
          return;
        }
      }

      if (_bootstrapFile) {
        if (_persistentCacheDirectory) {
          if (isJSONDataEmpty(persistentData)) {
            try {
              const bootstrapFileData = FileManager.getFileData(_bootstrapFile);
              loadConfigurationsToCache(bootstrapFileData);
              emitter.emit(Constants.MEMORY_CACHE_ACTION_SUCCESS);
              writeToPersistentStorage(bootstrapFileData);
            } catch (error) {
              logger.error(error);
            }
          } else {
            // only emit the event here. Because, cache is already updated above (line 270)
            emitter.emit(Constants.MEMORY_CACHE_ACTION_SUCCESS);
          }
        } else {
          const bootstrapFileData = FileManager.getFileData(_bootstrapFile);
          loadConfigurationsToCache(bootstrapFileData);
          emitter.emit(Constants.MEMORY_CACHE_ACTION_SUCCESS);
        }
      }

      if (_liveUpdate) {
        checkInternet().then((val) => {
          if (!val) {
            logger.warning(Constants.NO_INTERNET_CONNECTION_ERROR);
            _isConnected = false;
          }
        });
        interval = setInterval(() => {
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

      fetchConfigurationsData();
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

    function evaluateRules(_rulesMap, entityAttributes, feature, property, entityId) {
      const resultDict = {
        evaluated_segment_id: Constants.DEFAULT_SEGMENT_ID,
        value: null,
        isEnabled: false, // applicable to feature flag only
        details: {}
      };

      try {
        // for each rules in the targeting
        for (let index = 1; index <= Object.keys(_rulesMap).length; index += 1) {
          const segmentRule = _rulesMap[index];

          if (segmentRule.rules.length > 0) {
            for (let level = 0; level < segmentRule.rules.length; level += 1) {
              const rule = segmentRule.rules[level];

              const { segments } = rule;
              if (segments.length > 0) {
                // for each segment in a rule
                for (let innerLevel = 0; innerLevel < segments.length; innerLevel += 1) {
                  const segmentKey = segments[innerLevel];

                  // check whether the entityAttributes satisfies all the rules of that segment
                  if (evaluateSegment(segmentKey, entityAttributes)) {
                    const segmentName = _segmentMap[segmentKey].name;
                    resultDict.evaluated_segment_id = segmentKey;
                    resultDict.details.segmentName = segmentName
                    if (feature !== null) {
                      // evaluateRules was called for feature flag
                      const segmentLevelRolloutPercentage = segmentRule.rollout_percentage === Constants.DEFAULT_ROLLOUT_PERCENTAGE ? feature.rollout_percentage : segmentRule.rollout_percentage;
                      // check whether the entityId is eligible for segment rollout
                      if (segmentLevelRolloutPercentage === 100 || (getNormalizedValue(''.concat(entityId, ':', feature.feature_id)) < segmentLevelRolloutPercentage)) {
                        // since the entityId is eligible for segment rollout the return value should be either of inherited or overridden value
                        if (segmentRule.value === Constants.DEFAULT_FEATURE_VALUE) {
                          resultDict.value = feature.enabled_value; // return the inherited value
                        } else {
                          resultDict.value = segmentRule.value; // return the overridden value
                        }
                        resultDict.details.valueType = `SEGMENT_VALUE`;
                        resultDict.details.reason = reasonSegmentValueFeatureFlag(segmentName, entityId, segmentRule.rollout_percentage);
                        resultDict.isEnabled = true;
                        resultDict.details.rolloutPercentageApplied = true;
                      } else {
                        resultDict.value = feature.disabled_value;
                        resultDict.isEnabled = false;
                        resultDict.details.valueType = `DISABLED_VALUE`;
                        resultDict.details.rolloutPercentageApplied = false;
                        resultDict.details.reason = reasonDisabledValueFeatureFlag_1(segmentName, entityId, segmentRule.rollout_percentage);
                      }
                    } else {
                      // evaluateRules was called for property
                      // eslint-disable-next-line no-lonely-if
                      if (segmentRule.value === Constants.DEFAULT_PROPERTY_VALUE) {
                        resultDict.value = property.value;
                      } else {
                        resultDict.value = segmentRule.value;
                      }
                      resultDict.details.valueType = `SEGMENT_VALUE`;
                      resultDict.details.reason = reasonSegmentValueProperty(segmentName);
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
        resultDict.value = null;
        resultDict.isEnabled = false;
        resultDict.details.valueType = `ERROR`;
        resultDict.details.errorType = error.message;
        resultDict.details.reason = reasonErrorInEvaluation();
        return resultDict;
      }

      // since entityAttributes did not satisfy any of the targeting rules
      if (feature !== null) {
        // evaluateRules was called for feature flag
        // check whether the entityId is eligible for default rollout
        if (feature.rollout_percentage === 100 || (getNormalizedValue(''.concat(entityId, ':', feature.feature_id)) < feature.rollout_percentage)) {
          resultDict.value = feature.enabled_value;
          resultDict.isEnabled = true;
          resultDict.details.valueType = `ENABLED_VALUE`;
          resultDict.details.rolloutPercentageApplied = true;
          resultDict.details.reason = reasonEnabledValueFeatureFlag_1(entityId, feature.rollout_percentage);
        } else {
          resultDict.value = feature.disabled_value;
          resultDict.isEnabled = false;
          resultDict.details.valueType = `DISABLED_VALUE`;
          resultDict.details.rolloutPercentageApplied = false;
          resultDict.details.reason = reasonDisabledValueFeatureFlag_2(entityId, feature.rollout_percentage);

        }
      } else {
        // evaluateRules was called for property
        resultDict.value = property.value;
        resultDict.details.valueType = `DEFAULT_VALUE`;
        resultDict.details.reason = reasonDefaultValueProperty_1();
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
        isEnabled: false,
        details: {}
      };
      try {
        // evaluate the feature flag only if the toggle state is enabled
        if (feature.enabled) {

          // check whether the feature flag is configured with any targeting definition and then check whether the user has passed an valid entityAttributes JSON before we evaluate
          if (feature.segment_rules && feature.segment_rules.length > 0 && entityAttributes && Object.keys(entityAttributes).length > 0) {
            const _rulesMap = _parseRules(feature.segment_rules);
            resultDict = evaluateRules(_rulesMap, entityAttributes, feature, null, entityId);
            return { value: resultDict.value, isEnabled: resultDict.isEnabled, details: resultDict.details };
          }

          // since the feature flag is not configured with any targeting, use the entityId and check whether the entityId is eligible for the default rollout
          if (feature.rollout_percentage === 100 || (getNormalizedValue(''.concat(entityId, ':', feature.feature_id)) < feature.rollout_percentage)) {
            resultDict.details.valueType = `ENABLED_VALUE`;
            resultDict.details.rolloutPercentageApplied = true;
            resultDict.details.reason = reasonEnabledValueFeatureFlag_2();
            return { value: feature.enabled_value, isEnabled: true, details: resultDict.details };
          }

          resultDict.details.valueType = `DISABLED_VALUE`;
          resultDict.details.rolloutPercentageApplied = false;
          resultDict.details.reason = reasonDisabledValueFeatureFlag_3(entityId, feature.rollout_percentage);
          return { value: feature.disabled_value, isEnabled: false, details: resultDict.details };
        }

        resultDict.details.valueType = `DISABLED_VALUE`;
        resultDict.details.reason = reasonDisabledValueFeatureFlag_4();
        return { value: feature.disabled_value, isEnabled: false, details: resultDict.details };
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
        details: {}
      };
      try {
        // check whether the property is configured with any targeting definition and then check whether the user has passed an valid entityAttributes JSON before we evaluate
        if (property.segment_rules && property.segment_rules.length > 0 && entityAttributes && Object.keys(entityAttributes).length > 0) {
          const _rulesMap = _parseRules(property.segment_rules);
          resultDict = evaluateRules(_rulesMap, entityAttributes, null, property);
          return { value: resultDict.value, details: resultDict.details };
        }
        resultDict.details.valueType = `DEFAULT_VALUE`;
        resultDict.details.reason = reasonDefaultValueProperty_2();
        return { value: property.value, details: resultDict.details };
      } finally {
        recordEvaluation(null, property.property_id, entityId, resultDict.evaluated_segment_id);
      }
    }

    // Other event listeners
    emitter.on(Constants.MEMORY_CACHE_ACTION_SUCCESS, () => {
      emitter.emit(Constants.APPCONFIGURATION_CLIENT_EMITTER);
    });

    // Socket Listeners
    emitter.on(Constants.SOCKET_CONNECTION_ERROR, (error) => {
      logger.warning(`Connecting to app configuration server failed. ${error}`);
      logger.warning(Constants.CREATE_NEW_CONNECTION);
      _onSocketRetry = true;
      connectWebSocket();
    });

    emitter.on(Constants.SOCKET_LOST_ERROR, (error) => {
      logger.warning(`Connecting to app configuration server lost. ${error}`);
      logger.warning(Constants.CREATE_NEW_CONNECTION);
      _onSocketRetry = true;
      connectWebSocket();
    });

    emitter.on(Constants.SOCKET_CONNECTION_CLOSE, () => {
      logger.warning('server connection closed. Creating a new connection to the server.');
      logger.warning(Constants.CREATE_NEW_CONNECTION);
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
      _onSocketRetry = false;
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
      recordEvaluation,
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
