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
const { EvaluationEvents } = require('../core/EvaluationEvents');
const { MetricEvents } = require('../core/MetricEvents');
const { getBaseServiceClient, getHeaders, setAuthenticator } = require('../core/ApiManager');
const { Feature } = require('./models/Feature');
const { Property } = require('./models/Property');
const { Segment } = require('./models/Segment');
const { SegmentRules } = require('./models/SegmentRules');
const { SecretProperty } = require("./models/SecretProperty");
const { FileManager } = require('./internal/FileManager');
const { reportError, getNormalizedValue, extractConfigurations, formatConfig} = require('./internal/Utils');
const { connectWebSocket } = require('./internal/Socket');
const { isConnected } = require('./internal/Socket');
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
  reasonExperimentVariation_y,
  reasonExperimentVariation_n,
  reasonErrorInEvaluation,
} = require('./internal/Messages');

const ConfigurationHandler = () => {
  let instance = null;
  let _collectionId;
  let _environmentId;
  let _guid;
  let _isConnected = true;
  let retryScheduled;
  const retryTime = 2;
  let interval;
  let _liveUpdate = true;
  let _bootstrapFile;
  let _persistentCacheDirectory;
  let _onSocketRetry = false;

  let _featureMap = {};
  let _propertyMap = {};
  let _segmentMap = {};
  let _secretMap = {};
  let allFeatureFlags = [];

  const meteObj = Metering.getInstance();
  const evaluationEvents = EvaluationEvents.getInstance();
  const metricEvents = MetricEvents.getInstance();
  const logger = Logger.getInstance();
  const urlBuilder = UrlBuilder.getInstance();
  const emitter = events.getInstance();

  /**
   * Constructs an instance of ConfigurationHandler
   * @method module:ConfigurationHandler#createInstance
   */
  function createInstance() {

    function init(region, guid, apikey, usePrivateEndpoint) {
      _guid = guid;
      urlBuilder.setRegion(region);
      urlBuilder.setGuid(guid);
      urlBuilder.setApikey(apikey);
      urlBuilder.usePrivateEndpoint(usePrivateEndpoint);
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
     * @param {{features: *[], properties: *[], segments: *[]}} data - The configurations data
     */
    function loadConfigurationsToCache(data) {
      if (data) {
        if (data.features) {
          const { features } = data;
          allFeatureFlags = features;
          _featureMap = {};
          features.forEach((feature) => {
            _featureMap[feature.feature_id] = new Feature(feature);
          });
        }
        if (data.properties) {
          const { properties } = data;
          _propertyMap = {};
          properties.forEach((property) => {
            _propertyMap[property.property_id] = new Property(property);
          });
        }
        if (data.segments) {
          const { segments } = data;
          _segmentMap = {};
          segments.forEach((segment) => {
            _segmentMap[segment.segment_id] = new Segment(segment);
          });
        }
      }
    }

    /**
     * Asynchronously writes the given data on to the persistent volume.
     *
     * @async
     * @param {JSON|string} fileData - The data to be written
     * @throws {Error} If fails to write due to insufficient permissions or other reasons.
     */
    function writeToPersistentStorage(fileData) {
      const json = JSON.stringify(fileData);
      FileManager.storeFiles(json, (path.join(_persistentCacheDirectory, 'appconfiguration.json')), () => { });
    }

    /**
     * @async
     * @method module:ConfigurationHandler#fetchFromAPI
     */
    async function fetchFromAPI() {
      const parameters = {
        options: {
          url: `/apprapp/feature/v1/instances/${_guid}/config`,
          method: 'GET',
          qs: {
            action: 'sdkConfig',
            collection_id: _collectionId,
            environment_id: _environmentId,
          },
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
      // For the cases [429, 499 & 5xx] we schedule a retry.

      let _response;

      try {
        _response = await getBaseServiceClient().createRequest(parameters);
      } catch (e) {
        const statusCode = e.status;
        const errMsg = "Failed to fetch the configurations.";
        if (statusCode >= 400 && statusCode < 499 && statusCode !== 429) {
          // Do Nothing! GET "/config" failed due to client-side error.
          logger.error(`${errMsg} ${e.message ? e.message : e}`);
          return;
        }
        logger.warning(`${errMsg} ${e.message ? e.message : e} Retrying in ${retryTime} minutes...`);
        clearTimeout(retryScheduled);
        retryScheduled = setTimeout(() => fetchFromAPI(), retryTime * 60000);
        return;
      }

      // a) load the configurations in the response to cache maps
      // b) asynchronously write the response to persistent volume, if enabled

      logger.log(`${Constants.SUCCESSFULLY_FETCHED_THE_CONFIGURATIONS}. Status code:${_response.status}`);
      const configurations = extractConfigurations(_response.result, _environmentId, _collectionId);
      loadConfigurationsToCache(configurations);
      emitter.emit(Constants.APPCONFIGURATION_CLIENT_EMITTER);
      if (_persistentCacheDirectory) {
        try {
          writeToPersistentStorage(_response.result);
        } catch (e) {
          logger.error(`Failed to write the configurations to persistent storage. Reason: ${e}`);
        }
      }
    }

    function beginWebsocketAndCheckInternet() {
      urlBuilder.setWebSocketUrl(_collectionId, _environmentId);
      setTimeout(() => {
        connectWebSocket();
      }, 2000);

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

    async function setContext(collectionId, environmentId, options) {
      _collectionId = collectionId;
      _environmentId = environmentId;
      _persistentCacheDirectory = options.persistentCacheDirectory;
      _bootstrapFile = options.bootstrapFile;
      _liveUpdate = options.liveConfigUpdateEnabled;

      evaluationEvents.init(_guid, _environmentId);
      metricEvents.init(_guid, _environmentId);

      let persistentCacheRead = false;
      let errorReadingBootstrapConfig = false;

      if (_persistentCacheDirectory) {
        logger.info(`persistent cache directory path is: ${_persistentCacheDirectory}`);
        const filePath = path.join(_persistentCacheDirectory, 'appconfiguration.json');
        const persistentCache = FileManager.readPersistentCacheConfigurations(filePath);
        if (Object.keys(persistentCache).length > 0) {
          const configurations = extractConfigurations(JSON.parse(persistentCache), _environmentId, _collectionId);
          loadConfigurationsToCache(configurations);
          persistentCacheRead = true;
        }
        try {
          fs.accessSync(_persistentCacheDirectory, fs.constants.W_OK);
        } catch (err) {
          reportError(`${Constants.ERROR_NO_WRITE_PERMISSION} ${err}`);
        }
      }

      if (_bootstrapFile) {
        if (_persistentCacheDirectory) {
          if (!persistentCacheRead) {
            try {
              const bootstrapConfig = FileManager.readBootstrapConfigurationsFromFile(_bootstrapFile);
              const configurations = extractConfigurations(JSON.parse(bootstrapConfig), _environmentId, _collectionId);
              loadConfigurationsToCache(configurations);
              writeToPersistentStorage(formatConfig(configurations, _environmentId, _collectionId));
              if (!_liveUpdate) emitter.emit(Constants.APPCONFIGURATION_CLIENT_EMITTER);
            } catch (e) {
              reportError(e);
            }
          } else if (!_liveUpdate) emitter.emit(Constants.APPCONFIGURATION_CLIENT_EMITTER);
        } else {
          logger.info(`reading configurations from bootstrap file: ${_bootstrapFile}`);
          try {
            const bootstrapConfig = FileManager.readBootstrapConfigurationsFromFile(_bootstrapFile);
            const configurations = extractConfigurations(JSON.parse(bootstrapConfig), _environmentId, _collectionId);
            loadConfigurationsToCache(configurations);
            if (!_liveUpdate) emitter.emit(Constants.APPCONFIGURATION_CLIENT_EMITTER);
          } catch (e) {
            if (!_liveUpdate) reportError(e);
            logger.error(`${e.message}`);
            errorReadingBootstrapConfig = true;
          }
        }
      }

      if (_liveUpdate) {
        const parameters = {
          options: {
            url: `/apprapp/feature/v1/instances/${_guid}/config`,
            method: 'GET',
            qs: {
              action: 'sdkConfig',
              collection_id: _collectionId,
              environment_id: _environmentId,
            },
          },
          defaultOptions: {
            serviceUrl: urlBuilder.getBaseServiceUrl(),
            headers: getHeaders(),
          },
        };

        let _response;
        try {
          _response = await getBaseServiceClient().createRequest(parameters);
        } catch (e) {
          const statusCode = e.status;
          const errMsg = `Status code: ${statusCode}. Message: Failed to fetch the configurations from remote server. Reason: ${e}`;

          if (statusCode >= 400 && statusCode < 499 && statusCode !== 429) {
            reportError(errMsg);
          }
          if (_persistentCacheDirectory !== null && persistentCacheRead) {
            const message = `Loaded the configurations from the persistent storage: ${path.join(_persistentCacheDirectory, 'appconfiguration.json')} into the application.`
            logger.info(`${errMsg}. ${message}`);
            emitter.emit(Constants.APPCONFIGURATION_CLIENT_EMITTER, message);
            beginWebsocketAndCheckInternet();
            return;
          }
          if (_bootstrapFile !== null && !errorReadingBootstrapConfig) {
            const message = `Loaded the configurations from the bootstrap file: ${_bootstrapFile} into the application.`;
            logger.info(`${errMsg}. ${message}`);
            emitter.emit(Constants.APPCONFIGURATION_CLIENT_EMITTER, message);
            beginWebsocketAndCheckInternet();
            return;
          }
          reportError(errMsg);
        }

        logger.log(`${Constants.SUCCESSFULLY_FETCHED_THE_CONFIGURATIONS}. Status code:${_response.status}`);
        const configurations = extractConfigurations(_response.result, _environmentId, _collectionId);
        loadConfigurationsToCache(configurations);
        emitter.emit(Constants.APPCONFIGURATION_CLIENT_EMITTER);
        if (_persistentCacheDirectory) {
          // asynchronously write the response to persistent volume, if enabled
          try {
            writeToPersistentStorage(_response.result);
          } catch (e) {
            logger.error(`fetched configurations could not be written to persistent storage. Reason: ${e}`);
            // not throwing any error as SDK now has all the configurations needed for feature flag & property evaluation.
            // Errors such as persistent cache path not found or write permission denied would have already thrown error before execution is reached here.
          }
        }

        beginWebsocketAndCheckInternet();
      }
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

    function track(eventKey, entityId) {
      if (eventKey && eventKey.length > 0 && entityId && entityId.length > 0) {
        for (let i = 0; i < allFeatureFlags.length; i += 1) {
          const f = allFeatureFlags[i];
          if (f.experiment && f.experiment.experiment_status === 'RUNNING') {
            metricEvents.addEvents({ experiment_id: f.experiment.experiment_id, iteration_id: f.experiment.iteration.iteration_id, feature_id: f.feature_id, entity_id: entityId, event_key: eventKey, })
            break;
          }
        }
        return;
      }
      logger.error(`eventKey or entityId cannot be empty.`);
    }

    /**
     * Get the Secret with the given Property Id
     *
     * @method module:ConfigurationHandler#getSecret
     * @param {string} propertyId - The property Id
     * @param {string} secretsManagerService - The secret manager client object
     * @returns {object|null} SecretProperty object.
     */
    function getSecret(propertyId, secretsManagerService) {
      const propertyObj = getProperty(propertyId);
      if (propertyObj !== null) {
        if (propertyObj.getPropertyDataType() === Constants.SECRETREF) {
          _secretMap[propertyId] = secretsManagerService;
          return new SecretProperty(propertyId);
        }
        logger.error(`Invalid operation: getSecret() cannot be called on a ${propertyObj.getPropertyDataType()} property.`);
        return null;
      }
      return null;
    }

    function getSecretsMap() {
      return _secretMap;
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
        details: {},
        variation_id: '',
        audience_group: '',
      };
      try {
        // evaluate the feature flag only if the toggle state is enabled
        if (feature.enabled) {
          if (feature.experiment && feature.experiment.experiment_status === 'RUNNING') {
            // experiment is running
            const trafficDistribution = feature.experiment.traffic_distribution;
            const { iteration } = feature.experiment;
            const { variations } = feature.experiment;
            if (trafficDistribution.type === 'ALL') {
              const allVariations = [];
              for (const expV of trafficDistribution.experimental_group) {
                allVariations.push({ variation_id: expV.variation_id, rollout_percentage: expV.rollout_percentage, audience_group: 'experiment' });
              }
              allVariations.push({ variation_id: trafficDistribution.control_group.variation_id, rollout_percentage: trafficDistribution.control_group.rollout_percentage, audience_group: 'control' });
              let variationId = '';
              let totalPercentage = 0;
              let audienceGroup = '';
              const hashValue = getNormalizedValue(''.concat(entityId, ':', feature.feature_id, ':', iteration.iteration_key));
              for (const v of allVariations) {
                audienceGroup = v.audience_group;
                variationId = v.variation_id;
                totalPercentage += v.rollout_percentage;
                if (hashValue < totalPercentage) {
                  break;
                }
              }
              for (const v of variations) {
                if (variationId === v.variation_id) {
                  resultDict.audience_group = audienceGroup;
                  resultDict.variation_id = v.variation_id;
                  resultDict.details.valueType = `VARIATION`;
                  resultDict.details.reason = reasonExperimentVariation_y(entityId, audienceGroup, v.variation_id);
                  // isEnabled will be true because the entity is part experiment audience
                  return { value: v.variation_value, isEnabled: true, details: resultDict.details };
                }
              }
              logger.error('no variation was found to serve');
              return { value: null, isEnabled: false, details: null };
            }
            if (trafficDistribution.type === 'NO_RULE') {
              if (feature.segment_rules && feature.segment_rules.length > 0 && entityAttributes && Object.keys(entityAttributes).length > 0) {
                const _rulesMap = _parseRules(feature.segment_rules);
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
                          // check whether the entityAttributes satifies all the rules of that segment
                          if (evaluateSegment(segmentKey, entityAttributes)) {
                            resultDict.evaluated_segment_id = segmentKey;
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
                            } else {
                              resultDict.value = feature.disabled_value;
                              resultDict.details.valueType = `DISABLED_VALUE`;
                            }
                            resultDict.details.reason = reasonExperimentVariation_n(entityId);
                            // isEnabled will be false because the entity is not part experiment audience type
                            return { value: resultDict.value, isEnabled: false, details: resultDict.details };
                          }
                        }
                      }
                    }
                  }
                }
              }
              // case 1: user doesn't belong to any of the rules
              // case 2: feature flag is not targeted with rules
              // case 3: feature flag is targeted with rules, but entityAttributes are not passed
              const allVariations = [];
              for (const expV of trafficDistribution.experimental_group) {
                allVariations.push({ variation_id: expV.variation_id, rollout_percentage: expV.rollout_percentage, audience_group: 'experiment' });
              }
              allVariations.push({ variation_id: trafficDistribution.control_group.variation_id, rollout_percentage: trafficDistribution.control_group.rollout_percentage, audience_group: 'control' });
              let variationId = '';
              let totalPercentage = 0;
              let audienceGroup = '';
              const hashValue = getNormalizedValue(''.concat(entityId, ':', feature.feature_id, ':', iteration.iteration_key));
              for (const v of allVariations) {
                audienceGroup = v.audience_group;
                variationId = v.variation_id;
                totalPercentage += v.rollout_percentage;
                if (hashValue < totalPercentage) {
                  break;
                }
              }
              for (const v of variations) {
                if (variationId === v.variation_id) {
                  resultDict.audience_group = audienceGroup;
                  resultDict.variation_id = v.variation_id;
                  resultDict.details.valueType = `VARIATION`;
                  resultDict.details.reason = reasonExperimentVariation_y(entityId, audienceGroup, v.variation_id);
                  // isEnabled will be true because the entity is part experiment audience
                  return { value: v.variation_value, isEnabled: true, details: resultDict.details };
                }
              }
              logger.error('no variation was found to serve');
              return { value: null, isEnabled: false, details: null };
            }
            if (trafficDistribution.type === 'RULE') {
              if (feature.segment_rules && feature.segment_rules.length > 0 && entityAttributes && Object.keys(entityAttributes).length > 0) {
                const _rulesMap = _parseRules(feature.segment_rules);
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
                          // check whether the entityAttributes satifies all the rules of that segment
                          if (evaluateSegment(segmentKey, entityAttributes)) {
                            resultDict.evaluated_segment_id = segmentKey;
                            const expRuleId = parseInt(trafficDistribution.rule_id)
                            if (expRuleId === segmentRule.order) {
                              const allVariations = [];
                              for (const expV of trafficDistribution.experimental_group) {
                                allVariations.push({ variation_id: expV.variation_id, rollout_percentage: expV.rollout_percentage, audience_group: 'experiment' });
                              }
                              allVariations.push({ variation_id: trafficDistribution.control_group.variation_id, rollout_percentage: trafficDistribution.control_group.rollout_percentage, audience_group: 'control' });
                              let variationId = '';
                              let totalPercentage = 0;
                              let audienceGroup = '';
                              const hashValue = getNormalizedValue(''.concat(entityId, ':', feature.feature_id, ':', iteration.iteration_key));
                              for (const v of allVariations) {
                                audienceGroup = v.audience_group;
                                variationId = v.variation_id;
                                totalPercentage += v.rollout_percentage;
                                if (hashValue < totalPercentage) {
                                  break;
                                }
                              }
                              for (const v of variations) {
                                if (variationId === v.variation_id) {
                                  resultDict.audience_group = audienceGroup;
                                  resultDict.variation_id = v.variation_id;
                                  resultDict.details.valueType = `VARIATION`;
                                  resultDict.details.reason = reasonExperimentVariation_y(entityId, audienceGroup, v.variation_id);
                                  // isEnabled will be true because the entity is part experiment audience
                                  return { value: v.variation_value, isEnabled: true, details: resultDict.details };
                                }
                              }
                              logger.error('no variation was found to serve');
                              return { value: null, isEnabled: false, details: null };
                            }
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
                            } else {
                              resultDict.value = feature.disabled_value;
                              resultDict.details.valueType = `DISABLED_VALUE`;
                            }
                            resultDict.details.reason = reasonExperimentVariation_n(entityId);
                            // isEnabled will be false because the entity is not part experiment audience type
                            return { value: resultDict.value, isEnabled: false, details: resultDict.details };
                          }
                        }
                      }
                    }
                  }
                }
              }
              // case 1: user doesn't belong to any of the rules
              // case 2: feature flag is targeted with rules, but entityAttributes are not passed
              // use the entityId and check whether the entityId is eligible for the default rollout
              if (feature.rollout_percentage === 100 || (getNormalizedValue(''.concat(entityId, ':', feature.feature_id)) < feature.rollout_percentage)) {
                resultDict.value = feature.enabled_value;
                resultDict.details.valueType = `ENABLED_VALUE`;
              } else {
                resultDict.value = feature.disabled_value;
                resultDict.details.valueType = `DISABLED_VALUE`;
              }
              resultDict.details.reason = reasonExperimentVariation_n(entityId);
              // isEnabled will be false because the entity is not part experiment audience type
              return { value: resultDict.value, isEnabled: false, details: resultDict.details };
            }
            logger.error('invalid type in traffic distribution', trafficDistribution.type);
            return { value: null, isEnabled: false, details: null };
          }
          // experiment is not running
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
        if (feature.experiment && feature.experiment.experiment_status === 'RUNNING' && resultDict.variation_id.length > 0) {
          evaluationEvents.addEvents({ experiment_id: feature.experiment.experiment_id, iteration_id: feature.experiment.iteration.iteration_id, feature_id: feature.feature_id, variation_id: resultDict.variation_id, entity_id: entityId, audience_group: resultDict.audience_group, })
        } else {
          recordEvaluation(feature.feature_id, null, entityId, resultDict.evaluated_segment_id);
        }
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

    // Socket Listeners
    emitter.on(Constants.SOCKET_CONNECTION_ERROR, () => {
      _onSocketRetry = true;
      connectWebSocket();
    });

    emitter.on(Constants.SOCKET_LOST_ERROR, () => {
      _onSocketRetry = true;
      connectWebSocket();
    });

    emitter.on(Constants.SOCKET_CONNECTION_CLOSE, () => {
      _onSocketRetry = true;
      connectWebSocket();
    });

    emitter.on(Constants.SOCKET_MESSAGE_RECEIVED, (data) => {
      logger.log(`Received message from server. ${data}`);
    });

    emitter.on(Constants.SOCKET_CALLBACK, () => {
      socketActions();
    });

    emitter.on(Constants.SOCKET_MESSAGE_ERROR, (messageType) => {
      logger.error(`Invalid message received from websocket connection. Message type: ${messageType}`);
    });

    emitter.on(Constants.SOCKET_CONNECTION_SUCCESS, () => {
      logger.log('Successfully established websocket connection with App Configuration server.');
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
      getSecret,
      getSecretsMap,
      track,
      featureEvaluation,
      propertyEvaluation,
      cleanup,
      recordEvaluation,
      loadConfigurationsToCache,
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
  isConnected,
  configurationHandler: handler,
};
