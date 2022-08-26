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

> :warning: In version v0.4.0 we have made changes to the return value of `getCurrentValue` method. If you were already an existing user please read this [migration guide](docs/v0.3-v0.4.md) before you upgrade the SDK to latest.
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
const feature = appConfigClient.getFeature('online-check-in'); // feature can be null incase of an invalid feature id

if (feature !== null) {
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

if (feature !== null) {
  console.log(`Feature Name ${feature.getFeatureName()} `);
  console.log(`Feature Id ${feature.getFeatureId()} `);
  console.log(`Feature Type ${feature.getFeatureDataType()} `);
  console.log(`Is feature enabled? ${feature.isEnabled()} `);
}
```

## Evaluate a feature

Use the `feature.getCurrentValue(entityId, entityAttributes)` method to evaluate the value of the feature flag. This method returns an JSON object containing evaluated value, feature flag enabled status & evaluation details.

```javascript
const entityId = 'john_doe';
const entityAttributes = {
  city: 'Bangalore',
  country: 'India',
};

const result = feature.getCurrentValue(entityId, entityAttributes);
console.log(result.value); // Evaluated value of the feature flag. The type of evaluated value will match the type of feature flag (Boolean, String, Numeric).
console.log(result.isEnabled); // enabled status.
console.log(result.details); // a JSON object containing detailed information of the evaluation. See below

// the `result.details` will have the following
console.log(result.details.valueType); // a string value. Example: DISABLED_VALUE
console.log(result.details.reason); // a string value. Example: Disabled value of the feature flag since the feature flag is disabled.
console.log(result.details.segmentName); // (only if applicable, else it is undefined) a string value containing the segment name for which the feature flag was evaluated.
console.log(result.details.rolloutPercentageApplied); // (only if applicable, else it is undefined) a boolean value. True if the entityId was part of the rollout percentage evaluation, false otherwise.
console.log(result.details.errorType); // (only if applicable, else it is undefined) contains the error.message if any error was occured during the evaluation.
```
- entityId: Id of the Entity. This will be a string identifier related to the Entity against which the feature is evaluated. For example, an entity might be an instance of an app that runs on a mobile device, a microservice that runs on the cloud, or a component of infrastructure that runs that microservice. For any entity to interact with App Configuration, it must provide a unique entity ID.
- entityAttributes: A JSON object consisting of the attribute name and their values that defines the specified entity. This is an optional parameter if the feature flag is not configured with any targeting definition. If the targeting is configured, then entityAttributes should be provided for the rule evaluation. An attribute is a parameter that is used to define a segment. The SDK uses the attribute values to determine if the specified entity satisfies the targeting rules, and returns the appropriate feature flag value.

## Get single property

```javascript
const property = appConfigClient.getProperty('check-in-charges'); // property can be null incase of an invalid property id

if (property !== null) {
  console.log(`Property Name ${property.getPropertyName()} `);
  console.log(`Property Id ${property.getPropertyId()} `);
  console.log(`Property Type ${property.getPropertyDataType()} `);
}
```

## Get all properties

```javascript
const properties = appConfigClient.getProperties();
const property = properties['check-in-charges'];

if (property !== null) {
  console.log(`Property Name ${property.getPropertyName()} `);
  console.log(`Property Id ${property.getPropertyId()} `);
  console.log(`Property Type ${property.getPropertyDataType()} `);
}
```

## Evaluate a property

Use the `property.getCurrentValue(entityId, entityAttributes)` method to evaluate the value of the property. This method returns an JSON object containing evaluated value & evaluation details.
```javascript
const entityId = 'john_doe';
const entityAttributes = {
  city: 'Bangalore',
  country: 'India',
};

const result = property.getCurrentValue(entityId, entityAttributes);
console.log(result.value); // Evaluated value of the property. The type of evaluated value will match the type of property (Boolean, String, Numeric).
console.log(result.details); // a JSON object containing detailed information of the evaluation. See below

// the `result.details` will have the following
console.log(result.details.valueType); // a string value. Example: DEFAULT_VALUE
console.log(result.details.reason); // a string value. Example: Default value of the property.
console.log(result.details.segmentName); // (only if applicable, else it is undefined) a string value containing the segment name for which the property was evaluated.
console.log(result.details.errorType); // (only if applicable, else it is undefined) contains the error.message if any error was occured during the evaluation.
```
- entityId: Id of the Entity. This will be a string identifier related to the Entity against which the property is evaluated. For example, an entity might be an instance of an app that runs on a mobile device, a microservice that runs on the cloud, or a component of infrastructure that runs that microservice. For any entity to interact with App Configuration, it must provide a unique entity ID.
- entityAttributes: A JSON object consisting of the attribute name and their values that defines the specified entity. This is an optional parameter if the property is not configured with any targeting definition. If the targeting is configured, then entityAttributes should be provided for the rule evaluation. An attribute is a parameter that is used to define a segment. The SDK uses the attribute values to determine if the specified entity satisfies the targeting rules, and returns the appropriate property value.

## Get secret property

Explicit method for getting the secret references stored in App Configuration.

```js
const secretPropertyObject = appConfigClient.getSecret(propertyId, secretsManagerObject);
```

- propertyId: propertyId is the unique string identifier, using this we will be able to fetch the property which will provide the necessary data to fetch the evaluated secret.
- secretsManagerObject: secretsManagerObject is an Secret Manager client object which will be used for retrieve the actual secret during the secret property evaluation. Refer [this doc](https://cloud.ibm.com/apidocs/secrets-manager?code=node) on how to create a secret manager client object.


## Evaluate a secret property

- Use the `secretPropertyObject.getCurrentValue(entityId, entityAttributes)` method to evaluate the value of the secret property.

Note that the output of this method call is different from `getCurrentValue` invoked using feature & property objects. This method returns a Promise that either resolves with the response from the secret manager or rejects with an Error. The resolved value is the actual secret value of the evaluated secret reference. The response contains the body, the headers, the status code, and the status text. If using async/await, use try/catch for handling errors.

```js
const entityId = 'john_doe';
const entityAttributes = {
  city: 'Bangalore',
  country: 'India',
};
try {
  const res = await secretPropertyObject.getCurrentValue(entityId, entityAttributes);
  console.log(JSON.stringify(res, null, 2)); // view entire response.
  console.log('Resulting secret:\n', res.result.resources[0].secret_data.payload); // the actual secret value.
} catch (err) {
  // handle the error
}
```

- entityId: entityId is a string identifier related to the Entity against which the property will be evaluated. For example, an entity might be an instance of an app that runs on a mobile device, a microservice that runs on the cloud, or a component of infrastructure that runs that microservice. For any entity to interact with App Configuration, it must provide a unique entity ID.

- entityAttributes: A JSON object consisting of the attribute name and their values that defines the specified entity. This is an optional parameter if the property is not configured with any targeting definition. If the targeting is configured, then entityAttributes should be provided for the rule evaluation. An attribute is a parameter that is used to define a segment. The SDK uses the attribute values to determine if the specified entity satisfies the targeting rules, and returns the appropriate value.

## Fetching the appConfigClient across other modules

Once the SDK is initialized, the appConfigClient can be obtained across other modules as shown below:

```javascript
// **other modules**

const { AppConfiguration } = require('ibm-appconfiguration-node-sdk');
const appConfigClient = AppConfiguration.getInstance();

feature = appConfigClient.getFeature('online-check-in');
const enabled = feature.isEnabled();
const result = feature.getCurrentValue(entityId, entityAttributes)
```

## Supported Data types

App Configuration service allows to configure the feature flag and properties in the following data types : Boolean,
Numeric, SecretRef, String. The String data type can be of the format of a text string , JSON or YAML. The SDK processes each
format accordingly as shown in the below table.

<details><summary>View Table</summary>

| **Feature or Property value**                                                                          | **DataType** | **DataFormat** | **Type of data returned <br> by `getCurrentValue().value`** | **Example output**                                                   |
| ------------------------------------------------------------------------------------------------------ | ------------ | -------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| `true`                                                                                                 | BOOLEAN      | not applicable | `boolean`                                                | `true`                                                               |
| `25`                                                                                                   | NUMERIC      | not applicable | `number`                                             | `25`                                                                 |
| "a string text"                                                                                        | STRING       | TEXT           | `string`                                              | `a string text`                                                      |
| <pre>{<br>  "firefox": {<br>    "name": "Firefox",<br>    "pref_url": "about:config"<br>  }<br>}</pre> | STRING       | JSON           | `JSON object`                              | `{"firefox":{"name":"Firefox","pref_url":"about:config"}}` |
| <pre>men:<br>  - John Smith<br>  - Bill Jones<br>women:<br>  - Mary Smith<br>  - Susan Williams</pre>  | STRING       | YAML           | `string`                              | `"men:\n  - John Smith\n  - Bill Jones\nwomen:\n  - Mary Smith\n  - Susan Williams"` |

For property of type secret reference, refer to readme section [evaluate-a-secret-property](#evaluate-a-secret-property)
</details>

<details><summary>Feature flag</summary>

  ```javascript
  const feature = appConfigClient.getFeature('json-feature');
  feature.getFeatureDataType(); // STRING
  feature.getFeatureDataFormat(); // JSON

  // Example (traversing the returned JSON)
  let result = feature.getCurrentValue(entityId, entityAttributes);
  console.log(result.value.key) // prints the value of the key

  const feature = appConfigClient.getFeature('yaml-feature');
  feature.getFeatureDataType(); // STRING
  feature.getFeatureDataFormat(); // YAML
  feature.getCurrentValue(entityId, entityAttributes);
  ```
</details>
<details><summary>Property</summary>

  ```javascript
  const property = appConfigClient.getProperty('json-property');
  property.getPropertyDataType(); // STRING
  property.getPropertyDataFormat(); // JSON

  // Example (traversing the returned JSON)
  let result = property.getCurrentValue(entityId, entityAttributes);
  console.log(result.value.key) // prints the value of the key

  const property = appConfigClient.getProperty('yaml-property');
  property.getPropertyDataType(); // STRING
  property.getPropertyDataFormat(); // YAML
  property.getCurrentValue(entityId, entityAttributes);
  ```
</details>

## Set listener for feature and property data changes

The SDK provides an event-based mechanism to notify you in real-time when feature flag's or property's configuration changes. You can listen to `configurationUpdate` event using the same appConfigClient.

```javascript
appConfigClient.emitter.on('configurationUpdate', () => {
  // **add your code**
  // To find the effect of any configuration changes, you can call the feature or property related methods

  // feature = appConfigClient.getFeature('online-check-in');
  // newResult = feature.getCurrentValue(entityId, entityAttributes);
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
