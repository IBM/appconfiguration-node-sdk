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
const express = require('express');
const { AppConfiguration } = require('ibm-appconfiguration-node-sdk');

const app = express();
const region = process.env.REGION;
const guid = process.env.GUID;
const apikey = process.env.APIKEY;
const collectionId = process.env.COLLECTION_ID;
const environmentId = process.env.ENVIRONMENT_ID;

const client = AppConfiguration.getInstance();
client.init(region, guid, apikey);
client.setContext(collectionId, environmentId);

const entityId = 'user123';
const entityAttributes = {
  city: 'Bangalore',
  radius: 60,
};

app.get('/', (req, res) => {
  res.write('<h1>Welcome to Sample App HomePage!</h1>');
  res.end();
});

app.get('/getfeature', (req, res) => {

  const feature = client.getFeature(process.env.FEATURE_ID);
  const featureName = feature.getFeatureName();
  const featureDataType = feature.getFeatureDataType();
  const result = feature.getCurrentValue(entityId, entityAttributes);

  const feature_data = {
    'Entity ID': entityId,
    'Feature Name': featureName,
    'Feature DataType': featureDataType,
    'Feature evaluated value': result.value,
    'Feature Enabled for entity?': `${result.isEnabled}`,
  };
  console.log(feature_data);

  res.statusCode = 200;
  res.json(feature_data);
});

app.get('/getfeatures', (req, res) => {

  const features = client.getFeatures();

  let allFeatures = [];
  Object.keys(features).forEach((feature) => {
    const featureName = features[feature].getFeatureName();
    const featureDataType = features[feature].getFeatureDataType();
    const isFeatureEnabled = features[feature].isEnabled();
    allFeatures.push({
      'Feature Name': featureName,
      'Feature DataType': featureDataType,
      'Is feature flag enabled?': isFeatureEnabled,
    });
  });
  console.log(allFeatures);

  res.statusCode = 200;
  res.json(allFeatures);
});

app.get('/getproperty', (req, res) => {

  const property = client.getProperty(process.env.PROPERTY_ID);
  const propertyName = property.getPropertyName();
  const propertyDataType = property.getPropertyDataType();
  const result = property.getCurrentValue(entityId, entityAttributes);

  const property_data = {
    'Property Name': `${propertyName}`,
    'Property DataType': `${propertyDataType}`,
    'Property value': `${result.value}`,
  };
  console.log(property_data);

  res.statusCode = 200;
  res.json(property_data);
});

app.get('/getproperties', (req, res) => {

  const properties = client.getProperties();

  let allProperties = [];
  Object.keys(properties).forEach((property) => {
    const propertyName = properties[property].getPropertyName();
    const propertyDataType = properties[property].getPropertyDataType();
    const result = properties[property].getCurrentValue(
      entityId,
      entityAttributes
    );
    allProperties.push({
      'Property Name': `${propertyName}`,
      'Property DataType': `${propertyDataType}`,
      'Property value': `${result.value}`,
    });
  });
  console.log(allProperties);

  res.statusCode = 200;
  res.json(allProperties);
});

app.listen(3000, () => {
  console.log('app is running on port 3000....');
});
