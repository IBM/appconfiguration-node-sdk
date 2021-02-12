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

const chalk = require('chalk');

/**
 * Logger
 * @module Logger
 */
const Logger = () => {
  let instance = null
  _isDebug = false

  /**
   * Enable or disable logger
   * @method module:Logger#setDebug
   * @param {Boolean} value
   */
  let setDebug = (value = false) => {
    _isDebug = value
  }

  /**
   * Check debug enabled or not
   * @method module:Logger#isDebug
   */
  let isDebug = () => {
    return _isDebug
  }

  /**
   * Add log message
   * @method module:Logger#log
   * @param {String} message
   * @param {String} value
   */
  let log = (message, value) => {
    if (!_isDebug) return
    console.log(`\n${timestamp()} - message : ${message} , value: ${value}\n`)
  }

  /**
   * Add error message
   * @method module:Logger#error
   * @param {String} message
   * @param {String} value
   */
  const error = (message, value) => {
    const errorColor = chalk.bold.red
    console.log(
      errorColor(`\n${timestamp()} - message : ${message} , value: ${value}\n`)
    )
  }

  /**
   * Add warning message
   * @method module:Logger#warning
   * @param {String} message
   * @param {String} value
   */
  const warning = (message, value) => {
    if (!_isDebug) return
    const warningColor = chalk.keyword('orange')
    console.log(
      warningColor(`\n${timestamp()} - message : ${message} , value: ${value}\n`)
    )
  }

  /**
   * Add success message
   * @method module:Logger#success
   * @param {String} message
   * @param {String} value
   */
  const success = (message, value) => {
    if (!_isDebug) return
    const successColor = chalk.bold.green
    console.log(
      successColor(`\n${timestamp()} - message : ${message} , value: ${value}\n`)
    )
  }

  /**
   * Add debug message
   * @method module:Logger#debug
   * @param {String} message
   * @param {String} value
   */
  const debug = (message, value) => {
    if (!_isDebug) return
    const debugColor = chalk.bold.bgCyan
    console.log(
      debugColor(`\n${timestamp()} - message : ${message} , value: ${value}\n`)
    )
  }

  /**
   * Add info message
   * @method module:Logger#info
   * @param {String} message
   * @param {String} value
   */
  const info = (message, value) => {
    if (!_isDebug) return
    const infoColor = chalk.bold.bgBlueBright
    console.log(
      infoColor(`\n${timestamp()} - message : ${message} , value: ${value}\n`)
    )
  }

  const timestamp = () => {
    return new Date().toISOString();
  }

  /**
   * @method module:Logger#createInstance
   */
  createInstance = () => ({
    setDebug,
    isDebug,
    log,
    error,
    warning,
    success,
    debug,
    info,
  })

  return {
    getInstance: () => {
      if (!instance) {
        instance = createInstance()
      }
      return instance
    }
  }
}

const Log = Logger()

module.exports = {
  Logger: Log
}