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
import React from 'react';
import Typography from '@mui/material/Typography';
import PrimarySecondaryKeyPairRenderer from './PrimarySecondaryKeyPairRenderer';
import ApiKeyInvocationRenderer from './ApiKeyInvocationRenderer';
import OpaqueApiKeyRenderer from './OpaqueApiKeyRenderer';
import SubscriptionPlansRenderer from './SubscriptionPlansRenderer';
import OptionGroupsRenderer from './OptionGroupsRenderer';
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
    'option-groups': OptionGroupsRenderer,
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

/**
 * Get the column header label for the selected subscription option.
 * For "subscription-plans", reads optionName from the body (e.g. "Access Group", "Usage Plan").
 * Falls back to "Plan" for unknown schemas or parse failures.
 * @param {string} schemaName - Schema name from FederatedSubscriptionOptions.schemaName
 * @param {string} body - JSON body from FederatedSubscriptionOptions.body
 * @returns {string} Human-readable column header label
 */
export function getSubscriptionOptionsColumnHeader(schemaName, body) {
    if (schemaName === 'subscription-plans' && body) {
        try {
            const parsed = typeof body === 'string' ? JSON.parse(body) : body;
            return parsed.optionName || 'Plan';
        } catch {
            return 'Plan';
        }
    }
    if (schemaName === 'option-groups' && body) {
        try {
            const parsed = typeof body === 'string' ? JSON.parse(body) : body;
            const groups = parsed.groups || [];
            if (groups.length > 0) {
                return groups.map((g) => g.groupName).join(' / ');
            }
        } catch {
            return 'Options';
        }
        return 'Options';
    }
    return 'Plan';
}

/**
 * Compact preview of a selectedOption {schemaName, body} wrapper for table display.
 * - "subscription-plans": Shows plan name
 * - "option-groups": Shows selected item names per group joined by " / "
 * - Unknown/null: Shows "-"
 */
export function SelectedOptionPreview({ selectedOption }) {
    if (!selectedOption) {
        return <Typography variant='body2' color='text.secondary'>-</Typography>;
    }

    let wrapper;
    try {
        wrapper = typeof selectedOption === 'string' ? JSON.parse(selectedOption) : selectedOption;
    } catch {
        return <Typography variant='body2' color='text.secondary'>-</Typography>;
    }

    const { schemaName, body } = wrapper;

    if (schemaName === 'subscription-plans' && body) {
        try {
            const plan = typeof body === 'string' ? JSON.parse(body) : body;
            return <Typography variant='body2'>{plan.name || plan.id || '-'}</Typography>;
        } catch {
            return <Typography variant='body2' color='text.secondary'>-</Typography>;
        }
    }

    if (schemaName === 'option-groups' && body) {
        try {
            // body is a map of groupId -> selected item {id, name, ...}
            const parsed = typeof body === 'string' ? JSON.parse(body) : body;
            const names = Object.values(parsed)
                .map((item) => item.name || item.id)
                .filter(Boolean);
            if (names.length > 0) {
                return <Typography variant='body2'>{names.join(' / ')}</Typography>;
            }
        } catch {
            // fall through to dash
        }
    }

    return <Typography variant='body2' color='text.secondary'>-</Typography>;
}
