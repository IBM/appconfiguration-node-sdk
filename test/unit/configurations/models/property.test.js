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

const { Property } = require('../../../../lib/configurations/models/Property');

let propertyObj;

function setupProperty(propertyType, value, format) {
  const property = {
    name: 'defaultProperty',
    property_id: 'defaultproperty',
    type: propertyType,
    format: format,
    value,
    segment_rules: [],
  };

  propertyObj = new Property(property);
}

describe('property details', () => {
  test('test boolean property', () => {
    setupProperty('BOOLEAN', true);
    expect(propertyObj.getPropertyName()).toBe('defaultProperty');
    expect(propertyObj.getPropertyId()).toBe('defaultproperty');
    expect(propertyObj.getPropertyDataType()).toBe('BOOLEAN');
    expect(propertyObj.getPropertyDataFormat()).toBeNull();
    expect(propertyObj.getCurrentValue()).toBeNull();
  });

  test('test string property - text', () => {
    setupProperty('STRING', 'org user', 'TEXT');
    expect(propertyObj.getPropertyName()).toBe('defaultProperty');
    expect(propertyObj.getPropertyId()).toBe('defaultproperty');
    expect(propertyObj.getPropertyDataType()).toBe('STRING');
    expect(propertyObj.getPropertyDataFormat()).toBe('TEXT');
    expect(propertyObj.getCurrentValue()).toBeNull();
  });

  test('test string property - valid json', () => {
    setupProperty('STRING', { "key": "property value" }, 'JSON');
    expect(propertyObj.getPropertyName()).toBe('defaultProperty');
    expect(propertyObj.getPropertyId()).toBe('defaultproperty');
    expect(propertyObj.getPropertyDataType()).toBe('STRING');
    expect(propertyObj.getPropertyDataFormat()).toBe('JSON');
    expect(propertyObj.getCurrentValue()).toBeNull();
  });

  test('test string property - valid yaml', () => {
    setupProperty('STRING', 'key1: property_value\n---\nkey2: property_value', 'YAML');
    expect(propertyObj.getPropertyName()).toBe('defaultProperty');
    expect(propertyObj.getPropertyId()).toBe('defaultproperty');
    expect(propertyObj.getPropertyDataType()).toBe('STRING');
    expect(propertyObj.getPropertyDataFormat()).toBe('YAML');
    expect(propertyObj.getCurrentValue()).toBeNull();
  });

  test('test numeric property', () => {
    setupProperty('NUMERIC', 25);
    expect(propertyObj.getPropertyName()).toBe('defaultProperty');
    expect(propertyObj.getPropertyId()).toBe('defaultproperty');
    expect(propertyObj.getPropertyDataType()).toBe('NUMERIC');
    expect(propertyObj.getPropertyDataFormat()).toBeNull();
    expect(propertyObj.getCurrentValue()).toBeNull();
  });

  test('test SECRETREF property - text', () => {
    setupProperty('SECRETREF', '12345');
    expect(propertyObj.getPropertyName()).toBe('defaultProperty');
    expect(propertyObj.getPropertyId()).toBe('defaultproperty');
    expect(propertyObj.getPropertyDataType()).toBe('SECRETREF');
    expect(propertyObj.getPropertyDataFormat()).toBeNull();
    expect(propertyObj.getCurrentValue()).toBeNull();
  });
});
