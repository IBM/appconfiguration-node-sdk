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
const http = require('http');
const { AppConfiguration } = require('ibm-appconfiguration-node-sdk');

const hostname = '127.0.0.1';
const port = 3000;

const region = process.env.REGION;
const guid = process.env.GUID;
const apikey = process.env.APIKEY;

const client = AppConfiguration.getInstance();
client.init(region, guid, apikey);

const collectionId = process.env.COLLECTION_ID;
const environmentId = process.env.ENVIRONMENT_ID;
client.setContext(collectionId, environmentId);

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');

  const { url } = req;

  const entityId = 'user123';
  const entityAttributes = {
    city: 'Bangalore',
    radius: 60,
  };
  if (url === '/') {
    res.write('<h1>Welcome to Sample App HomePage!</h1>');
    res.end();
  } else if (url === '/getfeature') {
    const feature = client.getFeature(process.env.FEATURE_ID);
    const featureName = feature.getFeatureName();
    const featureDataType = feature.getFeatureDataType();
    const featureValue = feature.getCurrentValue(entityId, entityAttributes);

    const html = `<h1>Feature Name: ${featureName}</h1><h1>Feature DataType: ${featureDataType}</h1><h1>Feature evaluated value:${featureValue}</h1>`;
    res.write(html);
    res.end();
  } else if (url === '/getfeatures') {
    const features = client.getFeatures();

    res.write('<h1>All features</h1>');
    let html = '';
    Object.keys(features).forEach((feature) => {
      const featureName = features[feature].getFeatureName();
      const featureDataType = features[feature].getFeatureDataType();
      const isFeatureEnabled = features[feature].isEnabled();
      html += `<h1>Feature Name: ${featureName}</h1><h1>Feature DataType: ${featureDataType}</h1><h1>Is feature enabled: ${isFeatureEnabled}</h1><br>`;
    });
    res.write(html);
    res.end();
  } else if (url === '/getproperty') {
    const property = client.getProperty(process.env.PROPERTY_ID);
    const propertyName = property.getPropertyName();
    const propertyDataType = property.getPropertyDataType();
    const propertyValue = property.getCurrentValue(entityId, entityAttributes);

    const html = `<h1>Property Name: ${propertyName}</h1><h1>Property DataType: ${propertyDataType}</h1><h1>Property value:${propertyValue}</h1>`;
    res.write(html);
    res.end();
  } else if (url === '/getproperties') {
    const properties = client.getProperties();

    res.write('<h1>All properties</h1>');
    let html = '';
    Object.keys(properties).forEach((property) => {
      const propertyName = properties[property].getPropertyName();
      const propertyDataType = properties[property].getPropertyDataType();
      const propertyValue = properties[property].getCurrentValue(entityId);
      html += `<h1>Property Name: ${propertyName}</h1><h1>Property DataType: ${propertyDataType}</h1><h1>Property value:${propertyValue}</h1><br>`;
    });
    res.write(html);
    res.end();
  } else {
    res.write('<h1>404 NOT FOUND</h1>');
    res.end();
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
