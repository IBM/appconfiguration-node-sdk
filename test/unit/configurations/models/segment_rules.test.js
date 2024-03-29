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

const { SegmentRules } = require('../../../../lib/configurations/models/SegmentRules');

let segmentRulesObj;

function setupRules() {
  const segmentRules = {
    rules: [
      {
        segments: [
          'kp3yb6t1',
        ],
      },
    ],
    value: 25,
    order: 1,
    rollout_percentage: 45
  };

  segmentRulesObj = new SegmentRules(segmentRules);
}

describe('segment rules', () => {
  setupRules();
  test('test segment rules', () => {
    expect(segmentRulesObj.getRules().length).toEqual(1);
    expect(segmentRulesObj.getValue()).toEqual(25);
    expect(segmentRulesObj.getOrder()).toEqual(1);
    expect(segmentRulesObj.getRolloutPercentage()).toEqual(45);
  });
});
