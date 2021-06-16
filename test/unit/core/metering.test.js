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

const { Metering } = require('../../../lib/core/Metering');

describe('metering', () => {
  jest.setTimeout(30000);
  const metering = Metering.getInstance();

  test('add metering', async () => {
    await metering.addMetering('guid1', 'environmentId1', 'collectionId1', 'entityId1', 'segmentId1', 'featureId1');
    await metering.addMetering('guid1', 'environmentId1', 'collectionId1', 'entityId1', 'segmentId1', 'featureId1');
    await metering.addMetering('guid1', 'environmentId2', 'collectionId1', 'entityId1', 'segmentId1', 'featureId1');
    await metering.addMetering('guid1', 'environmentId1', 'collectionId2', 'entityId1', 'segmentId1', 'featureId1');
    await metering.addMetering('guid1', 'environmentId2', 'collectionId1', 'entityId2', 'segmentId1', 'featureId1');
    await metering.addMetering('guid1', 'environmentId2', 'collectionId1', 'entityId2', 'segmentId1', 'featureId2');
    await metering.addMetering('guid1', 'environmentId2', 'collectionId2', 'entityId1', 'segmentId2', 'propertyId1');
    await metering.addMetering('guid1', 'environmentId2', 'collectionId2', 'entityId1', 'segmentId2', 'propertyId2');
  });

  test('send metering', async () => {
    await metering.sendMetering();
  });
  jest.clearAllTimers();
});
