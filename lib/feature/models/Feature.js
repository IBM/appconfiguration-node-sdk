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

const { Logger } = require('../../core/Logger');
const logger = Logger.getInstance();
const { Constants } = require('../internal/Constants');


class Feature {

	constructor(featureList, enabled) {
		this.enabled = enabled;
		this.name = featureList.name;
		this.feature_id = featureList.feature_id;
		this.type = featureList.type;
		this.disabled_value = featureList.disabled_value;
		this.enabled_value = featureList.enabled_value;
		this.segment_rules = featureList.segment_rules ? featureList.segment_rules : [];
		this.segment_exists = featureList.segment_exists ? true : false;
	}

	getFeatureName() {
		return this.name ? this.name : "";
	}
	getFeatureId() {
		return this.feature_id ? this.feature_id : "";
	}
	getFeatureDataType() {
		return this.type ? this.type : "";
	}

	getCurrentValue(identityId, identityAttributes) {

		if (!identityId) {
			logger.error(`#: ERROR`, Constants.IDENTITY_ID_NOT_PASSED_ERROR);
			return null;
		}

		if (this.enabled) {
			if (this.segment_exists && this.segment_rules.length > 0) {
				const {
					featureHandler
				} = require('../FeatureHandler')
				let featureHandlerInstance = featureHandler.currentInstance();
				return featureHandlerInstance.featureEvaluation(this, identityAttributes);
			} else {
				return this.enabled_value;
			}
		} else {
			return this.disabled_value;
		}
	}

	isEnabled() {
		return this.enabled;
	}
}

module.exports = {
	Feature: Feature
}