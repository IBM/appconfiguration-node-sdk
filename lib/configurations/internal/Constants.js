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
  MEMORY_CACHE_ACTION_SUCCESS: 'memoryCacheUpdated',
  APPCONFIGURATION_CLIENT_EMITTER: 'configurationUpdate',

  // Other constants
  REGION_ERROR: 'Provide a valid region in App Configuration init',
  GUID_ERROR: 'Provide a valid guid in App Configuration init',
  APIKEY_ERROR: 'Provide a valid apiKey in App Configuration init',
  COLLECTION_ID_VALUE_ERROR: 'Provide a valid collectionId in App Configuration setContext method.',
  ENVIRONMENT_ID_VALUE_ERROR: 'Provide a valid environmentId in App Configuration setContext method.',
  COLLECTION_ID_ERROR: 'Invalid action in App Configuration. This action can be performed only after a successful initialization. \n Please check the initialization section for errors.',
  COLLECTION_INIT_ERROR: 'Invalid action in App Configuration. This action can be performed only after a successful initialization and setting the context. \n Please check the initialization and setContext sections for errors.',
  CONFIGURATION_FILE_NOT_FOUND_ERROR: 'configurationFile parameter should be provided while liveConfigUpdateEnabled is false during initialization.',
  NO_INTERNET_CONNECTION_ERROR: 'No connection to internet. Please re-connect.',
  ENTITY_ID_NOT_PASSED_ERROR: 'A valid entity id must be passed as first parameter to access getCurrentValue() method. Check the official docs for more info.',
  SINGLETON_EXCEPTION: 'Initialize object first',
  DEFAULT_SEGMENT_ID: '$$null$$',
  DEFAULT_ENTITY_ID: '$$null$$',
  DEFAULT_USAGE_LIMIT: 25,

  SUCCESSFULLY_POSTED_METERING_DATA: 'Successfully posted metering data',
  ERROR_POSTING_METERING_DATA: 'Error while posting metering data',
  ERROR_NO_WRITE_PERMISSION: 'Persistent cache directory provided doesn\'t have write permission. Make sure the directory has required access.',
  CREATE_NEW_CONNECTION: 'Retrying to create a new connection',
  DEPRECATION_MESSAGE: 'DepricationWarning: With v0.2.0, the existing method of passing configurationFile and liveConfigUpdateEnabled will be deprecated and removed from v0.3.0 \nUse options object parameter instead.',
  ILLEGAL_ARGUMENTS: 'Illegal number of arguments provided',
};

module.exports = {
  Constants,
};
