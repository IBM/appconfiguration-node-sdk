/**
 * Copyright 2022 IBM Corp. All Rights Reserved.
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

const { getNormalizedValue, extractConfigurations } = require('../../../../lib/configurations/internal/Utils');

describe('utils', () => {
    test('test getNormalisedValue', () => {

        expect(getNormalizedValue('entityId:featureId')).not.toEqual(41.13);
        expect(getNormalizedValue('entityId:featureId')).not.toEqual(42);
        expect(getNormalizedValue('entityId:featureId')).toEqual(41);

    });
    test('test invalid bootstrap json', () => {
        let importJson = {
            environments: [],
            collections: [],
            segments: []
        }
        expect(() => { extractConfigurations(importJson, "env", "collection") }).toThrow(Error);
        importJson = {
            environments: [
                {
                    "name": "Dev",
                    "environment_id": "dev",
                    "description": "Development environment",
                    "tags": "",
                    "color_code": "#FDD13A",
                    "features": [],
                    "properties": []
                }
            ],
            collections: [
                {
                    "name": "My Collection",
                    "collection_id": "mycollection",
                    "description": "",
                    "tags": ""
                }
            ],
            segments: []
        }
        expect(() => { extractConfigurations(importJson, "dev", "collection") }).toThrow(Error);
        expect(extractConfigurations(importJson, "dev", "mycollection").features.length).toEqual(0);
        expect(extractConfigurations(importJson, "dev", "mycollection").properties.length).toEqual(0);
        expect(extractConfigurations(importJson, "dev", "mycollection").segments.length).toEqual(0);
    });
    test('test extractConfigurationsFromAPIResponse', () => {
        const sdkConfig = {
            "environments": [
                {
                    "name": "Dev",
                    "environment_id": "dev",
                    "features": [],
                    "properties": []
                }
            ],
            "collections": [
                {
                    "name": "Collection",
                    "collection_id": "collection"
                }
            ],
            "segments": []
        }
        expect(extractConfigurations(sdkConfig, "dev", "collection").features.length).toEqual(0);
        expect(extractConfigurations(sdkConfig, "dev", "collection").properties.length).toEqual(0);
        expect(extractConfigurations(sdkConfig, "dev", "collection").segments.length).toEqual(0);
    })
});
