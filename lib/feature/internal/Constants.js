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

const Constants = {

    // Socket constants
    DELIBERATE_SOCKET_CLOSE: "Close the socket deliberately",
    DELIBERATE_SOCKET_CLOSE_REASON_CODE: 4000,
    SOCKET_CONNECTION_SUCCESS_COPY: "Success socket connection event to sync up websocket closure",
    SOCKET_CONNECTION_ERROR: "Socket connection error",
    SOCKET_LOST_ERROR: "Socket connection lost",
    SOCKET_CONNECTION_CLOSE: "Socket connection is closed",
    SOCKET_INCOMING_DATA: "Received data from socket",
    SOCKET_MESSAGE_RECEIVED: "Message received from server",
    SOCKET_CALLBACK: "Message passed to handler",
    SOCKET_MESSAGE_ERROR: "Message received from server is invalid",
    SOCKET_CONNECTION_SUCCESS: "Successfully connected to App Configuration server",
    CACHE_ACTION_SUCCESS: "cacheUpdated",
    APPCONFIGURATION_CLIENT_EMITTER: "featuresUpdate",

    //Other constants
    REGION_ERROR: "Provide a valid region in App Configuration init",
    GUID_ERROR: "Provide a valid guid in App Configuration init",
    APIKEY_ERROR: "Provide a valid apiKey in App Configuration init",
    COLLECTION_ID_VALUE_ERROR: "Provide a valid collectionId in App Configuration setCollectionId method.",
    COLLECTION_ID_ERROR: "Invalid action in App Configuration. This action can be performed only after a successful initialization. \n Please check the initialization section for errors.",
    COLLECTION_SUB_ERROR: "Invalid action in App Configuration. This action can be performed only after a successful initialization and set collectionId value operation. \n Please check the initialization and setCollectionId sections for errors.",
    FEATURE_FILE_NOT_FOUND_ERROR: "featureFile parameter should be provided while liveFeatureUpdateEnabled is false during initialization.",
    LIVE_FEATURE_UPDATE_PARAMETER_WARNING: "Local featureFile provided has no effect when liveFeatureUpdateEnabled is set to true.",
    NO_INTERNET_CONNECTION_ERROR: "No connection to internet. Please re-connect.",
    NO_IDENTITY_ATTRIBUTES_PRESENT_LOG: "Returning the feature enabled value since the identity attributes are empty. Please set the identityAttributes to evaluate features with segments.",
    IDENTITY_ID_NOT_PASSED_ERROR: "id must be passed as first parameter to access getCurrentValue() method. Check the official docs for more info.",
    SINGLETON_EXCEPTION: "Initialize object first"
}


module.exports = {
    Constants: Constants
}