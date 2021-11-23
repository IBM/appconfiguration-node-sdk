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

const { Feature } = require('../../../../lib/configurations/models/Feature');

// isEnabled() & getCurrentValue() are recorded as metering.
// These both methods requires configuration handler module to be initialised
const { configurationHandler } = require('../../../../lib/configurations/ConfigurationHandler');
configurationHandler.getInstance();

let featureObj;

function setupFeature(featureType, enabledValue, disabledValue, enabled, format) {
  const feature = {
    name: 'defaultFeature',
    feature_id: 'defaultfeature',
    type: featureType,
    format: format,
    enabled_value: enabledValue,
    disabled_value: disabledValue,
    segment_rules: [],
    enabled,
  };

  featureObj = new Feature(feature);
}

describe('feature details', () => {
  test('test boolean feature', () => {
    setupFeature('BOOLEAN', true, false, false);
    expect(featureObj.getFeatureName()).toBe('defaultFeature');
    expect(featureObj.getFeatureId()).toBe('defaultfeature');
    expect(featureObj.getFeatureDataType()).toBe('BOOLEAN');
    expect(featureObj.getFeatureDataFormat()).toBeNull();
    expect(featureObj.isEnabled()).toBe(false);
    expect(featureObj.getCurrentValue()).toBeNull();
  });

  test('test string feature - text', () => {
    setupFeature('STRING', 'org user', 'unknown user', true, 'TEXT');
    expect(featureObj.getFeatureName()).toBe('defaultFeature');
    expect(featureObj.getFeatureId()).toBe('defaultfeature');
    expect(featureObj.getFeatureDataType()).toBe('STRING');
    expect(featureObj.getFeatureDataFormat()).toBe('TEXT');
    expect(featureObj.isEnabled()).toBe(true);
    expect(featureObj.getCurrentValue()).toBeNull();
  });

  test('test string feature - valid json', () => {
    setupFeature('STRING', {"key": "enabled value"}, {"key" : "disabled value"}, true, 'JSON');
    expect(featureObj.getFeatureName()).toBe('defaultFeature');
    expect(featureObj.getFeatureId()).toBe('defaultfeature');
    expect(featureObj.getFeatureDataType()).toBe('STRING');
    expect(featureObj.getFeatureDataFormat()).toBe('JSON');
    expect(featureObj.isEnabled()).toBe(true);
    expect(featureObj.getCurrentValue()).toBeNull();
  });

  test('test string feature - valid yaml', () => {
    setupFeature('STRING', 'key1: enabled_value', 'key2: disabled_value\n---\nkey3: disabled_value', true, "YAML");
    expect(featureObj.getFeatureName()).toBe('defaultFeature');
    expect(featureObj.getFeatureId()).toBe('defaultfeature');
    expect(featureObj.getFeatureDataType()).toBe('STRING');
    expect(featureObj.getFeatureDataFormat()).toBe('YAML');
    expect(featureObj.isEnabled()).toBe(true);
    expect(featureObj.getCurrentValue()).toBeNull();
  });

  test('test numeric feature', () => {
    setupFeature('NUMERIC', 25, 0, false);
    expect(featureObj.getFeatureName()).toBe('defaultFeature');
    expect(featureObj.getFeatureId()).toBe('defaultfeature');
    expect(featureObj.getFeatureDataType()).toBe('NUMERIC');
    expect(featureObj.getFeatureDataFormat()).toBeNull();
    expect(featureObj.isEnabled()).toBe(false);
    expect(featureObj.getCurrentValue()).toBeNull();
  });
});
