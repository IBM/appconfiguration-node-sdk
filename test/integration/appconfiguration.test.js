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

require('dotenv').config();
const { AppConfiguration } = require('../../lib/AppConfiguration');

// testcase timeout value (20s).
const timeout = 30000;

describe('App Configuration', () => {
  test('integration test', (done) => {
    const region = process.env.REGION;
    const guid = process.env.GUID;
    const apikey = process.env.APIKEY;
    const collectionId = process.env.COLLECTION_ID;
    const environmentId = process.env.ENVIRONMENT_ID;

    const client = AppConfiguration.getInstance();
    expect(client).not.toBeNull();

    jest.setTimeout(timeout);

    client.setDebug(true);
    client.init(region, guid, apikey);
    client.setContext(collectionId, environmentId);

    client.emitter.on('configurationUpdate', () => {
      const features = client.getFeatures();
      const feature = client.getFeature('defaultfeature');
      expect(Object.keys(features).length).toEqual(3);
      expect(feature).toBe('defaultfeature');

      const properties = client.getProperties();
      const property = client.getProperty('numericproperty');
      expect(Object.keys(properties).length).toEqual(1);
      expect(property).toBe('numericproperty');

      const entityId = 'developer_entity';
      let entityAttributes = {
        email: 'tommartin@company.dev',
      };
      let result = feature.getCurrentValue(entityId, entityAttributes);
      expect(result.value).toBe('Welcome');
      expect(typeof result.isEnabled === 'boolean').toBeTruthy();

      entityAttributes = {
        email: 'laila@company.test',
      };
      result = feature.getCurrentValue(entityId, entityAttributes);
      expect(result.value).toBe('Hello');
      expect(typeof result.isEnabled === 'boolean').toBeTruthy();

      entityAttributes = {
        email: 'tommartin@tester.com',
      };
      result = property.getCurrentValue(entityId, entityAttributes);
      expect(result.value).toBe(81);

      entityAttributes = {
        email: 'laila@company.test',
      };
      result = property.getCurrentValue(entityId, entityAttributes);
      expect(result.value).toBe(25);

      done();
    });
  });
});
