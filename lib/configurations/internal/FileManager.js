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
 * @param {string} json - The data to be stored
 * @param {string} filePath - File path where the data should be stored
 * @param {Function} callback
 * 
 * @returns {void} This method does not return anything.
 * @throws {Error} If fails to write to given filePath due to insufficient permissions or other reasons.
 */
function storeFiles(json, filePath, callback) {
  fs.writeFile(filePath, json, 'utf-8', (err) => {
    if (err) {
      throw Error(err.message);
    } else {
      callback();
    }
  });
}

/**
 * Read configurations from the persistent file.
 *
 * @method module:FileManager#readPersistentCacheConfigurations
 * @param {string} filePath - persistent file path from where the configurations data should be read
 * 
 * @returns {JSON} JSON parsed configurations from the given file path or empty json.
 */
function readPersistentCacheConfigurations(filePath) {
  let data = {};
  try {
    if (!fs.existsSync(filePath)) {
      logger.log(`configuration file in the persistent cache doesn't exists`);
      return {};
    }

    data = fs.readFileSync(filePath, 'utf-8');
    if (!data) {
      logger.log(`configuration file in the persistent cache is empty`);
      return {};
    }
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

/**
 * Read bootstrap configurations from the given file path.
 *
 * @method module:FileManager#readBootstrapConfigurations
 * @param {string} filePath - File path from where the configurations data should be read
 * 
 * @returns JSON parsed bootstrap configurations from the given file path, if there was no error reading it.
 * @throws {Error} If filePath doesn't exists or is empty or fails to parse the json.
 */
function readBootstrapConfigurations(filePath) {
  let data = {};
  if (!fs.existsSync(filePath)) {
    throw new Error(`given bootstrap file path doesn't exist: ${filePath}`);
  }
  data = fs.readFileSync(filePath, 'utf-8');
  if (!data) {
    throw new Error(`given bootstrap file is empty: ${filePath}`);
  }
  try {
    return JSON.parse(data);
  } catch (err) {
    throw new Error(`failed to parse the json from the given bootstrap file: ${filePath}. Error ${err}`)
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
  readBootstrapConfigurations,
  readPersistentCacheConfigurations,
  storeFiles,
  deleteFileData,
};
