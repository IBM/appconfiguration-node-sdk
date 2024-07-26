/**
 * Copyright 2024 IBM Corp. All Rights Reserved.
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
const { sliceArray } = require('../configurations/internal/Utils');

const MetricEvents = () => {
  let instance = null;
  const urlBuilder = UrlBuilder.getInstance();
  const logger = Logger.getInstance();

  let interval;
  const sendInterval = 60000; // in milliseconds (equal to 1 min)

  function createInstance() {

    let usages = [];
    let _guid;
    let _environmentId;

    function init(guid, environmentId) {
      _guid = guid;
      _environmentId = environmentId;
    }

    function addEvents(usage) {
      const time = `${(new Date()).toISOString().split('.')[0]}Z`;
      usage.timestamp = time;
      usages.push(usage);
    }

    async function sendToServer(guid, data) {
      const parameters = {
        options: {
          url: `/apprapp/metrics/v1/instances/${guid}/analytics`,
          method: 'POST',
          body: data,
        },
        defaultOptions: {
          serviceUrl: urlBuilder.getBaseServiceUrl(),
          headers: getHeaders(true),
        },
      };

      let _response;
      try {
        _response = await getBaseServiceClient().createRequest(parameters);
        if (_response && _response.status === Constants.STATUS_CODE_ACCEPTED) {
          logger.log(Constants.SUCCESSFULLY_POSTED_EXPERIMENT_METRIC_EVENTS);
        }
      } catch (_exception) {
        logger.error(`${Constants.ERROR_POSTING_EXPERIMENT_METRIC_EVENTS}. ${_exception}`);
        if ((_exception.status >= 500 && _exception.status <= 599) || (_exception.status === 429) || (_exception.status === undefined)) {
          setTimeout(() => { sendToServer(guid, data); }, sendInterval);
        }
      }
    }

    function sendEvents() {
      const metricsUsages = usages;
      usages = [];
      if (metricsUsages.length <= 0) {
        return;
      }
      const result = sliceArray(metricsUsages, Constants.DEFAULT_USAGE_LIMIT);
      for (let i = 0; i < result.length; i += 1) {
        const data = {
          type: 'metric_event',
          environment_id: _environmentId,
          usages: result[i],
        }
        sendToServer(_guid, data);
      }
    }

    if (interval) {
      clearInterval(interval);
    }

    interval = setInterval(() => {
      sendEvents();
    }, sendInterval);

    return {
      init,
      addEvents,
    };
  }

  // Return for MetricEvents
  return {
    getInstance: () => {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    },
  };
};

const handler = MetricEvents();
module.exports = {
  MetricEvents: handler,
};
