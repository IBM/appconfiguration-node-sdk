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

let featureObj;

function setupFeature(featureType, enabledValue, disabledValue, enabled) {
  const feature = {
    name: 'defaultFeature',
    feature_id: 'defaultfeature',
    type: featureType,
    enabled_value: enabledValue,
    disabled_value: disabledValue,
    segment_rules: [],
    enabled,
  };

  featureObj = new Feature(feature, feature.enabled);
}

describe('feature details', () => {
  test('test boolean feature', () => {
    setupFeature('BOOLEAN', true, false, false);
    expect(featureObj.getFeatureName()).toBe('defaultFeature');
    expect(featureObj.getFeatureId()).toBe('defaultfeature');
    expect(featureObj.getFeatureDataType()).toBe('BOOLEAN');
    expect(featureObj.isEnabled()).toBe(false);
    expect(featureObj.getCurrentValue()).toBeNull();
  });

  test('test string feature', () => {
    setupFeature('STRING', 'org user', 'unknown user', true);
    expect(featureObj.getFeatureName()).toBe('defaultFeature');
    expect(featureObj.getFeatureId()).toBe('defaultfeature');
    expect(featureObj.getFeatureDataType()).toBe('STRING');
    expect(featureObj.isEnabled()).toBe(true);
    expect(featureObj.getCurrentValue()).toBeNull();
  });

  test('test numeric feature', () => {
    setupFeature('NUMERIC', 25, 0, false);
    expect(featureObj.getFeatureName()).toBe('defaultFeature');
    expect(featureObj.getFeatureId()).toBe('defaultfeature');
    expect(featureObj.getFeatureDataType()).toBe('NUMERIC');
    expect(featureObj.isEnabled()).toBe(false);
    expect(featureObj.getCurrentValue()).toBeNull();
  });
});
