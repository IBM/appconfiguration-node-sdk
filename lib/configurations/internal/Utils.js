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
 * 1. Validate the bootstrap configurations.
 * 2. Extract all the features, properties & segments that are under {environmentId} and assigned to {collectionId} 
 */
function extractConfigurationsFromBootstrapJson(bootstrapFileData, collectionId, environmentId) {
  try {
    if (!Array.isArray(bootstrapFileData.environments)) throw new Error(`no environments`);
    if (!Array.isArray(bootstrapFileData.collections)) throw new Error(`no collections`);

    const matchingEnv = bootstrapFileData.environments.find((env) => env.environment_id === environmentId);
    if (matchingEnv === undefined) {
      throw new Error(`no data matching for environment id: ${environmentId}`);
    }
    const matchingCollection = bootstrapFileData.collections.find((col) => col.collection_id === collectionId);
    if (matchingCollection === undefined) {
      throw new Error(`no data matching for collection id: ${collectionId}`);
    }

    let features = [];
    let properties = [];
    const segmentIds = new Set();
    const segments = [];

    if (Array.isArray(matchingEnv.features)) {
      features = matchingEnv.features.filter((feature) => {
        const match = feature.collections.some((col) => col.collection_id === collectionId);
        if (match) {
          feature.segment_rules.forEach((segmentRule) => {
            segmentRule.rules.forEach((rule) => {
              rule.segments.forEach((segment) => {
                segmentIds.add(segment);
              })
            })
          })
        }
        return match;
      });
    }
    if (Array.isArray(matchingEnv.properties)) {
      properties = matchingEnv.properties.filter((property) => {
        const match = property.collections.some((col) => col.collection_id === collectionId);
        if (match) {
          property.segment_rules.forEach((segmentRule) => {
            segmentRule.rules.forEach((rule) => {
              rule.segments.forEach((segment) => {
                segmentIds.add(segment);
              })
            })
          })
        }
        return match;
      });
    }
    if (segmentIds.size > 0) {
      if (!Array.isArray(bootstrapFileData.segments)) throw new Error(`no segments`);
      segmentIds.forEach((segmentId) => {
        const matchingSeg = bootstrapFileData.segments.find((segment) => segment.segment_id === segmentId);
        if (matchingSeg === undefined) {
          throw new Error(`no data matching for segment id: ${segmentId}`);
        }
        segments.push(matchingSeg);
      })
    }
    return {
      features,
      properties,
      segments,
    }
  } catch (e) {
    throw new Error(`Error occured while reading bootstrap configurations - ${e.message}`);
  }
}

/**
 * Extract all the features, properties & segments.
 */
function extractConfigurationsFromAPIResponse(res) {
  let features = [];
  let properties = [];
  let segments = [];

  if (res && Array.isArray(res.environments) && res.environments[0]) {
    features = res.environments[0].features;
    properties = res.environments[0].properties;
  }
  segments = res.segments;

  return {
    features,
    properties,
    segments,
  }
}

function formatConfig(res, environmentId) {
  return {
    environments: [
      {
        environment_id: environmentId,
        features: res.features,
        properties: res.properties,
      }
    ],
    segments: res.segments
  }
}

function reportError(message) {
  logger.error(message);
  throw new Error(message);
}

module.exports = {
  getNormalizedValue,
  extractConfigurationsFromBootstrapJson,
  extractConfigurationsFromAPIResponse,
  extractConfigurationsFromPersistentCache: extractConfigurationsFromAPIResponse,
  formatConfig,
  reportError,
};
