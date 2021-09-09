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
 * This module provides methods that perform the store and retrieve operations on the 
 * file based cache of the SDK.
 * 
 * @module FileManager
 */
const fs = require('fs');
const {
  Logger,
} = require('../../core/Logger');

const logger = Logger.getInstance();

/**
 * Store/copy the given data to specified filepath
 * 
 * @method module:FileManager#storeFiles
 * @param {string|object} json - The data to be stored
 * @param {string} filePath - File path where the data should be stored
 * @param {Function} callback
 */
function storeFiles(json, filePath, callback) {
  try {
    fs.writeFile(filePath, json, 'utf-8', (err) => {
      if (err) {
        throw Error(err);
      } else {
        logger.log('Stored configurations to persistent storage');
        callback();
      }
    });
  } catch (error) {
    logger.warning(error.message);
  }
}

/**
 * Read the data from the given file path.
 * 
 * @method module:FileManager#getFileData
 * @param {string} filePath - File path from where the data should be read
 * @returns Contents of the file
 */
function getFileData(filePath) {
  let data = {};
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }

    data = fs.readFileSync(filePath, 'utf-8');
    if (!data) {
      return {};
    }
    return JSON.parse(data);
  } catch (error) {
    logger.warning(error);
    return {};
  }
}

/**
 * Delete the data from the given file path.
 * 
 * @method module:FileManager#deleteFileData
 * @param {string} filePath - File path from where the data should be deleted
 */
function deleteFileData(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }

    fs.truncateSync(filePath, 0, () => { });
  } catch (error) {
    logger.warning(error);
  }
}

module.exports.FileManager = {
  getFileData,
  storeFiles,
  deleteFileData,
};
