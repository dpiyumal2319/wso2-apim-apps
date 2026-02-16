/*
 * Copyright (c) 2025, WSO2 LLC. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import PrimarySecondaryKeyPairRenderer from './PrimarySecondaryKeyPairRenderer';
import ApiKeyInvocationRenderer from './ApiKeyInvocationRenderer';
import OpaqueApiKeyRenderer from './OpaqueApiKeyRenderer';
import SubscriptionPlansRenderer from './SubscriptionPlansRenderer';
import FallbackRenderer from './FallbackRenderer';

// Map of schemaName -> Renderer component (gateway type removed)
const credentialRenderers = {
    'primary-secondary-key-pair': PrimarySecondaryKeyPairRenderer,
    'opaque-api-key': OpaqueApiKeyRenderer,
};

const invocationRenderers = {
    'api-key-invocation': ApiKeyInvocationRenderer,
};

const subscriptionOptionsRenderers = {
    'subscription-plans': SubscriptionPlansRenderer,
};

/**
 * Get credential renderer based on schema name only
 * @param {string} schemaName - Schema name from FederatedCredential.schemaName
 * @returns {Component} Renderer component or FallbackRenderer
 */
export function getCredentialRenderer(schemaName) {
    if (!schemaName) {
        return FallbackRenderer;
    }
    // Type-safety check: warn if invocation schema accidentally passed
    if (invocationRenderers[schemaName]) {
        console.warn(`Schema "${schemaName}" is an invocation schema, not a credential schema`);
        return FallbackRenderer;
    }
    return credentialRenderers[schemaName] || FallbackRenderer;
}

/**
 * Get invocation renderer based on schema name only
 * @param {string} schemaName - Schema name from InvocationInstruction.schemaName
 * @returns {Component} Renderer component or FallbackRenderer
 */
export function getInvocationRenderer(schemaName) {
    if (!schemaName) {
        return FallbackRenderer;
    }
    // Type-safety check: warn if credential schema accidentally passed
    if (credentialRenderers[schemaName]) {
        console.warn(`Schema "${schemaName}" is a credential schema, not an invocation schema`);
        return FallbackRenderer;
    }
    return invocationRenderers[schemaName] || FallbackRenderer;
}

/**
 * Get subscription options renderer based on schema name
 * @param {string} schemaName - Schema name from FederatedSubscriptionOptions.schemaName
 * @returns {Component} Renderer component or null
 */
export function getSubscriptionOptionsRenderer(schemaName) {
    if (!schemaName) {
        return null;
    }
    return subscriptionOptionsRenderers[schemaName] || null;
}
