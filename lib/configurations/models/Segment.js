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

const {
  Rule,
} = require('./Rule');

/**
 * Defines the model of a segment defined in App Configuration service.
 */
class Segment {
  /**
   * @constructor
   * @param {object} segmentList - segments JSON object that contains all the segments
   */
  constructor(segmentList) {
    this.name = segmentList.name;
    this.segment_id = segmentList.segment_id;
    this.rules = segmentList.rules ? segmentList.rules : [];
  }

  /**
   * Evaluate the Segment rules
   *
   * @param {object} entityAttributes - Entity attributes object
   * @returns {boolean}
   */
  evaluateRule(entityAttributes) {
    for (let index = 0; index < this.rules.length; index += 1) {
      const rule = this.rules[index];

      const ruleObj = new Rule(rule);
      if (!ruleObj.evaluateRule(entityAttributes)) {
        return false;
      }
    }
    return true;
  }
}

module.exports = {
  Segment,
};
