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
} = require('../../core/Logger');

const fs = require('fs');

const logger = Logger.getInstance()

/**
 * @method module:FileManager#storeFiles
 * @param {String} json
 * @param {String} filePath
 * @param {Function} callback
 */
function storeFiles(json, filePath, callback) {

    try {
        fs.writeFile(filePath, json, 'utf-8', err => {
            if (err) {
                throw Error(err)
            } else {
                logger.log(`#: Stored file `, "Filemanager method")
                callback()
            }
        })
    } catch (error) {
        logger.warning(`#: WARNING`, error.message)
    }

}

/**
 * @method module:FileManager#getFileData
 * @param {String} filePath
 */
function getFileData(filePath) {

    let data = []
    try {
        data = fs.readFileSync(filePath, 'utf-8')
        if (!data) {
            return []
        } else {
            return JSON.parse(data)
        }
    } catch (error) {
        logger.warning(`#: WARNING`, error)
        return []
    }
}

/**
 * @method module:FileManager#deleteFileData
 * @param {String} filePath
 */
function deleteFileData(filePath) {

    try {
        fs.truncateSync(filePath, 0, () => { })
    } catch (error) {
        logger.warning(`#: WARNING`, error)
    }

}

module.exports.FileManager = {
    getFileData,
    storeFiles,
    deleteFileData
}