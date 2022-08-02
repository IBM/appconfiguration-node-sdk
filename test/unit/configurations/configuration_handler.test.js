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
  const filePath = path.join(__dirname, 'bootstrap-configurations.json');
  configurationHandlerInstance.setContext('collectionId', 'environmentId', {
    persistentCacheDirectory: __dirname,
    bootstrapFile: filePath,
    liveConfigUpdateEnabled: false,
  });
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
    expect(configurationHandlerInstance.propertyEvaluation(propertyObj, 'id1', { paid: true }).value).toBe(21);
    const result = propertyObj.getCurrentValue('id1', { paid: true });
    expect(result.value).toBe(21);
  });

  test('evaluate feature', () => {
    const featureJson = {
      name: 'Weekend discount',
      feature_id: 'weekend-discount',
      type: 'NUMERIC',
      enabled_value: 5,
      disabled_value: 0,
      segment_rules: [
        { rules: [{ segments: ['kp3yb6t1'] }], value: 25, order: 1, rollout_percentage: 90 },
      ],
      enabled: true,
      rollout_percentage: 50
    };

    const featureObj = configurationHandlerInstance.getFeature('weekend-discount');
    expect(featureObj).toEqual(featureJson);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id1', {}).value).toBe(0);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id1', {}).isEnabled).toBe(false);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id1', { email: 'alice@ibm.com', band_level: '7' }).value).toBe(25);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id1', { email: 'alice@ibm.com', band_level: '7' }).isEnabled).toBe(true);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id1', { email: 'alice@ibm.com',  band_level: '6' }).value).toBe(0);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id1', { email: 'alice@ibm.com',  band_level: '6' }).isEnabled).toBe(false);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id2', {}).value).toBe(5);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id2', {}).isEnabled).toBe(true);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id2', { email: 'alice@ibm.com',  band_level: '7' }).value).toBe(25);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id2', { email: 'alice@ibm.com',  band_level: '7' }).isEnabled).toBe(true);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id2', { email: 'bob@ibm.com',  band_level: '7' }).value).toBe(5);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id2', { email: 'bob@ibm.com',  band_level: '7' }).isEnabled).toBe(true);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id6', { email: 'bob@ibm.com',  band_level: '7' }).value).toBe(0);
    expect(configurationHandlerInstance.featureEvaluation(featureObj, 'id6', { email: 'bob@ibm.com',  band_level: '7' }).isEnabled).toBe(false);
    expect(featureObj.isEnabled()).toBe(true);
    const result = featureObj.getCurrentValue('id1', { email: 'alice@ibm.com', band_level: '7' });
    expect(result.value).toBe(25);
    expect(result.isEnabled).toBe(true);
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
