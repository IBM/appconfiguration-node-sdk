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

const region = '<REGION>'
const guid = '<GUID>'
const apikey = '<APIKEY>'

const client = AppConfiguration.getInstance();
client.init(region, guid, apikey);
client.setCollectionId('<COLLECTION_ID>')

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    var url = req.url;
    if (url === '/') {
        res.write('<h1>Welcome to Sample App HomePage!</h1>');
        res.end();
    }
    else if (url === '/getfeature') {
        let identityId = 'User1'
        let identityAttributes = {
            'email': 'ibm.com',
            'gender': 'male',
            'age': '31',
        }
        let feature = client.getFeature('<FEATURE_ID>');

        let featureName = feature.getFeatureName();
        let featureDataType = feature.getFeatureDataType();
        let featureValue = feature.getCurrentValue(identityId, identityAttributes);

        res.write(`<h1>Feature Name: ` + featureName + `</h1><br><h1>Feature DataType: ` + featureDataType + `</h1><br><h1>Feature Value:` + featureValue + `</h1>`);
        res.end();
    }
    else if (url === '/getfeatures') {
        let features = client.getFeatures();

        res.write(`<p>` + features + `</p>`);
        res.end();
    }
    else {
        res.write('<h1>404 NOT FOUND</h1>');
        res.end();
    }
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});