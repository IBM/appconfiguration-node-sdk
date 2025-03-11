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

const { Segment } = require('../../../../lib/configurations/models/Segment');

let segmentObj;

function setup() {
  const segment = {
    name: 'An IBM employee',
    segment_id: 'kp3yb6t1',
    rules: [
      {
        values: ['alice'],
        operator: 'startsWith',
        attribute_name: 'email',
      },
      {
        values: ['bob'],
        operator: 'notStartsWith',
        attribute_name: 'email',
      },
      {
        values: ['ibm.com'],
        operator: 'endsWith',
        attribute_name: 'email',
      },
      {
        values: ['google.com'],
        operator: 'notEndsWith',
        attribute_name: 'email',
      },
      { values: ['@'], operator: 'contains', attribute_name: 'email' },
      { values: ['#'], operator: 'notContains', attribute_name: 'email' },
      {
        values: ['alice@ibm.com'],
        operator: 'is',
        attribute_name: 'email',
      },
      {
        values: ['bob@ibm.com'],
        operator: 'isNot',
        attribute_name: 'email',
      },
      {
        values: ['6'],
        operator: 'greaterThan',
        attribute_name: 'band_level',
      },
      {
        values: ['7'],
        operator: 'greaterThanEquals',
        attribute_name: 'band_level',
      },
      {
        values: ['7'],
        operator: 'lesserThanEquals',
        attribute_name: 'band_level',
      },
      {
        values: ['8'],
        operator: 'lesserThan',
        attribute_name: 'band_level',
      },
    ],
  };

  segmentObj = new Segment(segment);
}

describe('segment evaluate rule', () => {
  setup();

  test('should return true', () => {
    const entityAttributes = {
      email: 'alice@ibm.com',
      band_level: 7,
    };
    expect(segmentObj.evaluateRule(entityAttributes)).toBe(true);
  });

  test('should return false', () => {
    const entityAttributes = {
      email: 'alice#ibm.com',
      band_level: 7,
    };
    expect(segmentObj.evaluateRule(entityAttributes)).toBe(false);
  });

  test('should return false', () => {
    const entityAttributes = {
      email: 'bob@ibm.com',
      band_level: 7,
    };
    expect(segmentObj.evaluateRule(entityAttributes)).toBe(false);
  });

  test('should return true', () => {
    const entityAttributes = {
      email: 'alice@ibm.com',
      band_level: '7',
    };
    expect(segmentObj.evaluateRule(entityAttributes)).toBe(true);
  });

  test('should return false', () => {
    const entityAttributes = {
      email: 'bob@ibm.com',
      band_level: '7',
    };
    expect(segmentObj.evaluateRule(entityAttributes)).toBe(false);
  });

  test('should return false', () => {
    const entityAttributes = {
      email: 'xyz@ibm.co.in',
      band_level: '7',
    };
    expect(segmentObj.evaluateRule(entityAttributes)).toBe(false);
  });

  test('should return false', () => {
    const entityAttributes = {
      email: 'alice@ibm.com',
      band_level: 10,
    };
    expect(segmentObj.evaluateRule(entityAttributes)).toBe(false);
  });

  test('should return false', () => {
    const entityAttributes = {
      band_level: 7,
    };
    expect(segmentObj.evaluateRule(entityAttributes)).toBe(false);
  });

  test('should return false', () => {
    const entityAttributes = {
      email: null,
    };
    expect(segmentObj.evaluateRule(entityAttributes)).toBe(false);
  });

  test('should return false', () => {
    const entityAttributes = {};
    expect(segmentObj.evaluateRule(entityAttributes)).toBe(false);
  });

  test('should return false', () => {
    const segment = {
      name: 'An IBM employee',
      segment_id: 'kp3yb6t1',
      rules: [
        {
          values: [
            'alice@ibm.com',
          ],
          operator: 'shouldBe',
          attribute_name: 'email',
        },
      ],
    };
    segmentObj = new Segment(segment);
    const entityAttributes = {
      email: 'adi@ibm.com',
    };
    expect(segmentObj.evaluateRule(entityAttributes)).toBe(false);
  });
});
