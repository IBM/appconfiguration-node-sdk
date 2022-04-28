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
    this.rollout_percentage = Object.prototype.hasOwnProperty.call(feature, 'rollout_percentage') ? feature.rollout_percentage : 100;
    this.segment_rules = feature.segment_rules;
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
   * Returns the state of the feature flag.
   *
   * @returns {boolean} Returns true, if the feature flag is enabled, otherwise returns false.
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get the evaluated value of the feature flag.
   *
   * @param {string} entityId - Id of the Entity.
   * This will be a string identifier related to the Entity against which the feature is evaluated.
   * For example, an entity might be an instance of an app that runs on a mobile device, a microservice that runs on the cloud, or a component of infrastructure that runs that microservice.
   * For any entity to interact with App Configuration, it must provide a unique entity ID.
   *
   * @param {JSON} entityAttributes - A JSON object consisting of the attribute name and their values that defines the specified entity.
   * This is an optional parameter if the feature flag is not configured with any targeting definition. If the targeting is configured, then entityAttributes should be provided for the rule evaluation.
   * An attribute is a parameter that is used to define a segment. The SDK uses the attribute values to determine if the
   * specified entity satisfies the targeting rules, and returns the appropriate feature flag value.
   *
   * @returns {boolean|string|number|null} Returns one of the Enabled/Disabled/Overridden value based on the evaluation.
   * The data type of returned value matches that of feature flag.
   */
  getCurrentValue(entityId, entityAttributes) {
    if (!entityId) {
      logger.error(`Feature flag evaluation: ${Constants.INVALID_ENTITY_ID} getCurrentValue`);
      return null;
    }

    const { configurationHandler } = require('../ConfigurationHandler');
    const configurationHandlerInstance = configurationHandler.currentInstance();
    return configurationHandlerInstance.featureEvaluation(this, entityId, entityAttributes).current_value;
  }

}

module.exports = {
  Feature,
};
