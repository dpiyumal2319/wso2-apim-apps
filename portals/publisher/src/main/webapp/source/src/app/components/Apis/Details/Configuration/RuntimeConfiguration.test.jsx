/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

describe('RuntimeConfiguration componentValidator derivation', () => {
    const deriveRuntimeFeatures = (gatewayConfig) => {
        const runtimeFeatures = [...(gatewayConfig.runtime || [])];
        if (gatewayConfig.apiKeys?.supported && !runtimeFeatures.includes('apikey')) {
            runtimeFeatures.push('apikey');
        }
        return runtimeFeatures;
    };

    describe('apikey flag derivation from apiKeys.supported', () => {
        test('should add apikey when apiKeys.supported=true and apikey not in runtime', () => {
            const awsConfig = {
                runtime: ['transportsHTTP', 'transportsHTTPS', 'oauth2'],
                apiKeys: {
                    supported: true,
                    federated: true,
                    operations: ['issue', 'regenerate', 'revoke'],
                },
            };

            const result = deriveRuntimeFeatures(awsConfig);

            expect(result).toContain('apikey');
            expect(result).toContain('oauth2');
            expect(result).toContain('transportsHTTP');
        });

        test('should add apikey when apiKeys.supported=true', () => {
            const azureConfig = {
                runtime: ['cors', 'transportsHTTP', 'transportsHTTPS'],
                apiKeys: {
                    supported: true,
                    federated: true,
                    operations: ['issue', 'regenerate', 'revoke'],
                    headerName: 'Ocp-Apim-Subscription-Key',
                },
            };

            const result = deriveRuntimeFeatures(azureConfig);

            expect(result).toContain('apikey');
            expect(result).toContain('cors');
        });

        test('should not duplicate apikey when already in runtime', () => {
            const kongConfig = {
                runtime: ['cors', 'transportsHTTP', 'transportsHTTPS', 'oauth2', 'apikey'],
                apiKeys: {
                    supported: true,
                    federated: true,
                    operations: ['issue', 'regenerate', 'revoke', 'associate', 'dissociate'],
                },
            };

            const result = deriveRuntimeFeatures(kongConfig);

            const apikeyCount = result.filter((feature) => feature === 'apikey').length;
            expect(apikeyCount).toBe(1);
        });

        test('should not add apikey when apiKeys.supported=false', () => {
            const envoyConfig = {
                runtime: ['cors', 'transportsHTTP', 'transportsHTTPS', 'oauth2'],
                apiKeys: {
                    supported: false,
                },
            };

            const result = deriveRuntimeFeatures(envoyConfig);

            expect(result).not.toContain('apikey');
        });

        test('should not add apikey when apiKeys object is missing', () => {
            const legacyConfig = {
                runtime: ['transportsHTTP', 'transportsHTTPS'],
            };

            const result = deriveRuntimeFeatures(legacyConfig);

            expect(result).not.toContain('apikey');
            expect(result).toEqual(['transportsHTTP', 'transportsHTTPS']);
        });

        test('should handle empty runtime array', () => {
            const emptyRuntimeConfig = {
                runtime: [],
                apiKeys: {
                    supported: true,
                },
            };

            const result = deriveRuntimeFeatures(emptyRuntimeConfig);

            expect(result).toEqual(['apikey']);
        });

        test('should handle undefined runtime array', () => {
            const undefinedRuntimeConfig = {
                apiKeys: {
                    supported: true,
                },
            };

            const result = deriveRuntimeFeatures(undefinedRuntimeConfig);

            expect(result).toEqual(['apikey']);
        });

        test('should not mutate original runtime array', () => {
            const originalRuntime = ['transportsHTTP'];
            const config = {
                runtime: originalRuntime,
                apiKeys: { supported: true },
            };

            deriveRuntimeFeatures(config);

            expect(originalRuntime).toEqual(['transportsHTTP']);
            expect(originalRuntime).not.toContain('apikey');
        });
    });
});
