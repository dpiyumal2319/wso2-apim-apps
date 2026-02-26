/*
 * Copyright (c) 2026, WSO2 LLC. (http://www.wso2.org) All Rights Reserved.
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
import SubscriptionPlansEditor from './editors/SubscriptionPlansEditor';
import OptionGroupsEditor from './editors/OptionGroupsEditor';
import ApiKeyInvocationRenderer from './invocations/ApiKeyInvocationRenderer';

const subscriptionOptionsEditors = {
    'subscription-plans': SubscriptionPlansEditor,
    'option-groups': OptionGroupsEditor,
};

/**
 * Get subscription options editor component based on schema name.
 * @param {string} schemaName - Schema name from subscriptionOptions.schemaName
 * @returns {Component|null} Editor component or null if no editor for schema
 */
export function getSubscriptionOptionsEditor(schemaName) {
    if (!schemaName) {
        return null;
    }
    return subscriptionOptionsEditors[schemaName] || null;
}


const invocationRenderers = {
    'api-key-invocation': ApiKeyInvocationRenderer,
};

/**
 * Get invocation renderer based on schema name.
 * @param {string} schemaName - Schema name from invocationTemplate.schemaName
 * @returns {Component|null} Renderer component or null if no renderer for schema
 */
export function getInvocationRenderer(schemaName) {
    if (!schemaName) {
        return null;
    }
    return invocationRenderers[schemaName] || null;
}
