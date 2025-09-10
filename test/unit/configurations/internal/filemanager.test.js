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
const { FileManager } = require('../../../../lib/configurations/internal/FileManager');

const data = {
  features: [{
    name: 'Prime cars',
    feature_id: 'prime-cars',
    type: 'BOOLEAN',
    enabled_value: false,
    disabled_value: false,
    segment_rules: [{ rules: [{ segments: ['kp3ydh3k'] }], value: true, order: 1, rollout_percentage: 100 }],
    enabled: true,
    rollout_percentage: 100
  }, {
    name: 'Weekend discount',
    feature_id: 'weekend-discount',
    type: 'NUMERIC',
    enabled_value: 5,
    disabled_value: 0,
    segment_rules: [{ rules: [{ segments: ['kp3yb6t1'] }], value: 25, order: 1, rollout_percentage: 90 }],
    enabled: true,
    rollout_percentage: 50
  }],
  properties: [{
    name: 'Age',
    property_id: 'age',
    tags: '',
    type: 'NUMERIC',
    value: 18,
    segment_rules: [{ rules: [{ segments: ['kp3ydh3k'] }], value: 21, order: 1 }],
    created_time: '2021-05-25T11:21:00Z',
    updated_time: '2021-05-25T11:27:38Z',
  }, {
    name: 'Campaign name',
    property_id: 'campaign-name',
    tags: '',
    type: 'STRING',
    value: 'New year celebrations',
    segment_rules: [],
    created_time: '2021-05-25T11:20:04Z',
    updated_time: '2021-05-25T11:20:04Z',
  }],
  segments: [{
    name: 'Beta users',
    segment_id: 'kp3ydh3k',
    rules: [{ values: ['true'], operator: 'is', attribute_name: 'paid' }]
  }, {
    name: 'An IBM employee',
    segment_id: 'kp3yb6t1',
    rules: [{ values: ['alice'], operator: 'startsWith', attribute_name: 'email' }, {
      values: ['ibm.com'],
      operator: 'endsWith',
      attribute_name: 'email'
    }, { values: ['@'], operator: 'contains', attribute_name: 'email' }, {
      values: ['6'],
      operator: 'greaterThan',
      attribute_name: 'band_level'
    }, { values: ['7'], operator: 'greaterThanEquals', attribute_name: 'band_level' }, {
      values: ['7'],
      operator: 'lesserThanEquals',
      attribute_name: 'band_level'
    }, { values: ['8'], operator: 'lesserThan', attribute_name: 'band_level' }]
  }],
};

describe('file manager', () => {
  test('delete cached config file', () => {
    const filePath = path.join(__dirname, 'nonexistingfile.json');
    expect(FileManager.deleteFileData(filePath)).toBeUndefined();
  });
  test('read config file - persistent cache', () => {
    const filePath = path.join(__dirname, 'nonexistingfile.json');
    expect(FileManager.readPersistentCacheConfigurations(filePath)).toStrictEqual('');
  });
  test('read config file - bootstrap configurations', () => {
    const filePath = path.join(__dirname, 'nonexistingfile.json');
    expect(() => { FileManager.readBootstrapConfigurations(filePath); }).toThrow(Error);
  });
  test('read config file - bootstrap configurations', () => {
    const filePath = path.join(__dirname, 'appconfiguration.json');
    expect(() => { FileManager.readBootstrapConfigurations(filePath); }).toThrow(Error);
  });
  test('write configurations to a file', () => {
    jest.setTimeout(30000);
    const filePath = path.join(__dirname, 'appconfiguration.json');
    expect(() => { FileManager.storeFiles(data, filePath, () => { }); }).toThrow();
  });
});
