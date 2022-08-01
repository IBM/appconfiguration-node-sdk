/* eslint-disable camelcase */
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

/**
 * This file defines the various strings used by the SDK.
 *
 * @module Messages
 */

const reasonSegmentValueFeatureFlag = (segmentName, entityId, rolloutPercentage) => `Segment value of the feature flag since entityAttributes satisfies the ${segmentName} segment rules and the entityId ${entityId} is eligible for segment rollout percentage of ${rolloutPercentage}%`;
const reasonSegmentValueProperty = () => `Segment value of the property.`;

const reasonEnabledValueFeatureFlag_1 = (entityId, rolloutPercentage) => `Enabled value of the feature flag as entityId ${entityId} was eligible for the feature flag level rollout percentage of ${rolloutPercentage}%`;
const reasonEnabledValueFeatureFlag_2 = () => `Enabled value of the feature flag.`;

const reasonDisabledValueFeatureFlag_1 = (segmentName, entityId, rolloutPercentage) => `Disabled value of the feature flag since entityAttributes satisfies the ${segmentName} segment rules but the entityId ${entityId} is not eligible for segment rollout percentage of ${rolloutPercentage}%`;
const reasonDisabledValueFeatureFlag_2 = (entityId, rolloutPercentage) => `Disabled value of the feature flag. As entityAttributes did not satisfy any of the targeting rules, and the entityId ${entityId} was not eligible for feature flag level rollout percentage of ${rolloutPercentage}%`;
const reasonDisabledValueFeatureFlag_3 = (entityId, rolloutPercentage) => `Disabled value of the feature flag since entityId ${entityId} is not eligible for feature flag level rollout percentage of ${rolloutPercentage}%`;
const reasonDisabledValueFeatureFlag_4 = () => `Disabled value of the feature flag since the feature flag is disabled.`;

const reasonDefaultValueProperty_1 = () => `Default value of the property. As entityAttributes did not satisfy any of the targeting rules.`;
const reasonDefaultValueProperty_2 = () => `Default value of the property.`;

const reasonErrorInEvaluation = () => `Error occured during evaluation.`;

module.exports = {
    reasonSegmentValueFeatureFlag,
    reasonSegmentValueProperty,
    reasonEnabledValueFeatureFlag_1,
    reasonEnabledValueFeatureFlag_2,
    reasonDisabledValueFeatureFlag_1,
    reasonDisabledValueFeatureFlag_2,
    reasonDisabledValueFeatureFlag_3,
    reasonDisabledValueFeatureFlag_4,
    reasonDefaultValueProperty_1,
    reasonDefaultValueProperty_2,
    reasonErrorInEvaluation,
}