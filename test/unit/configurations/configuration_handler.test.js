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

const path = require('path');
const { configurationHandler } = require('../../../lib/configurations/ConfigurationHandler');

let configurationHandlerInstance;

async function setup() {
  configurationHandlerInstance = configurationHandler.getInstance();
  configurationHandlerInstance.init('region', 'guid', 'apikey');
  const filePath = path.join(__dirname, 'appconfiguration.json');
  configurationHandlerInstance.setContext('collectionId', 'environmentId', filePath, false);
  await new Promise((resolve) => setTimeout(resolve, 4000));
}

beforeAll(() => {
  jest.setTimeout(10000);
  return setup();
});

afterEach(() => {
  jest.clearAllTimers();
});

describe('configuration handler', () => {
  test('singleton check', () => {
    const configurationClient1 = configurationHandler.getInstance();
    const configurationClient2 = configurationHandler.getInstance();
    expect(configurationClient1).toBe(configurationClient2);
    expect(configurationClient1).toBe(configurationHandler.currentInstance());
  });
  test('evaluate property', () => {
    const propertyJson = {
      name: 'Age',
      property_id: 'age',
      type: 'NUMERIC',
      value: 18,
      segment_rules: [
        { rules: [{ segments: ['kp3ydh3k'] }], value: 21, order: 1 },
      ],
    };

    const propertyObj = configurationHandlerInstance.getProperty('age');
    expect(propertyObj).toEqual(propertyJson);
    expect(configurationHandlerInstance.propertyEvaluation(propertyObj, 'id1', { paid: true })).toBe(21);
    expect(propertyObj.getCurrentValue('id1', { paid: true })).toBe(21);
  });

  test('evaluate feature', () => {
    const featureJson = {
      name: 'Prime cars',
      feature_id: 'prime-cars',
      type: 'BOOLEAN',
      enabled_value: false,
      disabled_value: false,
      segment_rules: [
        { rules: [{ segments: ['kp3ydh3k'] }], value: true, order: 1 },
      ],
      enabled: true,
    };

    const featureObj = configurationHandlerInstance.getFeature('prime-cars');
    expect(featureObj).toEqual(featureJson);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id1', { paid: true })).toBe(true);
    expect(featureObj.getCurrentValue('id1', { paid: true })).toBe(true);
  });

  test('get methods', () => {
    const feature = configurationHandlerInstance.getFeature('weekend-discount');
    expect(feature.type).toBe('NUMERIC');

    const features = configurationHandlerInstance.getFeatures();
    expect(Object.keys(features).length).toBe(2);

    const property = configurationHandlerInstance.getProperty('campaign-name');
    expect(property.type).toBe('STRING');

    const properties = configurationHandlerInstance.getProperties();
    expect(Object.keys(properties).length).toBe(2);

    const segment = configurationHandlerInstance.getSegment('kp3yb6t1');
    expect(segment.name).toBe('An IBM employee');
  });
});
