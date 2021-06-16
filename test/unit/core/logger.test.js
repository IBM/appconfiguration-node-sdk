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

const { Logger } = require('../../../lib/core/Logger');

const logger = Logger.getInstance();
logger.setDebug(true);

describe('logger', () => {
  test('set debug', () => {
    logger.setDebug = jest.fn();
    logger.setDebug(true);
    expect(logger.setDebug).toHaveBeenCalledWith(true);
  });
  test('log level', () => {
    logger.log = jest.fn();
    logger.log('hello');
    expect(logger.log).toHaveBeenCalledWith('hello');
  });
  test('error level', () => {
    logger.error = jest.fn();
    logger.error('error');
    expect(logger.error).toHaveBeenCalledWith('error');
  });
  test('warning level', () => {
    logger.warning = jest.fn();
    logger.warning('warning');
    expect(logger.warning).toHaveBeenCalledWith('warning');
  });
  test('success level', () => {
    logger.success = jest.fn();
    logger.success('success');
    expect(logger.success).toHaveBeenCalledWith('success');
  });
  test('info level', () => {
    logger.info = jest.fn();
    logger.info('info');
    expect(logger.info).toHaveBeenCalledWith('info');
  });
});
