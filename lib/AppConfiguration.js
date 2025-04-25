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
const { reportError } = require('./configurations/internal/Utils');
const { isConnected } = require('./configurations/ConfigurationHandler')


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
    let isInitialized = false;
    let isInitializedConfig = false;
    let configurationHandlerInstance = null;
    let _usePrivateEndpoint = false;

    /**
     * Initialize the sdk to connect with your App Configuration service instance.
     *
     * @method module:AppConfiguration#init
     * @param {string} region - REGION name where the App Configuration service instance is
     * created.
     * @param {string} guid - GUID of the App Configuration service.
     * @param {string} apikey - APIKEY of the App Configuration service.
     * 
     * @returns {void} This method does not return anything.
     * @throws {Error} Throws an error with a custom message if any of the params are missing or invalid.
     */
    function init(region, guid, apikey) {
      // `init` is a sdk initialisation method. It is expected to be called only once.
      // Below if-condition makes sure the `init` inputs are taken only once even if this function is called mutiple times.
      if (isInitialized) return;

      if (!region || !guid || !apikey) {
        if (!region) {
          reportError(Constants.REGION_ERROR);
        } else if (!guid) {
          reportError(Constants.GUID_ERROR);
        } else {
          reportError(Constants.APIKEY_ERROR);
        }
      }

      configurationHandlerInstance = configurationHandler.getInstance();
      configurationHandlerInstance.init(region, guid, apikey, _usePrivateEndpoint);
      isInitialized = true;
    }

    /**
     * Sets the context of the SDK
     * Throws `Error` if init method was not called before calling this method.
     * Throws `Error` if `collectionId` is not passed or invalid
     * Throws `Error` if `environmentId` is not passed or invalid
     * Throws `Error` if values passed in `options` param are invalid.
     * Throws `Error` if there is an error fetching the configurations (i.e., feature flags & properties).
     * 
     * @async
     * @method module:AppConfiguration#setContext
     * @param {string} collectionId - Id of the collection created in App Configuration service
     * instance.
     * @param {string} environmentId - Id of the environment created in App Configuration
     * service instance.
     * @param {object} [options] - A JSON object.
     * @param {string} [options.persistentCacheDirectory] - The SDK will create a file - 'appconfiguration.json'
     * in the specified directory and it will be used as the persistent cache to store the App Configuration
     * service information.
     * @param {string} [options.bootstrapFile] - Absolute path of configuration file. This parameter
     * when passed along with `liveConfigUpdateEnabled` value will drive the SDK to use the configurations
     * present in this file to perform feature & property evaluations.
     * @param {boolean} [options.liveConfigUpdateEnabled] - live configurations update from the server.
     * Set this value to `false` if the new configuration values shouldn't be fetched from the server.
     * 
     * @returns {Promise<void>} A empty Promise that resolves when the configurations are successfully fetched or loaded.
     * @throws {Error} If there is an error fetching the configurations (i.e., feature flags & properties).
     * @see init
     */
    async function setContext(collectionId, environmentId, options) {
      // `setContext` is also a sdk initialisation method. It is expected to be called only once.
      // Below if-condition makes sure the `setContext` inputs are taken only once even if this function is called mutiple times.
      if (isInitializedConfig) return;

      if (!isInitialized) {
        reportError(Constants.COLLECTION_ID_ERROR);
      }

      if (!collectionId) {
        reportError(Constants.COLLECTION_ID_VALUE_ERROR);
      }

      if (!environmentId) {
        reportError(Constants.ENVIRONMENT_ID_VALUE_ERROR);
      }

      const defaultOptions = {
        persistentCacheDirectory: null,
        bootstrapFile: null,
        liveConfigUpdateEnabled: true,
      };

      if (options !== undefined) {
        if (options === null || typeof options !== 'object') {
          reportError(`${Constants.INVALID_OPTIONS_PARAMTER}`);
        }
        if (Object.prototype.hasOwnProperty.call(options, 'persistentCacheDirectory')) {
          const givenDirPath = options.persistentCacheDirectory;
          if (typeof givenDirPath === 'string' && givenDirPath.length > 0) {
            defaultOptions.persistentCacheDirectory = givenDirPath;
          } else {
            reportError(`${Constants.PERSISTENT_CACHE_OPTION_ERROR} ${givenDirPath}`);
          }
        }
        if (Object.prototype.hasOwnProperty.call(options, 'bootstrapFile')) {
          const givenFilePath = options.bootstrapFile;
          if (typeof givenFilePath === 'string' && givenFilePath.length > 0 && path.extname(givenFilePath) === '.json') {
            defaultOptions.bootstrapFile = givenFilePath;
          } else {
            reportError(`${Constants.BOOTSTRAP_FILEPATH_OPTION_ERROR} ${givenFilePath}`);
          }
        }
        if (Object.prototype.hasOwnProperty.call(options, 'liveConfigUpdateEnabled')) {
          const givenFlagValue = options.liveConfigUpdateEnabled;
          if (typeof givenFlagValue === 'boolean') {
            defaultOptions.liveConfigUpdateEnabled = givenFlagValue;
          } else {
            reportError(`${Constants.LIVE_CONFIG_UPDATE_OPTION_ERROR} ${givenFlagValue}`);
          }
        }
        if (defaultOptions.liveConfigUpdateEnabled === false && defaultOptions.bootstrapFile === null) {
          reportError(Constants.CONFIGURATION_FILE_NOT_FOUND_ERROR);
        }
      }

      isInitializedConfig = true;
      configurationHandlerInstance = configurationHandler.getInstance();
      await configurationHandlerInstance.setContext(collectionId, environmentId, defaultOptions);
    }

    /**
     * Set the SDK to connect to App Configuration service by using a private endpoint that is 
     * accessible only through the IBM Cloud private network. 
     * 
     * This function must be called before calling the `init` function on the SDK.
     *
     * @method module:AppConfiguration#usePrivateEndpoint
     * @param {boolean} usePrivateEndpointParam - Set to true if the SDK should connect to 
     * App Configuration using private endpoint. Be default, it is set to false.
     */
    function usePrivateEndpoint(usePrivateEndpointParam) {
      if (typeof (usePrivateEndpointParam) === "boolean") {
        _usePrivateEndpoint = usePrivateEndpointParam;
        return;
      }
      logger.error(Constants.INPUT_PARAMETER_NOT_BOOLEAN);
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
     * Returns the `SecretProperty` object corresponding to the given propertyId.
     * Returns `null` if the Id the secret property is invalid.
     * Returns `null` is secretManagerObj is undefined/null.
     *
     * @method module:AppConfiguration#getSecret
     * @param {string} propertyId - Id of the secret property from App Configuration.
     * @param {object} secretsManagerService - Secret Manager client object obtained by initializing the secret manager sdk.
     * @returns {object|null} SecretProperty object.
     */
    function getSecret(propertyId, secretsManagerService) {
      if (isInitialized && isInitializedConfig) {
        if (secretsManagerService !== undefined && secretsManagerService !== null) {
          return configurationHandlerInstance.getSecret(propertyId, secretsManagerService);
        }
        logger.error(Constants.INVALID_SECRET_MANAGER_CLIENT_MESSAGE);
        return null;
      }
      logger.error(Constants.COLLECTION_INIT_ERROR);
      return null;
    }

    /**
     * Method to record the custom metric events for a entityId while running an experiment.
     * 
     * @method module:AppConfiguration#track
     * @param {string} eventKey - SDK event key
     * @param {string} entityId - The entityId
     * @returns {void|null} 
     */
    function track(eventKey, entityId) {
      if (isInitialized && isInitializedConfig) {
        return configurationHandlerInstance.track(eventKey, entityId);
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
      isConnected,
      setContext,
      getFeature,
      getFeatures,
      getProperty,
      getProperties,
      track,
      setDebug,
      usePrivateEndpoint,
      getSecret,
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
    /**
     *
     * Override the default App Configuration URL. This method should be invoked before the SDK initialization.
     *
     * ```js
     * // Example
     * AppConfiguration.overrideServiceUrl('https://testurl.com');
     * ```
     * NOTE: To be used for development purposes only.
     * @param {string} url - The base url
     */
    overrideServiceUrl: (url) => {
      if (url) {
        urlBuilder.setBaseServiceUrl(url);
      }
    },
    REGION_US_SOUTH: 'us-south',
    REGION_EU_GB: 'eu-gb',
    REGION_AU_SYD: 'au-syd',
    REGION_US_EAST: 'us-east',
    REGION_EU_DE: 'eu-de',
    REGION_CA_TOR: 'ca-tor',
    REGION_JP_TOK: 'jp-tok',
    REGION_JP_OSA: 'jp-osa'
  };
};

const appConfiguration = AppConfiguration();

module.exports = {
  AppConfiguration: appConfiguration,
};
