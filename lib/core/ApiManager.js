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
 * ApiManager
 * @module ApiManager
 */

const axios = require('axios').default
const {
    Logger
} = require('./Logger')
const {
    UrlBuilder
} = require('./UrlBuilder')

const logger = Logger.getInstance()
const urlBuilder = UrlBuilder.getInstance()

/**
 * Call the GET operation
 * @method module:ApiManager#makeGetApiCall
 * @param {String} url
 */
async function makeGetApiCall(url) {
    try {
        const headers = urlBuilder.getHeaders();
        const response = await axios.get(url, {
            headers: headers
        })
        if (response && response.data) {
            return response.data
        } else {
            return null
        }
    } catch (error) {
        logger.warning(`#: WARNING `, error.response)
        logger.error(`#: ERROR `, `Unexpected error while connecting to the App Configuration service`)
        return null
    }
}

/**
 * Call the POST operation
 * @method module:ApiManager#makePostApiCall
 * @param {String} url
 * @param {*} body
 */
async function makePostApiCall(url, body) {
    try {

        const headers = urlBuilder.getHeaders(true);
        const response = await axios.post(
            url, body, {
                headers: headers
            }
        )
        return response
    } catch (error) {
        logger.warning(`#: WARNING`, error)
        logger.error(`#: ERROR `, `Unexpected error while connecting to the App Configuration service`)
        return null
    }
}

axios.interceptors.response.use(
    res => res,
    err => {
        if (err) {
            handleError(err)
        }
        return null;
    }
)

function handleError(error) {
    if (error.response.status >= 400 && error.response.status <= 499) {
        logger.error(`#: ERROR`, `Invalid configuration. Verify the collectionId, apikey, guid and region.`)
    } else {
        logger.error(`#: ERROR`, `Error occurred connecting to App Configuration service.`)
    }
    logger.warning(`#: WARNING`, `Error : ${JSON.stringify(error.response.data) }`)
}

module.exports.ApiManager = {
    makeGetApiCall,
    makePostApiCall
}