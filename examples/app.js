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

const http = require('http');
const { AppConfiguration } = require('ibm-appconfiguration-node-sdk');

const hostname = '127.0.0.1';
const port = 3000;

// provide the `region`, `guid` & `apikey` as mentioned in the README.md
const region = "<region>";
const guid = "<guid>";
const apikey = "<apikey>";

const client = AppConfiguration.getInstance();
client.init(region, guid, apikey);
client.setContext("<collectionId>", "<environmentId>");

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
        const feature = client.getFeature("<featureId>");
        const featureName = feature.getFeatureName();
        const featureDataType = feature.getFeatureDataType();
        const featureValue = feature.getCurrentValue(entityId, entityAttributes);

        res.write(`<h1>Feature Name: ${  featureName  }</h1><br><h1>Feature DataType: ${  featureDataType  }</h1><br><h1>Feature evaluated value:${  featureValue  }</h1>`);
        res.end();
    } else if (url === '/getfeatures') {
        const features = client.getFeatures();

    res.write(`<p>${features}</p>`);
    res.end();
  } else if (url === '/getproperty') {
    const property = client.getProperty('<propertyId>');
    const propertyName = property.getPropertyName();
    const propertyDataType = property.getPropertyDataType();
    const propertyValue = property.getCurrentValue(entityId, entityAttributes);

        res.write(`<h1>Property Name: ${  propertyName  }</h1><br><h1>Property DataType: ${  propertyDataType  }</h1><br><h1>Property evaluated value:${  propertyValue  }</h1>`);
        res.end();
    } else if (url === '/getproperties') {
        const properties = client.getProperties();

        res.write(`<p>${  properties  }</p>`);
        res.end();
    } else {
        res.write('<h1>404 NOT FOUND</h1>');
        res.end();
    }
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
