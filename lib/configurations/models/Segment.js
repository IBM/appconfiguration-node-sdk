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
	Rule
} = require('./Rule')

class Segment {
	constructor(segmentList) {
		this.name = segmentList.name;
		this.segment_id = segmentList.segment_id;
		this.rules = segmentList.rules ? segmentList.rules : [];
	}
	evaluateRule(entityAttributes) {

		for (let index = 0; index < this.rules.length; index++) {
			const rule = this.rules[index];

			let ruleObj = new Rule(rule)
			if (!ruleObj.evaluateRule(entityAttributes)) {
				return false;
			}
		}
		return true;
	}
}

module.exports = {
	Segment: Segment
}