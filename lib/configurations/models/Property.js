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
   * @param {object} propertyList - properties JSON object that contains all the properties
   */
  constructor(propertyList) {
    this.name = propertyList.name;
    this.property_id = propertyList.property_id;
    this.type = propertyList.type;
    this.value = propertyList.value;
    this.segment_rules = propertyList.segment_rules ? propertyList.segment_rules : [];
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
   * Get the evaluated value of the property
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
    return configurationHandlerInstance.propertyEvaluation(this, entityId, entityAttributes);
  }
}

module.exports = {
  Property,
};
