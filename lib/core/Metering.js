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

        var meteringData = {}
        let writingThread = 0

        /**
         * Store Metering data
         * @method module:Metering#createInstance#addMetering
         * @param {String} guid 
         * @param {String} collectionId 
         * @param {String} feature 
         */
        async function addMetering(guid, collectionId, feature) {
            writingThread += 1
            let time = (new Date()).toISOString()
            var hasData = false;
            var FeatureJson = {
                count: 1,
                evaluation_time: time
            }
            await sleep(500);

            if (meteringData.hasOwnProperty(guid)) {
                if (meteringData[guid].hasOwnProperty(collectionId)) {
                    if (meteringData[guid][collectionId].hasOwnProperty(feature)) {
                        hasData = true;
                        meteringData[guid][collectionId][feature].evaluation_time = time
                        meteringData[guid][collectionId][feature].count += 1
                    }
                } else {
                    meteringData[guid][collectionId] = {}
                }
            } else {
                meteringData[guid] = {}
                meteringData[guid][collectionId] = {}
            }
            if (!hasData) {
                meteringData[guid][collectionId][feature] = FeatureJson
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

        /**
         * Send Metering data to the App Configuration service
         * @method module:Metering#createInstance#_sendMetering 
         */
        function _sendMetering() {

            if (writingThread === 0 && Object.keys(meteringData).length > 0) {
                let data = meteringData
                meteringData = {}
                var dataToSend = {}
                Object.keys(data).forEach(guid => {
                    let guiData = data[guid];
                    Object.keys(guiData).forEach(collectionId => {
                        dataToSend['collection_id'] = collectionId
                        let features = guiData[collectionId];
                        var array = []
                        Object.keys(features).forEach(feature => {
                            var featureObj = {
                                "feature_id": feature,
                                "evaluation_time": features[feature]["evaluation_time"],
                                "count": features[feature]["count"]
                            }
                            array.push(featureObj)
                        });
                        dataToSend["usages"] = array
                    });

                    const urlForMetering = urlBuilder.getMeteringurl(guid)
                    try {
                        ApiManager.makePostApiCall(urlForMetering, dataToSend).then(function (response) {
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
                });
            }
        }

        if (interval) {
            clearInterval(interval);
        }

        interval = setInterval(() => {
            _sendMetering()
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