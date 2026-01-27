/**
 * Copyright (c) 2026, WSO2 Inc. (http://wso2.com) All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import APIClientFactory from './APIClientFactory';
import Resource from './Resource';
import Utils from './Utils';

/**
 * Class to expose Discovered Application operations
 */
export default class DiscoveredApplication extends Resource {
    constructor() {
        super();
        this.client = new APIClientFactory().getAPIClient(Utils.getEnvironment().label).client;
    }

    /**
     * Get all external gateway environments available for application federation
     * @returns {Promise} Promise resolving to list of external gateway environments
     */
    static getEnvironments() {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getEnvironment().label);
        const promisedEnvironments = apiClient.client.then((client) => {
            return client.apis.Environments.externalEnvironmentsGet({}, this._requestMetaData());
        });
        return promisedEnvironments.then((response) => response.obj);
    }

    /**
     * Get discovered applications from an external gateway environment
     * @param {string} environmentId The gateway environment ID
     * @param {number} limit Maximum number of applications to return
     * @param {number} offset Starting position for pagination
     * @param {string} query Search query string
     * @returns {Promise} Promise resolving to list of discovered applications
     */
    static getDiscoveredApplications(environmentId, limit = 10, offset = 0, query = '') {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getEnvironment().label);
        const promisedApplications = apiClient.client.then((client) => {
            return client.apis.Applications.getDiscoveredApplications({
                environmentId,
                limit,
                offset,
                query,
            }, this._requestMetaData());
        });
        return promisedApplications.then((response) => response.obj);
    }

    /**
     * Get details of a specific discovered application
     * @param {string} environmentId The gateway environment ID
     * @param {string} applicationId The discovered application ID
     * @returns {Promise} Promise resolving to discovered application details
     */
    static getDiscoveredApplication(environmentId, applicationId) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getEnvironment().label);
        const promisedApplication = apiClient.client.then((client) => {
            return client.apis.Applications.getDiscoveredApplication({
                environmentId,
                applicationId,
            }, this._requestMetaData());
        });
        return promisedApplication.then((response) => response.obj);
    }

    /**
     * Import a discovered application from an external gateway
     * @param {object} payload Import request payload containing environmentId and applicationIds
     * @returns {Promise} Promise resolving to import response
     */
    static importDiscoveredApplication(payload) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getEnvironment().label);
        const promisedImport = apiClient.client.then((client) => {
            return client.apis.Applications.importDiscoveredApplication(
                {},
                { requestBody: payload },
                this._requestMetaData(),
            );
        });
        return promisedImport.then((response) => response.obj);
    }
}
