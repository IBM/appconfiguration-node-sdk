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

const path = require('path');
let filePath = path.join(__dirname, 'internal', 'appconfiguration.json');

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
    var _collectionId = '';
    var _environmentId = '';
    var _region = '';
    var _guid = '';
    var _apikey = '';
    var _isConnected = true;
    var retryCount = 3;
    var retryTime = 10;
    var interval;
    var intervalShort;
    var _liveUpdate = true;
    let _configurationFile = null;
    var _onSocketRetry = false;

    let _featureMap = {}
    let _propertyMap = {}
    let _segmentMap = {}

    let meteObj = Metering.getInstance();
    const logger = Logger.getInstance();
    const urlBuilder = UrlBuilder.getInstance();
    const emitter = events.getInstance();

    function createInstance() {

        function init(region, guid, apikey) {
            _region = region;
            _guid = guid;
            _apikey = apikey;
            urlBuilder.setRegion(region);
            urlBuilder.setGuid(guid);
            urlBuilder.setApikey(apikey);
        }

        function setContext(collectionId, environmentId, configurationFile, liveConfigUpdateEnabled) {

            if ((_collectionId !== collectionId) || (_environmentId !== environmentId) || (_configurationFile !== configurationFile) || (_liveUpdate !== liveConfigUpdateEnabled)) {
                cleanup()
            }
            _collectionId = collectionId;
            _environmentId = environmentId;
            _configurationFile = configurationFile;
            _liveUpdate = liveConfigUpdateEnabled;

            checkInternet().then(function (val) {
                if (!val) {
                    logger.warning(`#: WARNING`, Constants.NO_INTERNET_CONNECTION_ERROR);
                    _isConnected = false
                }
            })

            if (_liveUpdate) {
                intervalShort = setInterval(() => {
                    checkInternet().then(function (val) {
                        if (!val) {
                            logger.warning(`#: WARNING`, Constants.NO_INTERNET_CONNECTION_ERROR);
                            _isConnected = false
                        } else {
                            if (!_isConnected) {
                                _onSocketRetry = false
                                fetchFromAPI();
                                connectWebSocket();
                            }
                            _isConnected = true
                        }
                    })
                }, 30000) // 30 second
            }
            loadConfigurations();
            fetchConfigurationsData();

            emitter.on(Constants.CACHE_ACTION_SUCCESS, () => {
                loadConfigurations();
                emitter.emit(Constants.APPCONFIGURATION_CLIENT_EMITTER);
            })
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

        function storeFiles() {
            const result = FileManager.getFileData(_configurationFile);
            if (Object.keys(result).length > 0) {
                const json = JSON.stringify(result);
                FileManager.storeFiles(json, filePath, function () {
                    logger.log(`#: Stored file `, " Stored to cache");
                    emitter.emit(Constants.CACHE_ACTION_SUCCESS);
                });
            }
        }

        async function fetchFromAPI() {
            try {
                const urlForAllConfigurations = urlBuilder.getConfigUrl(_collectionId, _environmentId);
                const pushData = await ApiManager.makeGetApiCall(urlForAllConfigurations);
                // if condition is for not to overwrite the local configuration file when it is set to false before the async call is executed
                if (_liveUpdate) {
                    writeTofile(pushData);
                }
            } catch (error) {
                logger.warning(`#: WARNING`, error.message);
            }
        }

        async function connectWebSocket() {
            try {
                const urlForWebsocket = urlBuilder.getWebSocketUrl(_collectionId, _environmentId);
                const headers = urlBuilder.getHeaders();
                closeWebSocket();       //close existing websocket connection if any
                socketClient.connect(
                    urlForWebsocket, [], [], headers
                );
            } catch (error) {
                logger.warning(`#: WARNING `, error.message);
                logger.warning(`#: WARNING`, `Connection to the App Configuration server failed with unexpected error.`);
            }
        }

        async function writeTofile(fileData) {
            if (fileData == null) {
                logger.log(`#:`, 'No data');
                return;
            }
            const json = JSON.stringify(fileData)
            FileManager.storeFiles(json, filePath, function () {
                emitter.emit(Constants.CACHE_ACTION_SUCCESS);
            });
        }

        async function socketActions(data) {
            fetchFromAPI();
        }

        function getFeatures() {
            return _featureMap;
        }

        function getFeature(featureId) {
            /* 
                check if we already fetched that from cache and have in out featureMap
                ELSE
                that means we haven't fetched it, so get it from cache
                store fetched result in feature map
            */

            if (_featureMap.hasOwnProperty(featureId)) {
                return _featureMap[featureId];
            } else {
                loadConfigurations();
                if (_featureMap.hasOwnProperty(featureId)) {
                    return _featureMap[featureId];
                } else {
                    logger.error(`#: ERROR`, `Invalid feature id - ${featureId}`);
                    return null;
                }
            }
        }

        function getProperties() {
            return _propertyMap;
        }

        function getProperty(propertyId) {
            if (_propertyMap.hasOwnProperty(propertyId)) {
                return _propertyMap[propertyId];
            } else {
                loadConfigurations();
                if (_propertyMap.hasOwnProperty(propertyId)) {
                    return _propertyMap[propertyId];
                } else {
                    logger.error(`#: ERROR`, `Invalid property id - ${propertyId}`);
                    return null;
                }
            }
        }

        function getSegment(segmentId) {
            if (_segmentMap.hasOwnProperty(segmentId)) {
                return _segmentMap[segmentId]
            } else {
                logger.error(`#: ERROR`, `Invalid segment id - ${segmentId}`);
                return null;
            }
        }

        function loadConfigurations() {
            const data = FileManager.getFileData(filePath);
            if (data) {
                if (data.features && Object.keys(data.features).length) {
                    const { features } = data
                    _featureMap = {};
                    features.forEach(feature => {
                        _featureMap[feature.feature_id] = new Feature(feature, feature.enabled)
                    });
                }
                if (data.properties && Object.keys(data.properties).length) {
                    const { properties } = data
                    _propertyMap = {};
                    properties.forEach(property => {
                        _propertyMap[property.property_id] = new Property(property)
                    })
                }
                if (data.segments && Object.keys(data.segments).length) {
                    const { segments } = data
                    _segmentMap = {}
                    segments.forEach(segment => {
                        _segmentMap[segment.segment_id] = new Segment(segment)
                    });
                }
            }
        }

        function evaluateSegment(segmentKey, identityAttributes) {

            if (_segmentMap.hasOwnProperty(segmentKey)) {

                let segmentObjc = _segmentMap[segmentKey]
                return segmentObjc.evaluateRule(identityAttributes)

            }
            return null;
        }

        function recordEvaluation(featureId, propertyId, identityId, segmentId) {
            meteObj.addMetering(_guid, _environmentId, _collectionId, identityId, segmentId, featureId, propertyId)
        }

        function featureEvaluation(feature, identityId, identityAttributes) {

            let resultDict = {
                'evaluated_segment_id': Constants.DEFAULT_SEGMENT_ID,
                'value': null
            }
            try {
                if (feature.enabled) {
                    if (!identityAttributes || Object.keys(identityAttributes).length <= 0) {
                        return feature.enabled_value;
                    }
                    if (feature.segment_rules && feature.segment_rules.length > 0) {
                        var _rulesMap = _parseRules(feature.segment_rules);
                        resultDict = evaluateRules(_rulesMap, identityAttributes, feature, null)
                        return resultDict.value;
                    } else {
                        return feature.enabled_value;
                    }
                } else {
                    return feature.disabled_value;
                }
            } finally {
                recordEvaluation(feature.feature_id, null, identityId, resultDict.evaluated_segment_id)
            }
        }

        function propertyEvaluation(property, identityId, identityAttributes) {

            let resultDict = {
                'evaluated_segment_id': Constants.DEFAULT_SEGMENT_ID,
                'value': null
            }
            try {
                if (!identityAttributes || Object.keys(identityAttributes).length <= 0) {
                    return property.value;
                }
                if (property.segment_rules && property.segment_rules.length > 0) {
                    var _rulesMap = _parseRules(property.segment_rules);
                    resultDict = evaluateRules(_rulesMap, identityAttributes, null, property)
                    return resultDict.value;
                } else {
                    return property.value;
                }
            } finally {
                recordEvaluation(null, property.property_id, identityId, resultDict.evaluated_segment_id)
            }
        }

        function evaluateRules(_rulesMap, identityAttributes, feature, property) {

            let resultDict = {
                'evaluated_segment_id': Constants.DEFAULT_SEGMENT_ID,
                'value': null
            }

            try {
                for (let index = 1; index <= Object.keys(_rulesMap).length; index++) {

                    const segmentRule = _rulesMap[index];

                    if (segmentRule.rules.length > 0) {

                        for (let level = 0; level < segmentRule.rules.length; level++) {
                            const rule = segmentRule.rules[level];

                            const segments = rule.segments
                            if (segments.length > 0) {

                                for (let innerLevel = 0; innerLevel < segments.length; innerLevel++) {
                                    const segmentKey = segments[innerLevel];

                                    if (evaluateSegment(segmentKey, identityAttributes)) {
                                        resultDict.evaluated_segment_id = segmentKey
                                        if (segmentRule.value == "$default") {
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
                logger.error(`#: ERROR `, `RuleEvaluation` + `${error}`)
            }

            if (feature !== null) {
                resultDict.value = feature.enabled_value;
            } else {
                resultDict.value = property.value;
            }
            return resultDict;
        }

        function _parseRules(segmentRules) {
            let rulesMap = {};
            segmentRules.forEach((rules, index) => {
                rulesMap[rules.order] = new SegmentRules(rules)
            });
            return rulesMap;
        }

        function startTimer() {
            if (interval) {
                clearInterval(interval);
            }
            interval = setInterval(() => {
                _onSocketRetry = false
                fetchFromAPI();
                connectWebSocket();
            }, retryTime * 60000)
        }

        function cleanup() {
            clearInterval(interval)
            clearInterval(intervalShort)
            FileManager.deleteFileData(filePath)
            _onSocketRetry = false
        }

        // Socket Listeners
        emitter.on(Constants.SOCKET_CONNECTION_ERROR, function (error) {
            _onSocketRetry = true
            if (retryCount > 0) {
                logger.warning(`#: WARNING`, `Retrying connection to the App Configuration server failed. ${error}`);
                retryCount -= 1;
                connectWebSocket();
            } else {
                logger.warning(`#: WARNING`, `Failed connecting to the App Configuration server. Retrying after ${retryTime} minutes.`);
                startTimer();
            }
        })

        emitter.on(Constants.SOCKET_LOST_ERROR, function (error) {
            logger.warning(`#: WARNING`, `Error while connecting to App Configuration server. ${error}. Starting timer to get data in every ${retryTime} minutes.`);
            startTimer();
        })

        emitter.on(Constants.SOCKET_CONNECTION_CLOSE, function (error) {
            logger.warning(`#: WARNING`, `server connection closed. Creating a new connection to the server.`);
            _onSocketRetry = true
            connectWebSocket();
        })

        emitter.on(Constants.SOCKET_MESSAGE_RECEIVED, function (data) {
            logger.log(`#:`, `Received message from server. ${data}`);
        })


        emitter.on(Constants.SOCKET_CALLBACK, function (data) {
            socketActions(data);
        })

        emitter.on(Constants.SOCKET_MESSAGE_ERROR, function (error) {
            logger.WARNING(`#: WARNING`, `Message received from server is invalid.`);
        })

        emitter.on(Constants.SOCKET_CONNECTION_SUCCESS, function (message) {
            logger.log(`#:`, `Successfully connected to App Configuration server`);
            if (_onSocketRetry == true) {
                socketActions(null);
            }
            if (interval) {
                clearInterval(interval);
            }
        })

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
            cleanup
        }
    }

    return {
        getInstance: () => {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        },
        currentInstance: () => {
            if (instance) {
                return instance
            } else {
                throw Error(` Initialize object first`)
            }
        }
    }
}

const handler = ConfigurationHandler();
module.exports = {
    configurationHandler: handler
}