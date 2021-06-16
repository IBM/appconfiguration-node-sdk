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
 * This module provides methods that perform the logging operations.
 * @module Logger
 */

const chalk = require('chalk');

const Logger = () => {
  let instance = null;
  let _isDebug = false;

  const timestamp = () => `${new Date().toLocaleString('sv').replace('T', ' ').substring(0, 19)} AppConfiguration`;
  /**
   * Enable or disable logger
   * @method module:Logger#setDebug
   * @param {Boolean} value
   */
  const setDebug = (value = false) => {
    _isDebug = value;
  };

  /**
   * Check debug enabled or not
   * @method module:Logger#isDebug
   */
  const isDebug = () => _isDebug;

  /**
   * Add log message
   * @method module:Logger#log
   * @param {String} message
   */
  const log = (message) => {
    if (!_isDebug) return;
    console.log(`${timestamp()} DEBUG ${message}`);
  };

  /**
   * Add error message
   * @method module:Logger#error
   * @param {String} message
   */
  const error = (message) => {
    const errorColor = chalk.bold.red;
    console.log(
      `${timestamp()} ERROR`, errorColor(`${message}`),
    );
  };

  /**
   * Add warning message
   * @method module:Logger#warning
   * @param {String} message
   */
  const warning = (message) => {
    if (!_isDebug) return;
    const warningColor = chalk.keyword('orange');
    console.log(
      `${timestamp()} WARNING`, warningColor(`${message}`),
    );
  };

  /**
   * Add success message
   * @method module:Logger#success
   * @param {String} message
   */
  const success = (message) => {
    if (!_isDebug) return;
    const successColor = chalk.bold.green;
    console.log(
      `${timestamp()} SUCCESS`, successColor(`${message}`),
    );
  };

  /**
   * Add info message
   * @method module:Logger#info
   * @param {String} message
   */
  const info = (message) => {
    if (!_isDebug) return;
    const infoColor = chalk.bold.bgBlueBright;
    console.log(
      `${timestamp()} INFO`, infoColor(`${message}`),
    );
  };

  /**
   * @method module:Logger#createInstance
   */
  const createInstance = () => ({
    setDebug,
    isDebug,
    log,
    error,
    warning,
    success,
    info,
  });

  return {
    getInstance: () => {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    },
  };
};

const Log = Logger();

module.exports = {
  Logger: Log,
};
