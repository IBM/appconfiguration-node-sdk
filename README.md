# IBM Cloud App Configuration Node server SDK

IBM Cloud App Configuration SDK is used to perform feature flag and property evaluation based on the configuration on
IBM Cloud App Configuration service.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Import the SDK](#import-the-sdk)
- [Initialize SDK](#initialize-sdk)
- [License](#license)

## Overview

IBM Cloud App Configuration is a centralized feature management and configuration service
on [IBM Cloud](https://www.cloud.ibm.com) for use with web and mobile applications, microservices, and distributed
environments.

Instrument your applications with App Configuration Node SDK, and use the App Configuration dashboard, CLI or API to
define feature flags or properties, organized into collections and targeted to segments. Toggle feature flag states in
the cloud to activate or deactivate features in your application or environment, when required. You can also manage the
properties for distributed applications centrally.

## Installation

Installation is done using the `npm install` command.

```bash
$ npm install ibm-appconfiguration-node-sdk@latest
```

## Import the SDK

To import the module

```JS
const {
  AppConfiguration
} = require('ibm-appconfiguration-node-sdk');
```

## Initialize SDK

Initialize the sdk to connect with your App Configuration service instance.

```JS
const region = AppConfiguration.REGION_US_SOUTH;
const guid = '<guid>';
const apikey = '<apikey>';

const collectionId = 'airlines-webapp';
const environmentId = 'dev';

const appConfigClient = AppConfiguration.getInstance();
appConfigClient.init(region, guid, apikey);
appConfigClient.setContext(collectionId, environmentId);
```
:red_circle: **Important** :red_circle:

The **`init()`** and **`setContext()`** are the initialisation methods and should be invoked **only once** using appConfigClient. The appConfigClient, once initialised, can be obtained across modules using **`AppConfiguration.getInstance()`**.  [See this example below](#fetching-the-appconfigclient-across-other-modules).

- region : Region name where the App Configuration service instance is created. Use
    - `AppConfiguration.REGION_US_SOUTH` for Dallas
    - `AppConfiguration.REGION_EU_GB` for London
    - `AppConfiguration.REGION_AU_SYD` for Sydney
    - `AppConfiguration.REGION_US_EAST` for Washington DC
- guid : Instance Id of the App Configuration service. Obtain it from the service credentials section of the App
  Configuration dashboard.
- apikey : ApiKey of the App Configuration service. Obtain it from the service credentials section of the App
  Configuration dashboard.
- collectionId: Id of the collection created in App Configuration service instance under the **Collections** section.
- environmentId: Id of the environment created in App Configuration service instance under the **Environments** section.

### (Optional) 
In order for your application and SDK to continue its operations even during the unlikely scenario of App Configuration service across your application restarts, you can configure the SDK to work using a persistent cache. The SDK uses the persistent cache to store the App Configuration data that will be available across your application restarts.
```javascript
// 1. default (without persistent cache)
appConfigClient.setContext(collectionId, environmentId)

// 2. optional (with persistent cache)
appConfigClient.setContext(collectionId, environmentId, {
  persistentCacheDirectory: '/var/lib/docker/volumes/'
})
```
* persistentCacheDirectory: Absolute path to a directory which has read & write permission for the user. The SDK will create a file - `appconfiguration.json` in the specified directory, and it will be used as the persistent cache to store the App Configuration service information.

When persistent cache is enabled, the SDK will keep the last known good configuration at the persistent cache. In the case of App Configuration server being unreachable, the latest configurations at the persistent cache is loaded to the application to continue working.

Please ensure that the cache file is not lost or deleted in any case. For example, consider the case when a kubernetes pod is restarted and the cache file (appconfiguration.json) was stored in ephemeral volume of the pod. As pod gets restarted, kubernetes destroys the ephermal volume in the pod, as a result the cache file gets deleted. So, make sure that the cache file created by the SDK is always stored in persistent volume by providing the correct absolute path of the persistent directory.

### (Optional)
The SDK is also designed to serve configurations, perform feature flag & property evaluations without being connected to App Configuration service.
```javascript
appConfigClient.setContext(collectionId, environmentId, {
  bootstrapFile: 'saflights/flights.json',
  liveConfigUpdateEnabled: false
})
```

* bootstrapFile: Absolute path of the JSON file, which contains configuration details. Make sure to provide a proper JSON file. You can generate this file using `ibmcloud ac config` command of the IBM Cloud App Configuration CLI.
* liveConfigUpdateEnabled: Live configuration update from the server. Set this value to `false` if the new configuration values shouldn't be fetched from the server.

## Get single feature

```javascript
const feature = appConfigClient.getFeature('online-check-in'); //feature can be null incase of an invalid feature id

if (feature) {
  console.log(`Feature Name ${feature.getFeatureName()} `);
  console.log(`Feature Id ${feature.getFeatureId()} `);
  console.log(`Feature Type ${feature.getFeatureDataType()} `);
  if (feature.isEnabled()) {
    // feature flag is enabled
  } else {
    // feature flag is disabled
  }
}
```

## Get all features

```javascript
const features = appConfigClient.getFeatures();

const feature = features['online-check-in'];

if (feature) {
  console.log(`Feature Name ${feature.getFeatureName()} `);
  console.log(`Feature Id ${feature.getFeatureId()} `);
  console.log(`Feature Type ${feature.getFeatureDataType()} `);
  console.log(`Feature is enabled ${feature.isEnabled()} `);
}
```

## Evaluate a feature

Use the `feature.getCurrentValue(entityId, entityAttributes)` method to evaluate the value of the feature flag. Pass an
unique entityId as the parameter to perform the feature flag evaluation.

### Usage

- If the feature flag is configured with segments in the App Configuration service, provide a json object
  as `entityAttributes` parameter to this method.

    ```javascript
    const entityId = 'john_doe';
    const entityAttributes = {
      city: 'Bangalore',
      country: 'India',
    };

    const featureValue = feature.getCurrentValue(entityId, entityAttributes);
    ```
- If the feature flag is not targeted to any segments and the feature flag is **turned ON** this method returns the
  feature **enabled value**. And when the feature flag is **turned OFF** this method returns the feature **disabled
  value**.

    ```javascript
    const entityId = 'john_doe';
    const featureValue = feature.getCurrentValue(entityId);
    ```

## Get single property

```javascript
const property = appConfigClient.getProperty('check-in-charges'); //property can be null incase of an invalid property id

if (property) {
  console.log(`Property Name ${property.getPropertyName()} `);
  console.log(`Property Id ${property.getPropertyId()} `);
  console.log(`Property Type ${property.getPropertyDataType()} `);
}
```

## Get all properties

```javascript
const properties = appConfigClient.getProperties();

const property = properties['check-in-charges'];

if (property) {
  console.log(`Property Name ${property.getPropertyName()} `);
  console.log(`Property Id ${property.getPropertyId()} `);
  console.log(`Property Type ${property.getPropertyDataType()} `);
}
```

## Evaluate a property

Use the `property.getCurrentValue(entityId, entityAttributes)` method to evaluate the value of the property. Pass an
unique entityId as the parameter to perform the property evaluation.

### Usage

- If the property is configured with segments in the App Configuration service, provide a json object
  as `entityAttributes` parameter to this method.

    ```javascript
    const entityId = 'john_doe';
    const entityAttributes = {
      city: 'Bangalore',
      country: 'India',
    };

    const propertyValue = property.getCurrentValue(entityId, entityAttributes);
    ```
- If the property is not targeted to any segments this method returns the property value.

    ```javascript
    const entityId = 'john_doe';
    const propertyValue = property.getCurrentValue(entityId);
    ```

## Fetching the appConfigClient across other modules

Once the SDK is initialized, the appConfigClient  can be obtained across other modules as shown below:

```JS
// **other modules**

const { AppConfiguration } = require('ibm-appconfiguration-node-sdk');
const appConfigClient = AppConfiguration.getInstance();

feature = appConfigClient.getFeature('online-check-in');
const enabled = feature.isEnabled();
const featureValue = feature.getCurrentValue(entityId, entityAttributes)
```

## Supported Data types

App Configuration service allows to configure the feature flag and properties in the following data types : Boolean,
Numeric, String. The String data type can be of the format of a text string , JSON or YAML. The SDK processes each
format accordingly as shown in the below table.

<details><summary>View Table</summary>

| **Feature or Property value**                                                                          | **DataType** | **DataFormat** | **Type of data returned <br> by `getCurrentValue()`** | **Example output**                                                   |
| ------------------------------------------------------------------------------------------------------ | ------------ | -------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| `true`                                                                                                 | BOOLEAN      | not applicable | `boolean`                                                | `true`                                                               |
| `25`                                                                                                   | NUMERIC      | not applicable | `number`                                             | `25`                                                                 |
| "a string text"                                                                                        | STRING       | TEXT           | `string`                                              | `a string text`                                                      |
| <pre>{<br>  "firefox": {<br>    "name": "Firefox",<br>    "pref_url": "about:config"<br>  }<br>}</pre> | STRING       | JSON           | `JSON object`                              | `{"firefox":{"name":"Firefox","pref_url":"about:config"}}` |
| <pre>men:<br>  - John Smith<br>  - Bill Jones<br>women:<br>  - Mary Smith<br>  - Susan Williams</pre>  | STRING       | YAML           | `string`                              | `"men:\n  - John Smith\n  - Bill Jones\nwomen:\n  - Mary Smith\n  - Susan Williams"` |
</details>

<details><summary>Feature flag</summary>

  ```javascript
  const feature = appConfigClient.getFeature('json-feature');
  feature.getFeatureDataType(); // STRING
  feature.getFeatureDataFormat(); // JSON

  // Example (traversing the returned JSON)
  let result = feature.getCurrentValue(entityId, entityAttributes);
  console.log(result.key) // prints the value of the key

  const feature = appConfigClient.getFeature('yaml-feature');
  feature.getFeatureDataType(); // STRING
  feature.getFeatureDataFormat(); // YAML
  feature.getCurrentValue(entityId, entityAttributes); // returns the stringified yaml (check above table)
  ```
</details>
<details><summary>Property</summary>

  ```javascript
  const property = appConfigClient.getProperty('json-property');
  property.getPropertyDataType(); // STRING
  property.getPropertyDataFormat(); // JSON

  // Example (traversing the returned JSON)
  let result = property.getCurrentValue(entityId, entityAttributes);
  console.log(result.key) // prints the value of the key

  const property = appConfigClient.getProperty('yaml-property');
  property.getPropertyDataType(); // STRING
  property.getPropertyDataFormat(); // YAML
  property.getCurrentValue(entityId, entityAttributes); // returns the stringified yaml (check above table)
  ```
</details>

## Set listener for feature and property data changes

The SDK provides an event-based mechanism to notify you in real-time when feature flag's or property's configuration changes. You can listen to `configurationUpdate` event using the same appConfigClient.

```JS
appConfigClient.emitter.on('configurationUpdate', () => {
  // **add your code**
  // To find the effect of any configuration changes, you can call the feature or property related methods

  // feature = appConfigClient.getFeature('online-check-in');
  // newValue = feature.getCurrentValue(entityId, entityAttributes);
});
```

## Enable debugger (optional)

Use this method to enable/disable the logging in SDK.

```javascript
appConfigClient.setDebug(true);
```

## Examples

Try [this](https://github.com/IBM/appconfiguration-node-sdk/tree/master/examples) sample application in the examples
folder to learn more about feature and property evaluation.

## License

This project is released under the Apache 2.0 license. The license's full text can be found
in [LICENSE](https://github.com/IBM/appconfiguration-node-sdk/blob/master/LICENSE)
