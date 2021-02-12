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
let filePath = path.join(__dirname, './internal/appconfiguration-features.json');

const { UrlBuilder } = require('../core/UrlBuilder');
const { ApiManager } = require('../core/ApiManager');
const { Logger } = require('../core/Logger');
const { Metering } = require('../core/Metering');
const { Feature } = require('./models/Feature');
const { Segment } = require('./models/Segment');
const { SegmentRules } = require('./models/SegmentRules');
const { FileManager } = require('./internal/FileManager');
const { socketClient } = require('./internal/Socket');
const { events } = require('./internal/Events');
const { Constants } = require('./internal/Constants');
const { checkInternet } = require('./internal/Connectivity');

const FeatureHandler = () => {

    let instance = null
    var _isConnected = true;
    var retryCount = 3;
    var retryTime = 10;
    var interval;
    var intervalShort;
    var _liveUpdate = true;
    let featureFile = null;
    var _onSocketRetry = false;

    let meteObj = Metering.getInstance();
    const logger = Logger.getInstance();
    const urlBuilder = UrlBuilder.getInstance();

    let appconfigSocketEvents = [Constants.SOCKET_CONNECTION_ERROR, Constants.SOCKET_LOST_ERROR, Constants.SOCKET_CONNECTION_CLOSE,
    Constants.SOCKET_MESSAGE_RECEIVED, Constants.SOCKET_CALLBACK, Constants.SOCKET_MESSAGE_ERROR,
    Constants.SOCKET_CONNECTION_SUCCESS, Constants.CACHE_ACTION_SUCCESS]

    function createInstance({
        collectionId,
        region,
        guid,
        apikey,
    }) {

        const emitter = events.getInstance();

        let _featureMap = {}
        let _segmentMap = {}

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

        fetchFeaturesData();

        emitter.on(Constants.CACHE_ACTION_SUCCESS, () => {
            let _ = getFeatures();
            emitter.emit(Constants.APPCONFIGURATION_CLIENT_EMITTER);
        })

        async function fetchFeaturesData() {
            if (featureFile) {
                storeFiles();
            }
            if (_liveUpdate) {
                await fetchFromAPI();
                retryCount = 3;
                connectWebSocket();
            }
        }

        function storeFiles() {
            const result = FileManager.getFileData(featureFile);
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
                const urlForAllFeatures = urlBuilder.getConfigUrl(collectionId);
                const pushData = await ApiManager.makeGetApiCall(urlForAllFeatures);
                // if condition is for not to overwrite the local feature file when it is set to false before the async call is executed
                if (_liveUpdate) {
                    writeTofile(pushData);
                }
            } catch (error) {
                logger.warning(`#: WARNING`, error.message);
            }
        }

        async function connectWebSocket() {
            try {
                const urlForWebsocket = urlBuilder.getWebSocketUrl(collectionId);
                const headers = urlBuilder.getHeaders();
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

        function getFeatures(fPath = filePath) {
            const result = FileManager.getFileData(fPath);
            return _storeInFeatureMap(result);
        }

        function fetchFeaturesFromFileActions(localFeatureFilePath) {
            _liveUpdate = false
            featureFile = localFeatureFilePath
            clearInterval(interval);
            clearInterval(intervalShort);
            if (emitter.listenerCount(Constants.SOCKET_CONNECTION_SUCCESS_COPY) < 1) {
                emitter.on(Constants.SOCKET_CONNECTION_SUCCESS_COPY, function () {
                    emitter.emit(Constants.DELIBERATE_SOCKET_CLOSE);
                })
            }
            fetchFeaturesData();
        }

        async function socketActions(data) {
            fetchFromAPI();
        }

        function getFeature(featureId) {
            /* 
                check if we already fetched that from cache and have in out featureMap
                ELSE
                that means we haven't fetched it, so get it from cache
                store fetched result in feature map
            */

            if (_featureMap.hasOwnProperty(featureId)) {
                return _featureMap[featureId]
            } else {
                const result = getFeatures();
                if (result) {
                    return _getFeatureFromFeaturesMap(featureId);
                } else {
                    logger.error(`#: ERROR`, `Invalid feature id - ${featureId}`);
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

        function _storeInFeatureMap(featuresList) {
            if (
                featuresList &&
                featuresList.features &&
                Object.keys(featuresList.features).length
            ) {
                const {
                    features
                } = featuresList
                const {
                    segments
                } = featuresList

                _featureMap = {};
                features.forEach(feature => {
                    // let ret = parseApps(feature.apps)
                    _featureMap[feature.feature_id] = new Feature(feature, feature.isEnabled)
                });

                if (segments) {
                    _segmentMap = {}
                    segments.forEach(segment => {
                        _segmentMap[segment.segment_id] = new Segment(segment)
                    });
                }
                return _featureMap;
            }
            return _featureMap;
        }

        function _getFeatureFromFeaturesMap(featureId) {
            if (_featureMap.hasOwnProperty(featureId)) {
                return _featureMap[featureId]
            }
            logger.error(`#: ERROR`, `Invalid feature id - ${featureId}`)
            return null;
        }

        function evaluateSegment(segment, identityAttributes) {

            if (_segmentMap.hasOwnProperty(segment)) {

                let segmentObjc = _segmentMap[segment]
                return segmentObjc.evaluateRule(identityAttributes)

            }
            return null;
        }

        function _recordEvaluation(feature) {
            meteObj.addMetering(guid, collectionId, feature.feature_id)
        }

        function featureEvaluation(feature, identityAttributes) {
            _recordEvaluation(feature);
            if (!identityAttributes || Object.keys(identityAttributes).length <= 0) {
                logger.log(`#:`, Constants.NO_IDENTITY_ATTRIBUTES_PRESENT_LOG);
                return feature.enabled_value;
            }

            if (feature.segment_rules && feature.segment_rules.length > 0) {

                var _rulesMap = _parseRules(feature.segment_rules);

                for (let index = 1; index <= Object.keys(_rulesMap).length; index++) {

                    const segmentRule = _rulesMap[index];

                    if (segmentRule.rules.length > 0) {

                        for (let level = 0; level < segmentRule.rules.length; level++) {
                            const rule = segmentRule.rules[level];

                            const segments = rule.segments
                            if (segments.length > 0) {

                                for (let innerLevel = 0; innerLevel < segments.length; innerLevel++) {
                                    const segment = segments[innerLevel];

                                    let segmentvalid = evaluateSegment(segment, identityAttributes);
                                    if (segmentvalid !== null) {
                                        if (segmentvalid) {
                                            if (segmentRule.value == "$default") {
                                                return feature.enabled_value;
                                            } else {
                                                return segmentRule.value;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

            } else {
                logger.log(`#: `, 'segmentRules is empty');
            }
            return feature.enabled_value;
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

        function getConfig() {
            return {
                collectionId: collectionId,
                region: region,
                guid: guid,
                apikey: apikey
            }
        }

        function cleanup() {
            for (let i = 0; i < appconfigSocketEvents.length; i++) {
                emitter.removeAllListeners(appconfigSocketEvents[i]);
            }
            clearInterval(interval)
            clearInterval(intervalShort)
            FileManager.deleteFileData(filePath)
            _onSocketRetry = false
            instance = null
        }

        // Socket Listeners
        emitter.on(Constants.SOCKET_CONNECTION_ERROR, function (error) {
            _onSocketRetry = true
            if (retryCount > 0) {
                logger.warning(`#: WARNING`, `Retrying connection to the App Configuration server failed. ${error}`);
                retryCount -= 1;
                connectWebSocket();
            } else {
                logger.warning(`#: WARNING`, `Failed connecting to the App Configuration server. Retry after ${retryTime} minutes.`);
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
            getFeature,
            getFeatures,
            getSegment,
            featureEvaluation,
            fetchFeaturesFromFileActions,
            getConfig,
            cleanup
        }
    }

    return {
        getInstance: ({
            collectionId,
            region,
            guid,
            apikey
        } = {}) => {
            if (!instance) {
                instance = createInstance({
                    collectionId,
                    region,
                    guid,
                    apikey
                })
            }

            let config = instance.getConfig()
            if (config.collectionId !== collectionId || config.region !== region || config.guid !== guid || config.apikey !== apikey) {
                instance.cleanup()
                instance = createInstance({
                    collectionId,
                    region,
                    guid,
                    apikey
                })
            }
            return instance
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

const handler = FeatureHandler();
module.exports = {
    featureHandler: handler
}