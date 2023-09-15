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

const { AppConfiguration } = require('../../lib/AppConfiguration');

function initializeAppConfiguration() {
  return AppConfiguration.getInstance();
}

describe('singleton check', () => {
  const client1 = initializeAppConfiguration();
  const client2 = initializeAppConfiguration();
  test('singleton check 1', () => {
    expect(client1).toBe(client2);
  });
  test('singleton check 2', () => {
    expect(client1).toBe(AppConfiguration.currentInstance());
  });
});

describe('feature & property methods before initialization', () => {
  const client = initializeAppConfiguration();
  test('getFeature', () => {
    expect(client.getFeature('feature_id')).toBe(null);
  });
  test('getFeatures', () => {
    expect(client.getFeatures()).toBe(null);
  });
  test('getProperty', () => {
    expect(client.getProperty('property_id')).toBe(null);
  });
  test('getProperties', () => {
    expect(client.getProperties()).toBe(null);
  });
  test('getSecret', () => {
    expect(client.getSecret('property_id', null)).toBe(null);
  });
});

describe('init method', () => {
  let client;
  test('no region', () => {
    client = initializeAppConfiguration();
    expect(() => { client.init(null, 'guid_value', 'apikey_value'); }).toThrow(Error);
    client = null;
  });
  test('no guid', () => {
    client = initializeAppConfiguration();
    expect(() => { client.init('region_value', null, 'apikey_value'); }).toThrow(Error);
    client = null;
  });
  test('no apikey', () => {
    client = initializeAppConfiguration();
    expect(() => { client.init('region_value', 'guid_value', null); }).toThrow(Error);
    client = null;
  });
});

describe('setContext method', () => {
  let client;
  test('setContext without init method initialised', async () => {
    client = initializeAppConfiguration();
    await expect(client.setContext(null)).rejects.toThrow();
    client = null;
  });

  test('no collection id', async () => {
    client = initializeAppConfiguration();
    client.init('region_value', 'guid_value', 'apikey_value');
    await expect(client.setContext(null, 'environment_id')).rejects.toThrow();
    client = null;
  });

  test('no environment id', async () => {
    client = initializeAppConfiguration();
    client.init('region_value', 'guid_value', 'apikey_value');
    await expect(client.setContext('collection_id', null)).rejects.toThrow();
    client = null;
  });

  test('test setContext when persistent cache directory is not string', async () => {
    client = initializeAppConfiguration();
    client.init('region_value', 'guid_value', 'apikey_value');
    await expect(client.setContext('collection_id', 'environment_id', {
      persistentCacheDirectory: true,
    })).rejects.toThrow(Error);
    client = null;
  });

  test('test setContext when bootstrap file is not string', async () => {
    client = initializeAppConfiguration();
    client.init('region_value', 'guid_value', 'apikey_value');
    await expect(client.setContext('collection_id', 'environment_id', {
      bootstrapFile: 0,
    })).rejects.toThrow(Error);
    client = null;
  });

  test('test setContext when liveConfigUpdateEnabled is not boolean', async () => {
    client = initializeAppConfiguration();
    client.init('region_value', 'guid_value', 'apikey_value');
    await expect(client.setContext('collection_id', 'environment_id', {
      liveConfigUpdateEnabled: 0,
    })).rejects.toThrow(Error);
    client = null;
  });

  test('test when persistent cache is enabled', async () => {
    client = initializeAppConfiguration();
    client.init('region_value', 'guid_value', 'apikey_value');
    await expect(client.setContext('collection_id', 'environment_id', {
      persistentCacheDirectory: __dirname,
    })).rejects.toThrow(Error);
    client = null;
  });

  test('test in-memory cache only', async () => {
    client = initializeAppConfiguration();
    client.setDebug(true);
    client.init('region_value', 'guid_value', 'apikey_value');
    await expect(client.setContext('collection_id', 'environment_id')).resolves.toBeUndefined();
    client = null;
  });
  jest.clearAllTimers();
});

describe('features & properties get methods', () => {
  const client = initializeAppConfiguration();
  test('getFeature', () => {
    expect(client.getFeature('feature_id')).toBe(null);
  });
  test('getFeatures', () => {
    expect(client.getFeatures()).toMatchObject({});
  });
  test('getProperty', () => {
    expect(client.getProperty('property_id')).toBe(null);
  });
  test('getProperties', () => {
    expect(client.getProperties()).toMatchObject({});
  });
  test('getSecret', () => {
    expect(client.getSecret('property_id', null)).toBe(null);
  });
});
