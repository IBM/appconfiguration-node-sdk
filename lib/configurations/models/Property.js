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
 * Defines the model of a Property defined in App Configuration service.
 */
class Property {
  /**
   * @constructor
   * @param {object} property - properties JSON object that contains all the properties
   */
  constructor(property) {
    this.name = property.name;
    this.property_id = property.property_id;
    this.type = property.type;
    this.format = property.format; // will be undefined for boolean & numeric datatypes
    this.value = property.value;
    this.segment_rules = property.segment_rules;
  }

  /**
   * Get the Property name
   * @returns {string} The Property name
   */
  getPropertyName() {
    return this.name ? this.name : '';
  }

  /**
   * Get the Property id
   * @returns {string} The Property Id
   */
  getPropertyId() {
    return this.property_id ? this.property_id : '';
  }

  /**
   * Get the Property data type
   * @returns {string} string named BOOLEAN/STRING/NUMERIC
   */
  getPropertyDataType() {
    return this.type ? this.type : '';
  }

  /**
   * Get the Property data format
   * applicable only for STRING datatype property.
   *
   * @returns {string|null} string named TEXT/JSON/YAML
   */
  getPropertyDataFormat() {
    // Format will be `undefined` for Boolean & Numeric properties
    // If the Format is null or undefined for a String type, we default it to TEXT
    if (!(this.format) && this.type === 'STRING') {
      this.format = 'TEXT';
    }
    return this.format ? this.format : null;
  }

  /**
   * Get the evaluated value of the property.
   *
   * @param {string} entityId - Id of the Entity.
   * This will be a string identifier related to the Entity against which the property is evaluated.
   * For example, an entity might be an instance of an app that runs on a mobile device, a microservice that runs on the cloud, or a component of infrastructure that runs that microservice.
   * For any entity to interact with App Configuration, it must provide a unique entity ID.
   *
   * @param {JSON} entityAttributes - A JSON object consisting of the attribute name and their values that defines the specified entity.
   * This is an optional parameter if the property is not configured with any targeting definition. If the targeting is configured, then entityAttributes should be provided for the rule evaluation.
   * An attribute is a parameter that is used to define a segment. The SDK uses the attribute values to determine if the
   * specified entity satisfies the targeting rules, and returns the appropriate property value.
   * 
   * @returns {object|null} Returns a json object containing evaluated value & detailed reason.
   * The evaluated value will be either the default property value or its overridden value based on the evaluation. The data type of returned value matches that of property.
   * Returns null if entityId is invalid.
   * 
   * Example:
   * ```js
   * const property = appConfigClient.getProperty('discount');
   * if (property != null) {
   *    const result = property.getCurrentValue(entityId, entityAttributes);
   *    
   *    // Access the evaluated value & details as shown below
   * 
   *    // result.value or result['value']
   *    // result.details or result['details']
   * }
   * ```
   */
  getCurrentValue(entityId, entityAttributes) {
    if (!entityId) {
      logger.error(`Property evaluation: ${Constants.INVALID_ENTITY_ID} getCurrentValue`);
      return null;
    }

    const { configurationHandler } = require('../ConfigurationHandler');
    const configurationHandlerInstance = configurationHandler.currentInstance();
    return configurationHandlerInstance.propertyEvaluation(this, entityId, entityAttributes);
  }
}

module.exports = {
  Property,
};
