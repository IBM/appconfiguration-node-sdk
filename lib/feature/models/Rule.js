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

class Rule {

    constructor(segmentRules) {
        this.attribute_name = segmentRules.attribute_name;
        this.operator = segmentRules.operator;
        this.values = segmentRules.values;
    }

    operatorCheck(key, value) {
        let result = false
        if (key == null || value == null) {
            return result;
        }
        let reg;
        switch (this.operator) {
            case "endsWith":
                reg = new RegExp(value + "$", "i");
                result = reg.test(key);
                break;
            case "startsWith":
                reg = new RegExp("^" + value, "i");
                result = reg.test(key);
                break;
            case "contains":
                result = key.includes(value);
                break;
            case "is":
                result = (key === value);
                break;
            case "greaterThan":
                result = (parseFloat(key) > parseFloat(value));
                break;
            case "lesserThan":
                result = (parseFloat(key) < parseFloat(value));
                break;
            case "greaterThanEquals":
                result = (parseFloat(key) >= parseFloat(value));
                break;
            case "lesserThanEquals":
                result = (parseFloat(key) <= parseFloat(value));
                break;
            default:
                result = false;
        }
        return result
    }

    evaluateRule(identityAttributes) {

        let key;
        let result = false;

        if (Object.prototype.hasOwnProperty.call(identityAttributes, this.attribute_name)) {
            key = identityAttributes[this.attribute_name];
        } else {
            return result;
        }
        for (let index = 0; index < this.values.length; index++) {
            const value = this.values[index];
            if (this.operatorCheck(key, value)) {
                result = true
            }
        }
        return result;
    }
}

module.exports = {
    Rule: Rule
}