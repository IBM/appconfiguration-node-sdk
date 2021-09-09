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
  Logger,
} = require('./core/Logger');
const {
  UrlBuilder,
} = require('./core/UrlBuilder');
const {
  events,
} = require('./configurations/internal/Events');
const {
  Constants,
} = require('./configurations/internal/Constants');
const {
  configurationHandler,
} = require('./configurations/ConfigurationHandler');

/**
 * Client for App Configuration
 * @module AppConfiguration
 */
const AppConfiguration = () => {
  let instance = null;

  const logger = Logger.getInstance();

  /**
   * Constructs an instance of AppConfiguration
   * @method module:AppConfiguration#createInstance
   */
  function createInstance() {
    let isInitialized = false;
    let isInitializedConfig = false;
    let configurationHandlerInstance = null;

    /**
     * Initialize the sdk to connect with your App Configuration service instance.
     * The method returns `null` if any of the params are missing or invalid.
     *
     * @method module:AppConfiguration#init
     * @param {string} region - REGION name where the App Configuration service instance is
     * created.
     * @param {string} guid - GUID of the App Configuration service.
     * @param {string} apikey - APIKEY of the App Configuration service.
     * @returns {*}
     */
    function init(region, guid, apikey) {
      if (!region || !guid || !apikey) {
        if (!region) {
          logger.error(Constants.REGION_ERROR);
        } else if (!guid) {
          logger.error(Constants.GUID_ERROR);
        } else {
          logger.error(Constants.APIKEY_ERROR);
        }
        return;
      }

      configurationHandlerInstance = configurationHandler.getInstance();
      configurationHandlerInstance.init(region, guid, apikey);

      isInitialized = true;
    }

    /**
     * Sets the context of the SDK
     * Returns `null` if init is not performed before calling this method.
     * Returns `null` if `collectionId` is not passed
     * Returns `null` if `environmentId` is not passed
     *
     * @method module:AppConfiguration#setContext
     * @param {string} collectionId - Id of the collection created in App Configuration service
     * instance.
     * @param {string} environmentId - Id of the environment created in App Configuration
     * service instance.
     * @param {string} [configurationFile=''] - DEPRECATED (use this param as part of `options` object):
     * local configuration file path. This optional parameter when passed along with `liveConfigUpdateEnabled`
     * value will drive the SDK to use local configuration file to perform feature & property evaluations.
     * @param {boolean} [liveConfigUpdateEnabled=true] - DEPRECATED (use this param as part of `options` object):
     * live configurations update from the server. Set this value to `false` if the new configuration values
     * shouldn't be fetched from the server.
     * @param {object} [options] - Options object
     * @param {string} [options.persistentCacheDirectory] - The SDK will create a file - 'AppConfiguration.json'
     * in the specified directory and it will be used as the persistent cache to store the App Configuration
     * service information.
     * @param {string} [options.bootstrapFile] - Absolute path of configuration file. This parameter
     * when passed along with `liveConfigUpdateEnabled` value will drive the SDK to use the configurations
     * present in this file to perform feature & property evaluations.
     * @param {boolean} [options.liveConfigUpdateEnabled] - live configurations update from the server.
     * Set this value to `false` if the new configuration values shouldn't be fetched from the server.
     * @returns {*}
     * @see init
     */
    function setContext(collectionId, environmentId, ...args) {
      if (!isInitialized) {
        logger.error(Constants.COLLECTION_ID_ERROR);
        return;
      }

      if (!collectionId) {
        logger.error(Constants.COLLECTION_ID_VALUE_ERROR);
        return;
      }

      if (!environmentId) {
        logger.error(Constants.ENVIRONMENT_ID_VALUE_ERROR);
        return;
      }

      // default options (in-memory cache)
      let options = {
        persistentCacheDirectory: null,
        bootstrapFile: null,
        liveConfigUpdateEnabled: true,
      };
      const numberOfArguments = args.length;
      configurationHandlerInstance = configurationHandler.getInstance();

      switch (numberOfArguments) {
        case 0:
          // do nothing. (follow the in-memory cache)
          break;
        case 1:
          // with just one parameter, it can be just configurationFile's string path or the options object.
          // Do a condition check before proceeding. Only until we remove support for configurationFile
          if (typeof (args[0]) === 'string') {
            console.log(Constants.DEPRECATION_MESSAGE);
            [options.bootstrapFile] = args;
            break;
          }
          // all the optional parameters when passed in an json
          [options] = args;
          options.persistentCacheDirectory = options.persistentCacheDirectory ? options.persistentCacheDirectory : null;
          options.bootstrapFile = options.bootstrapFile ? options.bootstrapFile : null;
          options.liveConfigUpdateEnabled = (options.liveConfigUpdateEnabled === true || options.liveConfigUpdateEnabled === false)
            ? options.liveConfigUpdateEnabled : true;
          break;
        case 2:
          // case to support existing parameters `configurationFile` and `liveConfigUpdateEnabled`
          console.log(Constants.DEPRECATION_MESSAGE);
          [options.bootstrapFile, options.liveConfigUpdateEnabled] = args;
          if (!options.liveConfigUpdateEnabled && !options.bootstrapFile) {
            logger.error(Constants.CONFIGURATION_FILE_NOT_FOUND_ERROR);
            return;
          }
          break;
        case 3:
          // when both (existing parameters & options object) are passed. The parameters in the options object
          // takes precedence
          [, , options] = args;
          options.persistentCacheDirectory = options.persistentCacheDirectory ? options.persistentCacheDirectory : null;
          options.bootstrapFile = options.bootstrapFile ? options.bootstrapFile : null;
          options.liveConfigUpdateEnabled = (options.liveConfigUpdateEnabled === true || options.liveConfigUpdateEnabled === false)
            ? options.liveConfigUpdateEnabled : true;
          break;
        default:
          logger.error(Constants.ILLEGAL_ARGUMENTS);
          return;
      }

      isInitializedConfig = true;
      configurationHandlerInstance.setContext(collectionId, environmentId, options);
    }
    /**
     * Returns the `Feature` object with the details of the feature specified by the
     * `featureId`. Returns `null` if the featureId is invalid.
     *
     * @method module:AppConfiguration#getFeature
     * @param {string} featureId - The Feature Id.
     * @returns {object|null} Feature object
     */
    function getFeature(featureId) {
      if (isInitialized && isInitializedConfig) {
        return configurationHandlerInstance.getFeature(featureId);
      }
      logger.error(Constants.COLLECTION_INIT_ERROR);
      return null;
    }

    /**
     * Returns the `Feature` object with details of all the features associated with the
     * `collectionId`.
     *
     * @method module:AppConfiguration#getFeatures
     * @returns {object|null} Feature object containing all the features
     */
    function getFeatures() {
      if (isInitialized && isInitializedConfig) {
        return configurationHandlerInstance.getFeatures();
      }
      logger.error(Constants.COLLECTION_INIT_ERROR);
      return null;
    }

    /**
     * Returns the `Property` object with the details of the property specified by the
     * `propertyId`. Returns `null` if the propertyId is invalid.
     *
     * @method module:AppConfiguration#getProperty
     * @param {string} propertyId - The Property Id.
     * @returns {object|null} Property object
     */
    function getProperty(propertyId) {
      if (isInitialized && isInitializedConfig) {
        return configurationHandlerInstance.getProperty(propertyId);
      }
      logger.error(Constants.COLLECTION_INIT_ERROR);
      return null;
    }

    /**
     * Returns the `Property` object with details of all the properties associated with the
     * `collectionId`.
     *
     * @method module:AppConfiguration#getProperties
     * @returns {object|null} Property object containing all the properties
     */
    function getProperties() {
      if (isInitialized && isInitializedConfig) {
        return configurationHandlerInstance.getProperties();
      }
      logger.error(Constants.COLLECTION_INIT_ERROR);
      return null;
    }

    /**
     * Method to enable or disable the logger.
     * By default, logger is disabled.
     *
     * @method module:AppConfiguration#setDebug
     * @param {boolean} value
     */
    function setDebug(value = false) {
      logger.setDebug(value);
    }

    /**
     * Instance of EventEmitter to listen to live configuration updates.
     */
    const emitter = events.getInstance();

    return {
      init,
      setContext,
      getFeature,
      getFeatures,
      getProperty,
      getProperties,
      setDebug,
      emitter,
    };
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
        return instance;
      }
      throw Error(Constants.SINGLETON_EXCEPTION);
    },
    REGION_US_SOUTH: 'us-south',
    REGION_EU_GB: 'eu-gb',
    REGION_AU_SYD: 'au-syd',
  };
};

const appConfiguration = AppConfiguration();

module.exports = {
  AppConfiguration: appConfiguration,
  UrlBuilder,
};
