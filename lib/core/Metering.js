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


const {
    Logger
} = require('./Logger')
const {
    UrlBuilder
} = require('./UrlBuilder')
const {
    ApiManager
} = require('./ApiManager')
const {
    Constants
} = require('../configurations/internal/Constants')

/**
 * Metering
 * @module Metering
 */
const Metering = () => {

    let instance = null
    const urlBuilder = UrlBuilder.getInstance()
    const logger = Logger.getInstance()

    var interval;

    /**
     * Create the Metering instance
     * @method module:Metering#createInstance
     */
    function createInstance() {

        let meteringFeatureData = {}
        let meteringPropertyData = {}
        let writingThread = 0

        /**
         * Store Metering data
         * @method module:Metering#createInstance#addMetering
         * @param {String} guid 
         * @param {String} collectionId 
         * @param {String} entityId 
         * @param {String} segmentId
         * @param {String} featureId
         * @param {String} propertyId
         */
        async function addMetering(guid, environmentId, collectionId, entityId, segmentId, featureId, propertyId) {
            writingThread += 1
            let time = (new Date()).toISOString()
            let hasData = false;
            let FeatureJson = {
                count: 1,
                evaluation_time: time
            }

            let meteringData = featureId !== null ? meteringFeatureData : meteringPropertyData
            let modifyKey = featureId !== null ? featureId : propertyId

            await sleep(500);

            if (meteringData.hasOwnProperty(guid)) {
                if (meteringData[guid].hasOwnProperty(environmentId)) {
                    if (meteringData[guid][environmentId].hasOwnProperty(collectionId)) {
                        if (meteringData[guid][environmentId][collectionId].hasOwnProperty(modifyKey)) {
                            if (meteringData[guid][environmentId][collectionId][modifyKey].hasOwnProperty(entityId)) {
                                if (meteringData[guid][environmentId][collectionId][modifyKey][entityId].hasOwnProperty(segmentId)) {
                                    hasData = true;
                                    meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId].evaluation_time = time
                                    meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId].count += 1
                                }
                            } else {
                                meteringData[guid][environmentId][collectionId][modifyKey][entityId] = {}
                                meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = {}
                            }
                        } else {
                            meteringData[guid][environmentId][collectionId][modifyKey] = {}
                            meteringData[guid][environmentId][collectionId][modifyKey][entityId] = {}
                            meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = {}
                        }
                    } else {
                        meteringData[guid][environmentId][collectionId] = {}
                        meteringData[guid][environmentId][collectionId][modifyKey] = {}
                        meteringData[guid][environmentId][collectionId][modifyKey][entityId] = {}
                        meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = {}
                    }
                } else {
                    meteringData[guid][environmentId] = {}
                    meteringData[guid][environmentId][collectionId] = {}
                    meteringData[guid][environmentId][collectionId][modifyKey] = {}
                    meteringData[guid][environmentId][collectionId][modifyKey][entityId] = {}
                    meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = {}
                }
            } else {
                meteringData[guid] = {}
                meteringData[guid][environmentId] = {}
                meteringData[guid][environmentId][collectionId] = {}
                meteringData[guid][environmentId][collectionId][modifyKey] = {}
                meteringData[guid][environmentId][collectionId][modifyKey][entityId] = {}
                meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = {}
            }
            if (!hasData) {
                meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = FeatureJson
            }
            writingThread -= 1
            if (writingThread <= 0) {
                writingThread = 0
            }
        }


        function sleep(ms) {
            return new Promise((resolve) => {
                setTimeout(resolve, ms);
            });
        }

        function buildRequestBody(sendMeteringData, result, key) {
            Object.keys(sendMeteringData).forEach(guid => {
                if (!result.hasOwnProperty(guid)) {
                    result[guid] = []
                }
                Object.keys(sendMeteringData[guid]).forEach(environmentId => {
                    Object.keys(sendMeteringData[guid][environmentId]).forEach(collectionId => {
                        let collections = {
                            "collection_id": collectionId,
                            "environment_id": environmentId,
                            "usages": []
                        }
                        let features = sendMeteringData[guid][environmentId][collectionId];
                        Object.keys(features).forEach(featureId => {
                            Object.keys(features[featureId]).forEach(entityId => {
                                Object.keys(features[featureId][entityId]).forEach(segmentId => {
                                    let usages = {
                                        [key]: featureId,
                                        "entity_id": entityId,
                                        "segment_id": segmentId === Constants.DEFAULT_SEGMENT_ID ? null : segmentId,
                                        "evaluation_time": features[featureId][entityId][segmentId]["evaluation_time"],
                                        "count": features[featureId][entityId][segmentId]["count"]
                                    }
                                    collections["usages"].push(usages)
                                })
                            })
                        })
                        result[guid].push(collections)
                    })
                })
            })
        }

        function sendToServer(guid, data) {
            const urlForMetering = urlBuilder.getMeteringurl(guid)
            try {
                ApiManager.makePostApiCall(urlForMetering, data).then(function (response) {
                    if (response && response.status >= 200 && response.status < 300) {
                        logger.log(`#:`, `Succesfully posted metering data`)
                    } else {
                        logger.warning(`#: WARNING`, `error while posting metering data`, response)
                    }
                }).catch(function (error) {
                    logger.warning(`#: WARNING`, `error while posting metering data`, error)
                })
            } catch (error) {
                logger.warning(`#: WARNING`, error.message)
            }
        }

        function sendSplitMetering(guid, data, count) {

            let lim = 0;

            let subUsagesArray = data.usages;

            while (lim <= count) {
                let endIndex = lim + Constants.DEFAULT_USAGE_LIMIT >= count ? count : lim + Constants.DEFAULT_USAGE_LIMIT;
                let collectionsMap = {
                    "collection_id": data.collection_id,
                    "environment_id": data.environment_id,
                    "usages": []
                }
                for (let i = lim; i < endIndex; i++) {
                    collectionsMap.usages.push(subUsagesArray[i])
                }
                sendToServer(guid, collectionsMap)
                lim = lim + Constants.DEFAULT_USAGE_LIMIT;
            }
        }

        function sendMetering() {

            if (writingThread !== 0) {
                return
            }

            let sendFeatureData = meteringFeatureData;
            let sendPropertyData = meteringPropertyData;
            meteringFeatureData = {}
            meteringPropertyData = {}

            if ((Object.keys(sendFeatureData).length) <= 0 && (Object.keys(sendPropertyData).length <= 0)) {
                return
            }

            let result = {}

            if (Object.keys(sendFeatureData).length > 0) {
                buildRequestBody(sendFeatureData, result, "feature_id")
            }

            if (Object.keys(sendPropertyData).length > 0) {
                buildRequestBody(sendPropertyData, result, "property_id")
            }

            Object.keys(result).forEach(guid => {
                result[guid].forEach(data => {
                    let count = data.usages.length;
                    if (count > Constants.DEFAULT_USAGE_LIMIT) {
                        sendSplitMetering(guid, data, count)
                    } else {
                        sendToServer(guid, data)
                    }
                })
            })
        }

        if (interval) {
            clearInterval(interval);
        }

        interval = setInterval(() => {
            sendMetering()
        }, 600000)

        return {
            addMetering
        }
    }

    return {
        getInstance: () => {
            if (!instance) {
                instance = createInstance()
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

const handler = Metering()
module.exports = {
    Metering: handler
}