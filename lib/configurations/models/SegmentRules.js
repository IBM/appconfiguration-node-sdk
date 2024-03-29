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

/**
 * Defines the model of a segment rule defined in App Configuration service.
 */
class SegmentRules {
  /**
   * @constructor
   * @param {object} segmentRules - segment_rules JSON object that contains all the segment rules
   */
  constructor(segmentRules) {
    this.rules = segmentRules.rules;
    this.value = segmentRules.value;
    this.order = segmentRules.order;
    this.rollout_percentage = Object.prototype.hasOwnProperty.call(segmentRules, 'rollout_percentage') ? segmentRules.rollout_percentage : 100;
  }

  /**
   * @returns {Array<object>} the rules array of the segment_rules object
   */
  getRules() {
    return this.rules ? this.rules : [];
  }

  /**
   * @returns {boolean|string|number} the value of the rule in segment_rules object
   */
  getValue() {
    return this.value ? this.value : '';
  }

  /**
   * @returns {number} the order of the rule in the segment_rules object
   */
  getOrder() {
    return this.order;
  }

  /**
   * @returns {number} the value of the rollout percentage in the segment_rules object
   */
  getRolloutPercentage() {
    return this.rollout_percentage;
  }
}

module.exports = {
  SegmentRules,
};
