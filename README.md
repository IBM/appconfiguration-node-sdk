# IBM Cloud App Configuration Node server SDK

IBM Cloud App Configuration SDK is used to perform feature flag and property evaluation based on the configuration on IBM Cloud App Configuration service.


## Table of Contents

  - [Overview](#overview)
  - [Installation](#installation)
  - [Import the SDK](#import-the-sdk)
  - [Initialize SDK](#initialize-sdk)
  - [License](#license)

## Overview

IBM Cloud App Configuration is a centralized feature management and configuration service on [IBM Cloud](https://www.cloud.ibm.com) for use with web and mobile applications, microservices, and distributed environments.

Instrument your applications with App Configuration Node SDKs, and use the App Configuration dashboard or API to define feature flags  or properties, organized into collections and targeted to segments. Change feature flag states in the cloud to activate or deactivate features in your application or environment, when required. You can also manage the properties for distributed applications centrally.

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
const client = AppConfiguration.getInstance();

let region = AppConfiguration.REGION_US_SOUTH;;
let guid = '<guid>';
let apikey = '<apikey>';
client.init(region, guid, apikey)

let collectionId = '<collectionId>';
let environmentId = '<environmentId>';
client.setContext(collectionId, environmentId)
```

- region : Region name where the App Configuration service instance is created. Use
  - `AppConfiguration.REGION_US_SOUTH` for Dallas
  - `AppConfiguration.REGION_EU_GB` for London
  - `AppConfiguration.REGION_AU_SYD` for Sydney
- guid : Instance Id of the App Configuration service. Obtain it from the service credentials section of the App Configuration dashboard.
- apikey : ApiKey of the App Configuration service. Obtain it from the service credentials section of the App Configuration dashboard.
* collectionId: Id of the collection created in App Configuration service instance under the **Collections** section.
* environmentId: Id of the environment created in App Configuration service instance under the **Environments** section.
> Here, by default live update from the server is enabled. To turn off this mode see the [below section](#work-offline-with-local-configuration-file)



### Work offline with local configuration file
You can also work offline with local configuration file and perform feature and property related operations.

After [`client.init(region, guid, apikey)`](#initialize-sdk), follow the below steps
```javascript
let configurationFile = 'path/to/configuration/file.json';
let liveConfigUpdateEnabled = false;
client.setContext(collectionId, environmentId, configurationFile, liveConfigUpdateEnabled)
```
- configurationFile: Path to the JSON file, which contains configuration details.
- liveConfigUpdateEnabled: Set this value to `false` if the new configuration values shouldn't be fetched from the server. Make sure to provide a proper JSON file in the path. By default, liveConfigUpdateEnabled value is enabled.

## Get single feature

```javascript
const feature = client.getFeature('feature_id')

if(feature) {

    if(feature.isEnabled()) {
        // enable feature
    } else {
        // disable the feature
    }
    console.log('data', feature);
    console.log(`Feature Name ${feature.getFeatureName()} `);
    console.log(`Feature Id ${feature.getFeatureId()} `);
    console.log(`Feature Type ${feature.getFeatureDataType()} `);
    console.log(`Feature is enabled ${feature.isEnabled()} `);
}
```
## Get all features

```javascript
var features = client.getFeatures();

var feature = features["feature_id"];

if(feature) {
    console.log(`Feature Name ${feature.getFeatureName()} `);
    console.log(`Feature Id ${feature.getFeatureId()} `);
    console.log(`Feature Type ${feature.getFeatureDataType()} `);
    console.log(`Feature is enabled ${feature.isEnabled()} `);
}
```

## Evaluate a feature

You can use the `feature.getCurrentValue(identityId, identityAttributes)` method to evaluate the value of the feature flag.
You should pass an unique identityId as the parameter to perform the feature flag evaluation.
### Usage
- If the feature flag is configured with segments in the App Configuration service, provide a json object as `identityAttributes` parameter to this method.

    ```javascript
    let identityId = 'identityId'
    let identityAttributes = {
        'city': 'Bangalore',
        'country': 'India'
    }

    feature.getCurrentValue(identityId, identityAttributes)    
    ```
- If the feature flag is not targeted to any segments and the feature flag is **turned ON** this method returns the feature **enabled value**. And when the feature flag is **turned OFF** this method returns the feature **disabled value**.

    ```javascript
    let identityId = 'identityId'
    feature.getCurrentValue(identityId)
    ```

## Get single property
```javascript
const property = client.getProperty('property_id')

if(property) {
    console.log('data', property);
    console.log(`Property Name ${property.getPropertyName()} `);
    console.log(`Property Id ${property.getPropertyId()} `);
    console.log(`Property Type ${property.getPropertyDataType()} `);
}
```

## Get all properties
```javascript
var properties = client.getProperties();

var property = properties["property_id"];

if(property) {
    console.log(`Property Name ${property.getPropertyName()} `);
    console.log(`Property Id ${property.getPropertyId()} `);
    console.log(`Property Type ${property.getPropertyDataType()} `);
}
```

## Evaluate a property

You can use the `property.getCurrentValue(identityId, identityAttributes)` method to evaluate the value of the property.
You should pass an unique identityId as the parameter to perform the property evaluation.
### Usage
- If the property is configured with segments in the App Configuration service, provide a json object as `identityAttributes` parameter to this method.

    ```javascript
    let identityId = 'identityId'
    let identityAttributes = {
        'city': 'Bangalore',
        'country': 'India'
    }

    property.getCurrentValue(identityId, identityAttributes)    
    ```
- If the property is not targeted to any segments this method returns the property value.

    ```javascript
    let identityId = 'identityId'
    property.getCurrentValue(identityId)
    ```

## Set listener for feature or property data changes

To listen to the data changes add the following code in your application

```javascript
  client.emitter.on('configurationUpdate', () => {
      // add your code
  })
```

## Enable debugger (optional)

```javascript
client.setDebug(true)
```

## Examples
Try [this](https://github.com/IBM/appconfiguration-node-sdk/tree/master/examples) sample application in the examples folder to learn more about feature and property evaluation.

## License

This project is released under the Apache 2.0 license. The license's full text can be found in [LICENSE](https://github.com/IBM/appconfiguration-node-sdk/blob/master/LICENSE)