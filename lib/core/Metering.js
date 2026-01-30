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

const { Logger } = require('./Logger');
const { UrlBuilder } = require('./UrlBuilder');
const { getBaseServiceClient, getHeaders } = require('./ApiManager');
const { Constants } = require('../configurations/internal/Constants');
const { computeCapDelayMs, computeNextDelayMs } = require('../configurations/internal/Utils');

/**
 * This module provides methods that perform metering and usage related operations.
 * @module Metering
 */
const Metering = () => {
  let instance = null;
  const urlBuilder = UrlBuilder.getInstance();
  const logger = Logger.getInstance();

  let interval;
  const meteringInterval = 600000; // in milliseconds (equal to 10 mins)

  /**
   * Create the Metering instance
   * @method module:Metering#createInstance
   */
  function createInstance() {
    let meteringFeatureData = {};
    let meteringPropertyData = {};

    /**
     * Add the Metering data values
     *
     * @method module:Metering#addMetering
     * @param {string} guid - GUID of the App Configuration service.
     * @param {string} environmentId - Id of the environment created in App Configuration service instance.
     * @param {string} collectionId - Id of the collection created in App Configuration service instance.
     * @param {string} entityId - Id of the Entity.
     * @param {string} segmentId - Id of the Segment.
     * @param {string} featureId - Id of the Feature.
     * @param {string} propertyId - Id of the Property.
     */
    function addMetering(guid,
                        environmentId,
                        collectionId,
                        entityId,
                        segmentId,
                        featureId,
                        propertyId) {
      const time = `${(new Date()).toISOString().split('.')[0]}Z`;
      let hasData = false;
      const FeatureJson = {
        count: 1,
        evaluation_time: time,
      };

      const meteringData = featureId !== null ? meteringFeatureData : meteringPropertyData;
      const modifyKey = featureId !== null ? featureId : propertyId;

      if (Object.prototype.hasOwnProperty.call(meteringData, guid)) {
        if (Object.prototype.hasOwnProperty.call(meteringData[guid], environmentId)) {
          if (Object.prototype.hasOwnProperty.call(meteringData[guid][environmentId], collectionId)) {
            if (Object.prototype.hasOwnProperty.call(meteringData[guid][environmentId][collectionId], modifyKey)) {
              if (Object.prototype.hasOwnProperty.call(meteringData[guid][environmentId][collectionId][modifyKey], entityId)) {
                if (Object.prototype.hasOwnProperty.call(meteringData[guid][environmentId][collectionId][modifyKey][entityId], segmentId)) {
                  hasData = true;
                  meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId].evaluation_time = time;
                  meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId].count += 1;
                }
              } else {
                meteringData[guid][environmentId][collectionId][modifyKey][entityId] = {};
                meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = {};
              }
            } else {
              meteringData[guid][environmentId][collectionId][modifyKey] = {};
              meteringData[guid][environmentId][collectionId][modifyKey][entityId] = {};
              meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = {};
            }
          } else {
            meteringData[guid][environmentId][collectionId] = {};
            meteringData[guid][environmentId][collectionId][modifyKey] = {};
            meteringData[guid][environmentId][collectionId][modifyKey][entityId] = {};
            meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = {};
          }
        } else {
          meteringData[guid][environmentId] = {};
          meteringData[guid][environmentId][collectionId] = {};
          meteringData[guid][environmentId][collectionId][modifyKey] = {};
          meteringData[guid][environmentId][collectionId][modifyKey][entityId] = {};
          meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = {};
        }
      } else {
        meteringData[guid] = {};
        meteringData[guid][environmentId] = {};
        meteringData[guid][environmentId][collectionId] = {};
        meteringData[guid][environmentId][collectionId][modifyKey] = {};
        meteringData[guid][environmentId][collectionId][modifyKey][entityId] = {};
        meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = {};
      }
      if (!hasData) {
        meteringData[guid][environmentId][collectionId][modifyKey][entityId][segmentId] = FeatureJson;
      }
    }

    function buildRequestBody(sendMeteringData, result, key) {
      Object.keys(sendMeteringData).forEach((guid) => {
        if (!Object.prototype.hasOwnProperty.call(result, guid)) {
          result[guid] = [];
        }
        Object.keys(sendMeteringData[guid]).forEach((environmentId) => {
          Object.keys(sendMeteringData[guid][environmentId]).forEach((collectionId) => {
            const collections = {
              collection_id: collectionId,
              environment_id: environmentId,
              usages: [],
            };
            const features = sendMeteringData[guid][environmentId][collectionId];
            Object.keys(features).forEach((featureId) => {
              Object.keys(features[featureId]).forEach((entityId) => {
                Object.keys(features[featureId][entityId]).forEach((segmentId) => {
                  const usages = {
                    [key]: featureId,
                    entity_id: entityId === Constants.DEFAULT_ENTITY_ID ? null : entityId,
                    segment_id: segmentId === Constants.DEFAULT_SEGMENT_ID ? null : segmentId,
                    evaluation_time: features[featureId][entityId][segmentId].evaluation_time,
                    count: features[featureId][entityId][segmentId].count,
                  };
                  collections.usages.push(usages);
                });
              });
            });
            result[guid].push(collections);
          });
        });
      });
    }

    async function sendToServer(guid, data) {
      const parameters = {
        options: {
          url: `/apprapp/events/v1/instances/${guid}/usage`,
          method: 'POST',
          body: data,
        },
        defaultOptions: {
          serviceUrl: urlBuilder.getBaseServiceUrl(),
          headers: getHeaders(true),
        },
      };

      // Per-call retry state (isolated to this payload)
      const capMs = computeCapDelayMs();
      let attempt = 0;

      const attemptSend = async () => {
        let _response;
        try {
          _response = await getBaseServiceClient().createRequest(parameters);
          if (_response && _response.status === Constants.STATUS_CODE_ACCEPTED) {
            logger.log(Constants.SUCCESSFULLY_POSTED_METERING_DATA);
          }
        } catch (_exception) {
          const status = _exception?.status;
          const retryable = (status >= 500 && status <= 599) || status === 429 || status === undefined;
          logger.error(`${Constants.ERROR_POSTING_METERING_DATA}. ${_exception?.message || _exception}`);

          if (!retryable) {
            // 4xx (except 429) — do not retry
            return;
          }

          // Exponential backoff with jitter until capped at ~1.x hours, then constant
          const delayMs = computeNextDelayMs(attempt, capMs);
          const delayMin = (delayMs / 60000).toFixed(2);
          logger.warning(`Retrying metering POST in ${delayMin} minutes (attempt #${attempt + 1}, cap ${(capMs / 60000).toFixed(2)} minutes).`);
          attempt += 1;

          setTimeout(() => {
            attemptSend().catch((e) => {
              logger.error(`Metering retry attempt failed: ${e?.message || e}`);
            });
          }, delayMs);
        }
      };

      await attemptSend();
    }

    function sendSplitMetering(guid, data, count) {
      let lim = 0;

      const subUsagesArray = data.usages;

      while (lim < count) {
        const endIndex = lim + Constants.DEFAULT_USAGE_LIMIT >= count ? count : lim + Constants.DEFAULT_USAGE_LIMIT;
        const collectionsMap = {
          collection_id: data.collection_id,
          environment_id: data.environment_id,
          usages: [],
        };
        for (let i = lim; i < endIndex; i += 1) {
          collectionsMap.usages.push(subUsagesArray[i]);
        }
        sendToServer(guid, collectionsMap);
        lim += Constants.DEFAULT_USAGE_LIMIT;
      }
    }

    /**
     * Send the metering data to server
     *
     * @method module:Metering#sendMetering
     * @param {string} guid - GUID of the App Configuration service.
     * @param {object} data - The data to send
     * @returns {*}
     */
    function sendMetering() {
      const sendFeatureData = meteringFeatureData;
      const sendPropertyData = meteringPropertyData;
      meteringFeatureData = {};
      meteringPropertyData = {};

      if ((Object.keys(sendFeatureData).length) <= 0 && (Object.keys(sendPropertyData).length <= 0)) {
        return;
      }

      const result = {};

      if (Object.keys(sendFeatureData).length > 0) {
        buildRequestBody(sendFeatureData, result, 'feature_id');
      }

      if (Object.keys(sendPropertyData).length > 0) {
        buildRequestBody(sendPropertyData, result, 'property_id');
      }

      Object.keys(result).forEach((guid) => {
        result[guid].forEach((data) => {
          const count = data.usages.length;
          if (count > Constants.DEFAULT_USAGE_LIMIT) {
            sendSplitMetering(guid, data, count);
          } else {
            sendToServer(guid, data);
          }
        });
      });
    }

    if (interval) {
      clearInterval(interval);
    }

    /**
     * Initiate a setInterval() to send the Metering data to server every 10 minutes
     */
    interval = setInterval(() => {
      sendMetering();
    }, meteringInterval);

    return {
      addMetering,
      sendMetering,
    };
  }

  // Return for Metering
  return {
    getInstance: () => {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    },
    currentInstance: () => {
      if (instance) {
        return instance;
      }
      throw Error(' Initialize object first');
    },
  };
};

const handler = Metering();
module.exports = {
  Metering: handler,
};
