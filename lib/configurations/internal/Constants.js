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
 * This file defines the various messages and constants used by the SDK.
 *
 * @module Constants
 */
const Constants = {

  // Socket constants
  CUSTOM_SOCKET_CLOSE_REASON_CODE: 4001,
  SOCKET_CONNECTION_ERROR: 'Socket connection error',
  SOCKET_LOST_ERROR: 'Socket connection lost',
  SOCKET_CONNECTION_CLOSE: 'Socket connection is closed',
  SOCKET_INCOMING_DATA: 'Received data from socket',
  SOCKET_MESSAGE_RECEIVED: 'Message received from server',
  SOCKET_CALLBACK: 'Message passed to handler',
  SOCKET_MESSAGE_ERROR: 'Message received from server is invalid',
  SOCKET_CONNECTION_SUCCESS: 'Successfully connected to App Configuration server',
  APPCONFIGURATION_CLIENT_EMITTER: 'configurationUpdate',

  // Other constants
  REGION_ERROR: 'Provide a valid region in App Configuration init',
  GUID_ERROR: 'Provide a valid guid in App Configuration init',
  APIKEY_ERROR: 'Provide a valid apiKey in App Configuration init',
  COLLECTION_ID_VALUE_ERROR: 'Provide a valid collectionId in App Configuration setContext method.',
  ENVIRONMENT_ID_VALUE_ERROR: 'Provide a valid environmentId in App Configuration setContext method.',
  COLLECTION_ID_ERROR: 'Invalid action in App Configuration. This action can be performed only after a successful initialization. \n Please check the initialization section for errors.',
  COLLECTION_INIT_ERROR: 'Invalid action in App Configuration. This action can be performed only after a successful initialization and setting the context. \n Please check the initialization and setContext sections for errors.',
  INVALID_OPTIONS_PARAMTER: 'options param passed to setContext is invalid. Should be a JSON',
  CONFIGURATION_FILE_NOT_FOUND_ERROR: 'bootstrapFile parameter should be provided while liveConfigUpdateEnabled is false during initialization.',
  PERSISTENT_CACHE_OPTION_ERROR: 'setContext: [options.persistentCacheDirectory]. Invalid value -',
  BOOTSTRAP_FILEPATH_OPTION_ERROR: 'setContext: [options.bootstrapFile]. Invalid value -',
  LIVE_CONFIG_UPDATE_OPTION_ERROR: 'setContext: [options.liveConfigUpdateEnabled]. Invalid value -',
  BOOTSTRAP_FILEPATH_NOT_FOUND_ERROR: 'setContext: [options.bootstrapFile] parameter should be provided when [options.liveConfigUpdateEnabled] is false.',
  NO_INTERNET_CONNECTION_ERROR: 'Check for network connectivity failed. Re-checking...',
  INVALID_ENTITY_ID: 'Invalid entityId passed to', // a substring of the entire message
  SINGLETON_EXCEPTION: 'Initialize object first',
  DEFAULT_SEGMENT_ID: '$$null$$',
  DEFAULT_ENTITY_ID: '$$null$$',
  DEFAULT_USAGE_LIMIT: 10,
  DEFAULT_ROLLOUT_PERCENTAGE: '$default',
  DEFAULT_FEATURE_VALUE: '$default',
  DEFAULT_PROPERTY_VALUE: '$default',
  INVALID_SECRET_MANAGER_CLIENT_MESSAGE: 'Secret Manager object passed to getSecret method is null or undefined.',
  SECRETREF: 'SECRETREF',
  SUCCESSFULLY_FETCHED_THE_CONFIGURATIONS: 'Successfully fetched the configurations',
  ERROR_POSTING_METERING_DATA: 'Error while posting metering data',
  SUCCESSFULLY_POSTED_METERING_DATA: 'Successfully posted metering data',
  ERROR_NO_WRITE_PERMISSION: 'Persistent cache directory provided doesn\'t have write permission. Make sure the directory has required access.',
  INPUT_PARAMETER_NOT_BOOLEAN: 'Input parameter passed to usePrivateEndpoint() method is not boolean. Default value will be used.',
  MAX_NUMBER_OF_RETRIES: 3,
  STATUS_CODE_OK: 200,
  STATUS_CODE_ACCEPTED: 202,
};

module.exports = {
  Constants,
};
