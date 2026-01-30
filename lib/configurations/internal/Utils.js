/**
 * Copyright 2022 IBM Corp. All Rights Reserved.
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

const murmurhash = require('murmurhash');
const { Logger } = require('../../core/Logger');

const logger = Logger.getInstance();

function computeHash(str) {
  const SEED = 0;
  return murmurhash.v3(str, SEED);
}

function getNormalizedValue(str) {
  const MAX_HASH_VALUE = 2 ** 32;
  const NORMALIZER = 100;
  return Math.floor((computeHash(str) / MAX_HASH_VALUE) * NORMALIZER);
}

/**
 * Prepares config data for extraction with validation
 * @param data {Object}
 * @param environmentId {String}
 * @return {{features: *[], properties: *[], segments: *[]}}
 */
function extractEnvironmentData(data, environmentId) {
  if (!("segments" in data && Array.isArray(data.segments) &&
      "environments" in data && Array.isArray(data.environments))) {
    throw new Error("Improper Data format present in configuration");
  }
  for (let i = 0; i < data.environments.length; i += 1) {
    const environment = data.environments[i];
    if (environment.environment_id === environmentId) {
      return {
        features: environment.features,
        properties: environment.properties,
        segments: data.segments
      };
    }
  }
  throw new Error("Matching environment not found in configuration");
}

/**
 * Validates feature/property belongs to collection if it contains collections else gives true as default
 * @param resource {Object}
 * @param collection {string}
 * @return {boolean}
 */
function validateResource(resource, collection) {
  if (!("collections" in resource)) {
    // If collections is not present the resource data is coming from SDK APIs
    return true;
  }
  const {collections} = resource;
  if (!Array.isArray(collections)) {
    throw new Error("Improper collection format in resource data");
  }
  for (let i = 0, len = collections.length; i < len; i+=1) {
    if (collections[i].collection_id === collection) {
      // Resource belongs to collection
      return true;
    }
  }
  // Resource doesn't belong to collection
  return false;
}

/**
 * Appends segment ids in provided set
 * @param resource {Object}
 * @param segmentIds {Set}
 */
function appendSegmentId(resource, segmentIds) {
  resource.segment_rules.forEach(segmentRule => {
    segmentRule.rules.forEach(rule => {
      rule.segments.forEach(segmentId => {
        segmentIds.add(segmentId);
      })
    })
  })
}

/**
 * Returns object containing features, properties, segments after validation
 * @param resourceData {Object}
 * @param collection {String}
 * @return {{features: *[], properties: *[], segments: *[]}}
 */
function extractResources(resourceData, collection) {
  const features = [];
  const properties = [];
  const segments = [];
  const segmentIds = new Set();

  // Appending features with validation to features array
  for (let i = 0; i < resourceData.features.length; i+=1){
    const feature = resourceData.features[i];
    if (validateResource(feature, collection)) {
      appendSegmentId(feature, segmentIds);
      features.push(feature);
    }
  }

  // Appending properties with validation to properties array
  for (let i = 0; i < resourceData.properties.length; i+=1){
    const property = resourceData.properties[i];
    if (validateResource(property, collection)) {
      appendSegmentId(property, segmentIds);
      properties.push(property);
    }
  }

  // Appending only required segments to segments array and throw error if any required segment is absent
  for (let i = 0, len = resourceData.segments.length; i < len; i+=1){
    const segment = resourceData.segments[i];
    if (segmentIds.has(segment.segment_id)) {
      segments.push(segment);
      segmentIds.delete(segment.segment_id);
    }
  }
  if (segmentIds.size > 0) {
    throw new Error("Required segment doesn't exist in provided segments");
  }

  return {
    features,
    properties,
    segments,
  }
}

/**
 * Unified parser for app-config data for new sdk-config format, export and promote data format
 * @param configurations {JSON}
 * @param environment {string}
 * @param collection {string}
 * @return {{features: *[], properties: *[], segments: *[]}}
 */
function extractConfigurations(configurations, environment, collection) {
  try {
    // Check if data belongs to correct collection
    if (!("collections" in configurations && Array.isArray(configurations.collections))) {
      throw new Error("Improper/Missing collections in configuration");
    }
    let matchFound = false;
    for (let i = 0; i < configurations.collections.length; i+=1) {
      if (configurations.collections[i].collection_id === collection) {
        matchFound = true;
        break;
      }
    }
    if (!matchFound) {
      throw new Error("Required collection not found in collections");
    }
    // Data in SDK config/export/promote format
    const configData = extractEnvironmentData(configurations, environment);
    return extractResources(configData, collection);

  } catch (e) {
    throw new Error(`Extraction of configurations failed with error:\n ${e.message}`);
  }
}

function formatConfig(res, environmentId, collectionId) {
  return {
    environments: [
      {
        environment_id: environmentId,
        features: res.features,
        properties: res.properties,
      }
    ],
    collections: [{collection_id: collectionId}],
    segments: res.segments
  }
}

function reportError(message) {
  logger.error(message);
  throw new Error(message);
}

function sliceArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    const slice = array.slice(i, i + size);
    result.push(slice);
  }
  return result;
}

// exponential delay calculation for retries of '/usage' & '/analytics'
// 2.x minutes base delay with jitter (0–0.9 minutes)
function computeBaseDelayMs() {
  const baseMs = 2 * 60 * 1000; // 2 minutes
  const jitterMs = Math.floor(0.9 * 60 * 1000 * Math.random()); // up to 54,000ms
  return baseMs + jitterMs; // 2.0–2.9 minutes
}

// 1 hour cap + jitter in SECONDS (0–59s)
function computeCapDelayMs() {
  const baseMs = 60 * 60 * 1000; // 1 hour
  const jitterSeconds = Math.floor(Math.random() * 60); // 0–59 seconds
  return baseMs + jitterSeconds * 1000; // 60:00–60:59 minutes
}

// Compute next delay with exponential backoff, capped
function computeNextDelayMs(attempt, capMs) {
  const expMs = computeBaseDelayMs() * (2 ** attempt);
  return Math.min(expMs, capMs);
}

module.exports = {
  getNormalizedValue,
  extractConfigurations,
  formatConfig,
  reportError,
  sliceArray,
  computeBaseDelayMs,
  computeCapDelayMs,
  computeNextDelayMs
};
