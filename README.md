# IBM Cloud App Configuration Node server SDK

IBM Cloud App Configuration SDK is used to perform feature evaluation based on the configuration on IBM Cloud App Configuration service.


## Table of Contents

  - [Overview](#overview)
  - [Installation](#installation)
  - [Import the SDK](#import-the-sdk)
  - [Initialize SDK](#initialize-sdk)
  - [License](#license)

## Overview

IBM Cloud App Configuration is a centralized feature management and configuration service on [IBM Cloud](https://www.cloud.ibm.com) for use with web and mobile applications, microservices, and distributed environments.

Instrument your applications with App Configuration Node SDKs, and use the App Configuration dashboard or API to define features flags, organized into collections and targeted to segments. Change feature flag states in the cloud to activate or deactivate features in your application or environment, often without re-starting.

## Installation

Installation is done using the `npm install` command.

```bash
$ npm install ibm-appconfiguration-node-sdk
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

let region = 'us-south';
let guid = 'abc-def-xyz';
let apikey = 'j9qc-abc-z79';

client.init(region, guid, apikey)

// Set the collection Id
client.setCollectionId('collectionId')
```

- region : Region name where the App Configuration service instance is created. Use `us-south` for Dallas and `eu-gb` for London.
- guid : Instance Id of the App Configuration service. Get it from the service credentials section of the dashboard.
- apikey : ApiKey of the App Configuration service. Get it from the service credentials section of the dashboard.

* collectionId: Id of the collection created in App Configuration service instance.
> Here, by default live features update from the server is enabled. To turn off this mode see the [below section](#work-offline-with-local-feature-file)



### Work offline with local feature file
You can also work offline with local feature file and perform [feature operations](#get-single-feature).

After setting the collection Id, follow the below steps
```javascript
client.fetchFeaturesFromFile(featureFile='path/to/feature/file.json', liveFeatureUpdateEnabled)
```
- featureFile: Path to the JSON file, which contains feature details and segment details.
- liveFeatureUpdateEnabled: Set this value to `false` if the new feature values shouldn't be fetched from the server. Make sure to provide a proper JSON file in the path. By default, liveFeatureUpdateEnabled value is enabled.




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


## Listen to the feature changes

To listen to the data changes add the following code in your application

```javascript
  client.emitter.on('featuresUpdate', () => {
      // add your code
  })
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

## Enable debugger

```javascript
client.setDebug(true)
```

## License

This project is released under the Apache 2.0 license. The license's full text can be found in [LICENSE](/LICENSE)
