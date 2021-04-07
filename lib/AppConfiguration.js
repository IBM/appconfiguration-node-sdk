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
} = require('./core/Logger');
const {
    UrlBuilder
} = require('./core/UrlBuilder');
const {
    events
} = require('./configurations/internal/Events');
const {
    Constants
} = require('./configurations/internal/Constants');
const {
    configurationHandler
} = require('./configurations/ConfigurationHandler');


/**
 * Client for App Configuration
 * @module AppConfiguration
 */
const AppConfiguration = () => {
    let instance = null;

    const logger = Logger.getInstance();
    const urlBuilder = UrlBuilder.getInstance();

    /**
     * Constructs an instance of AppConfiguration
     * @method module:AppConfiguration#createInstance
     */
    function createInstance() {

        let __region = ''
        let __guid = ''
        let __apikey = ''
        let __collectionId = ''
        let __configurationFile = null;
        let isInitialized = false;
        let isInitializedConfig = false;
        let configurationHandlerInstance = null;

        /**
         * Initialize the sdk to connect with your App Configuration service instance.
         * The method returns `null` if any of the params are missing or invalid.
         * 
         * @param {string} region - REGION name where the App Configuration service instance is created.
         * @param {string} guid - GUID of the App Configuration service.
         * @param {string} apikey - APIKEY of the App Configuration service.
         */
        function init(region, guid, apikey) {

            if (!region || !guid || !apikey) {
                if (!region) {
                    logger.error(`#: ERROR`, Constants.REGION_ERROR);
                } else if (!guid) {
                    logger.error(`#: ERROR`, Constants.GUID_ERROR);
                } else {
                    logger.error(`#: ERROR`, Constants.APIKEY_ERROR);
                }
                return;
            }

            urlBuilder.setGuid(guid);
            urlBuilder.setRegion(region);
            urlBuilder.setApikey(apikey);
            __region = region
            __guid = guid
            __apikey = apikey
            isInitialized = true
        }

        /**
         * Sets the collection id.
         * Returns `null` if init is not performed before calling this method.
         * Returns `null` if `collectionId` is not passed
         * 
         * @param {string} collectionId - Id of the collection created in App Configuration service instance.
         * @see init
         */
        function setCollectionId(collectionId) {

            if (!isInitialized) {
                logger.error(`#: ERROR`, Constants.COLLECTION_ID_ERROR);
                return;
            }

            if (!collectionId) {
                logger.error(`#: ERROR`, Constants.COLLECTION_ID_VALUE_ERROR);
                return;
            }

            __collectionId = collectionId

            configurationHandlerInstance = configurationHandler.getInstance({
                collectionId: __collectionId,
                region: __region,
                guid: __guid,
                apikey: __apikey
            });

            isInitializedConfig = true
        }


        /**
         * Drives the SDK to use local configuration file to perform feature & property evaluations.
         * Returns `null` if init and setCollectionId is not performed before calling this method.
         * Returns `null` if path to configuration file is not provided.
         * 
         * @param {string} configurationFile - local configuration file path
         * @param {boolean} liveConfigUpdateEnabled - live configurations update from the server. Set this value to `false` if the new configuration values shouldn't be fetched from the server.
         * @see init
         * @see setCollectionId
         */
        function fetchConfigurationFromFile(configurationFile, liveConfigUpdateEnabled) {

            if (!isInitialized) {
                logger.error(`#: ERROR`, Constants.COLLECTION_INIT_ERROR);
                return;
            }

            if (!__collectionId) {
                logger.error(`#: ERROR`, Constants.COLLECTION_ID_VALUE_ERROR);
                return;
            }

            if (!configurationFile) {
                logger.error(`#: ERROR`, Constants.CONFIGURATION_FILE_NOT_FOUND_ERROR);
                return;
            }

            if (liveConfigUpdateEnabled) {
                logger.warning(`#: WARNING`, Constants.LIVE_CONFIGURATION_UPDATE_PARAMETER_WARNING);
            } else {
                __configurationFile = configurationFile
                configurationHandlerInstance = configurationHandler.currentInstance();
                configurationHandlerInstance.fetchConfigurationFromFileActions(__configurationFile);    //closeWebSockets & replace configurationFile
            }

        }

        /**
         * Returns the `Feature` object with the details of the feature specified by the `featureId`. 
         * Returns `null` if the featureId is invalid.
         * 
         * @param {string} featureId - The Feature ID.
         */
        function getFeature(featureId) {
            if (isInitialized && isInitializedConfig) {
                return configurationHandlerInstance.getFeature(featureId);
            } else {
                logger.error(`#: ERROR`, Constants.COLLECTION_INIT_ERROR);
                return;
            }
        }

        /**
         * Returns the `Feature` object with details of all the features associated with the `collectionId`.
         * 
         */
        function getFeatures() {
            if (isInitialized && isInitializedConfig) {
                return configurationHandlerInstance.getFeatures();
            } else {
                logger.error(`#: ERROR`, Constants.COLLECTION_INIT_ERROR);
                return
            }
        }

        /**
         * Returns the `Property` object with the details of the property specified by the `propertyId`. 
         * Returns `null` if the propertyId is invalid.
         * 
         * @param {string} propertyId - The Property ID.
         */
        function getProperty(propertyId) {
            if (isInitialized && isInitializedConfig) {
                return configurationHandlerInstance.getProperty(propertyId);
            } else {
                logger.error(`#: ERROR`, Constants.COLLECTION_INIT_ERROR);
                return;
            }
        }

        /**
         * Returns the `Property` object with details of all the properties associated with the `collectionId`.
         * 
         */
        function getProperties() {
            if (isInitialized && isInitializedConfig) {
                return configurationHandlerInstance.getProperties();
            } else {
                logger.error(`#: ERROR`, Constants.COLLECTION_INIT_ERROR);
                return
            }
        }

        /**
         * Method to enable or disable the logger.
         * By default, logger is disabled.
         * 
         * @param {boolean} value 
         */
        function setDebug(value = false) {
            logger.setDebug(value);
        }

        /**
         * Instance of EventEmitter to listen to live feature updates.
         */
        const emitter = events.getInstance();

        return {
            init,
            setCollectionId,
            fetchConfigurationFromFile,
            getFeature,
            getFeatures,
            getProperty,
            getProperties,
            setDebug,
            emitter
        }

    }

    // Return for AppConfiguration
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
                throw Error(Constants.SINGLETON_EXCEPTION)
            }
        },
        REGION_US_SOUTH: 'us-south',
        REGION_EU_GB: 'eu-gb',
        REGION_AU_SYD: 'au-syd'
    };
}

const appConfiguration = AppConfiguration();

module.exports = {
    AppConfiguration: appConfiguration,
    UrlBuilder: UrlBuilder
}
