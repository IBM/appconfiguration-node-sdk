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
const { Constants } = require('../internal/Constants');

const logger = Logger.getInstance();

/**
 * Defines the model of a Feature defined in App Configuration service.
 */
class Feature {
  /**
   * @constructor
   * @param {object} feature - features JSON object that contains all the features
   */
  constructor(feature) {
    this.name = feature.name;
    this.feature_id = feature.feature_id;
    this.type = feature.type;
    this.format = feature.format; // will be undefined for boolean & numeric datatypes
    this.disabled_value = feature.disabled_value;
    this.enabled_value = feature.enabled_value;
    this.enabled = feature.enabled;
    this.segment_rules = feature.segment_rules ? feature.segment_rules : [];
  }

  /**
   * Get the Feature name
   * @returns {string} The Feature name
   */
  getFeatureName() {
    return this.name ? this.name : '';
  }

  /**
   * Get the Feature Id
   * @returns {string} The Feature Id
   */
  getFeatureId() {
    return this.feature_id ? this.feature_id : '';
  }

  /**
   * Get the Feature data type
   * @returns {string} string named BOOLEAN/STRING/NUMERIC
   */
  getFeatureDataType() {
    return this.type ? this.type : '';
  }

  /**
   * Get the Feature data format.
   * applicable only for STRING datatype feature flag.
   * 
   * @returns {string|null} string named TEXT/JSON/YAML
   */
  getFeatureDataFormat() {
    // Format will be `undefined` for Boolean & Numeric feature flags
    // If the Format is null or undefined for a String type, we default it to TEXT
    if (!(this.format) && this.type === 'STRING') {
      this.format = 'TEXT';
    }
    return this.format ? this.format : null;
  }

  /**
   * Get the evaluated value of the feature
   * 
   * @param {string} entityId - Id of the Entity
   * @param {object} entityAttributes - Entity attributes object
   * @returns {boolean|string|number|null} Evaluated value
   */
  getCurrentValue(entityId, entityAttributes) {
    if (!entityId) {
      logger.error(Constants.ENTITY_ID_NOT_PASSED_ERROR);
      return null;
    }

    const { configurationHandler } = require('../ConfigurationHandler');
    const configurationHandlerInstance = configurationHandler.currentInstance();
    return configurationHandlerInstance.featureEvaluation(this, entityId, entityAttributes);
  }

  /**
   * Return the enabled status of the feature
   * @returns {boolean} true or false
   */
  isEnabled() {
    // isEnabled() method call is also recorded as an feature evaluation without entityId
    const { configurationHandler } = require('../ConfigurationHandler');
    const configurationHandlerInstance = configurationHandler.currentInstance();
    configurationHandlerInstance.recordEvaluation(this.feature_id, null, Constants.DEFAULT_ENTITY_ID, Constants.DEFAULT_SEGMENT_ID);
    
    return this.enabled;
  }
}

module.exports = {
  Feature,
};
