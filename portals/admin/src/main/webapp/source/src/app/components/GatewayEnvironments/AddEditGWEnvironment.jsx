/*
 * Copyright (c) 2021, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
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

import React, { useEffect, useReducer, useState } from 'react';
import { styled } from '@mui/material/styles';
import API from 'AppData/api';
import base64url from 'base64url';
import PropTypes from 'prop-types';
import ContentBase from 'AppComponents/AdminPages/Addons/ContentBase';
import { useAppContext } from 'AppComponents/Shared/AppContext';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { FormattedMessage, useIntl } from 'react-intl';
import Select from '@mui/material//Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import { MenuItem, Typography } from '@mui/material';
import Alert from 'AppComponents/Shared/Alert';
import { Link as RouterLink } from 'react-router-dom';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import { MuiChipsInput } from 'mui-chips-input';
import Error from '@mui/icons-material/Error';
import InputAdornment from '@mui/material/InputAdornment';
import { red } from '@mui/material/colors/';
import AddEditVhost from 'AppComponents/GatewayEnvironments/AddEditVhost';
import GatewayConfiguration from 'AppComponents/GatewayEnvironments/GatewayConfiguration';
import cloneDeep from 'lodash.clonedeep';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

const StyledSpan = styled('span')(({ theme }) => ({ color: theme.palette.error.dark }));

const StyledContentBase = styled(ContentBase)({
    '@global': {
        '.MuiFormControl-root': {
            marginTop: '20px',
        },
        '.MuiFormControl-root:first-of-type': {
            marginTop: '0',
        },
    },
});

const StyledHr = styled('hr')({ border: 'solid 1px #efefef' });

const LOCAL_PLAN_API_TYPE_BY_LIMIT_TYPE = {
    REQUESTCOUNTLIMIT: 'rest',
    EVENTCOUNTLIMIT: 'async',
    AIAPIQUOTALIMIT: 'ai-api',
};
const NON_SUBSCRIBABLE_LOCAL_POLICIES = new Set(['Unauthenticated']);
const SUBSCRIPTIONLESS_LOCAL_POLICIES = new Set(['DefaultSubscriptionless', 'AsyncDefaultSubscriptionless']);

const normalizeApiType = (apiType) => (apiType || '').toString().trim().toLowerCase();

const resolveLocalPlanApiType = (policy) => {
    const limitType = (policy?.defaultLimit?.type || '').toString().trim().toUpperCase();
    return LOCAL_PLAN_API_TYPE_BY_LIMIT_TYPE[limitType] || 'other';
};

const isMappableLocalPolicy = (policy) => (
    !!policy
    && !!policy.policyName
    && !NON_SUBSCRIBABLE_LOCAL_POLICIES.has(policy.policyName)
);

/**
 * Reducer
 * @param {JSON} state State
 * @param field form field
 * @param value value of field
 * @returns {Promise}.
 */
function reducer(state, { field, value }) {
    switch (field) {
        case 'name':
        case 'displayName':
        case 'gatewayType':
        case 'gatewayMode':
        case 'description':
        case 'type':
        case 'roles':
        case 'scheduledInterval':
        case 'additionalProperties':
        case 'vhosts':
            return { ...state, [field]: value };
        case 'editDetails':
            return value;
        case 'permissionType':
            return {
                ...state,
                permissions: { ...state.permissions, [field]: value },
            };
        default:
            return state;
    }
}

/**
 * Render a pop-up dialog to add/edit a Gateway Environment
 * @param {JSON} props .
 * @returns {JSX}.
 */
function AddEditGWEnvironment(props) {
    const intl = useIntl();
    const { dataRow } = props;

    const { settings } = useAppContext();
    const [validRoles, setValidRoles] = useState([]);
    const [invalidRoles, setInvalidRoles] = useState([]);
    const [roleValidity, setRoleValidity] = useState(true);
    const [gatewayConfigurations, setGatewayConfiguration] = useState([]);
    const [supportedModes, setSupportedModes] = useState([]);
    const [validating, setValidating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tierMappings, setTierMappings] = useState([]);
    const [remotePlans, setRemotePlans] = useState([]);
    const [localTiers, setLocalTiers] = useState([]);
    const [loadingRemotePlans, setLoadingRemotePlans] = useState(false);
    const [remotePlansFetchError, setRemotePlansFetchError] = useState('');
    const [hasInitializedDefaultMappings, setHasInitializedDefaultMappings] = useState(false);
    const [hasUserEditedTierMappings, setHasUserEditedTierMappings] = useState(false);
    const [initialAdditionalProperties, setInitialAdditionalProperties] = useState({});
    const { gatewayTypes } = settings;

    const createDefaultVhost = (currentGatewayType) => {
        const gatewaysProvidedByWSO2 = ['Regular', 'APK'];
        const isExternalGateway = !gatewaysProvidedByWSO2.includes(currentGatewayType);
        return {
            host: '',
            httpContext: '',
            httpsPort: isExternalGateway ? 443 : 8243,
            httpPort: isExternalGateway ? 80 : 8280,
            wssPort: 8099,
            wsPort: 9099,
            isNew: true,
        };
    };
    const { match: { params: { id } }, history } = props;
    const initialPermissions = dataRow && dataRow.permissions
        ? dataRow.permissions
        : { roles: [], permissionType: 'PUBLIC' };
    const initialGatewayType = gatewayTypes && gatewayTypes.length > 1 && gatewayTypes.includes('Regular') ? 'Regular'
        : gatewayTypes[0];
    const [initialState, setInitialState] = useState({
        name: '',
        displayName: '',
        description: '',
        gatewayType: initialGatewayType,
        gatewayMode: 'WRITE_ONLY',
        scheduledInterval: 0,
        type: 'hybrid',
        vhosts: [createDefaultVhost(initialGatewayType)],
        permissions: initialPermissions,
        additionalProperties: {},
    });
    const [editMode, setIsEditMode] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(dataRow?.isReadOnly || false);

    const [state, dispatch] = useReducer(reducer, initialState);
    const {
        name, displayName, description, vhosts, type, gatewayType, gatewayMode, scheduledInterval, permissions,
        additionalProperties,
    } = state;

    const [roles, setRoles] = useState([]);

    useEffect(() => {
        if (id) {
            new API().getGatewayEnvironment(id).then((result) => {
                const { body } = result;
                const tempAdditionalProperties = {};
                body.additionalProperties.forEach((property) => {
                    tempAdditionalProperties[property.key] = property.value;
                });
                const newState = {
                    name: body.name || '',
                    displayName: body.displayName || '',
                    description: body.description || '',
                    gatewayType: body.gatewayType || '',
                    gatewayMode: body.mode || '',
                    scheduledInterval: body.apiDiscoveryScheduledWindow ?? 0,
                    type: body.type || '',
                    vhosts: body.vhosts || [],
                    permissions: body.permissions || initialPermissions,
                    additionalProperties: tempAdditionalProperties || {},
                };
                setIsReadOnly(body.isReadOnly || false);
                setInitialAdditionalProperties(tempAdditionalProperties || {});
                dispatch({ field: 'editDetails', value: newState });
                if (body.tierMappings && body.tierMappings.length > 0) {
                    setTierMappings(body.tierMappings);
                    setHasInitializedDefaultMappings(true);
                } else {
                    setTierMappings([]);
                }
            });
            setIsEditMode(true);
        } else {
            setIsEditMode(false);
            setTierMappings([]);
            setInitialAdditionalProperties({});
            setInitialState({
                name: '',
                displayName: '',
                description: '',
                gatewayType: '',
                gatewayMode: 'WRITE_ONLY',
                scheduledInterval: 0,
                type: 'hybrid',
                vhosts: [createDefaultVhost('Regular')],
                permissions: {
                    roles: [],
                    permissionType: 'PUBLIC',
                },
                additionalProperties: {},
            });
        }
    }, [id]);

    useEffect(() => {
        if (permissions && permissions.roles) {
            setRoles(permissions.roles);
        }
    }, [permissions]);

    useEffect(() => {
        const config = settings.gatewayConfiguration.filter((t) => t.type === gatewayType)[0];
        if (gatewayType === 'other') {
            setGatewayConfiguration([]);
        } else {
            setGatewayConfiguration(
                config.configurations,
            );
        }
        setSupportedModes(
            config.supportedModes,
        );
    }, [gatewayType]);

    // Load local subscription tiers for the plan mapping section
    useEffect(() => {
        new API().getSubscritionPolicyList().then((result) => {
            const { body } = result;
            if (body && body.list) {
                setLocalTiers(body.list
                    .filter((policy) => isMappableLocalPolicy(policy))
                    .map((policy) => ({
                        name: policy.policyName,
                        displayName: policy.displayName || policy.policyName,
                        apiType: resolveLocalPlanApiType(policy),
                    })));
            }
        }).catch(() => {
            // Non-critical; plan mapping section will show empty tier list
        });
    }, []);

    useEffect(() => {
        setHasInitializedDefaultMappings(false);
        setHasUserEditedTierMappings(false);
        setRemotePlansFetchError('');
    }, [id]);

    const handleTierMappingChange = (localTierName, remotePlanReference) => {
        setHasUserEditedTierMappings(true);
        setHasInitializedDefaultMappings(true);
        setTierMappings((prev) => {
            const existing = prev.filter((m) => m.localTierName !== localTierName);
            if (remotePlanReference) {
                return [...existing, { localTierName, remotePlanReference }];
            }
            return existing;
        });
    };

    const getMappedPlanId = (localTierName) => {
        const mapping = tierMappings.find((m) => m.localTierName === localTierName);
        return mapping ? (mapping.remotePlanReference?.id || '') : '';
    };

    const gatewayConfig = settings.gatewayConfiguration
        ? settings.gatewayConfiguration.find((gateway) => gateway.type === gatewayType)
        : null;
    const isPlanMappingSupported = gatewayConfig?.planMappingSupported === true;
    const isSubscriptionlessSupported = gatewayConfig?.subscriptionlessSupported === true;
    const supportedApiTypes = (gatewayConfig?.supportedApiTypes || [])
        .map((apiType) => normalizeApiType(apiType))
        .filter(Boolean);

    const visibleLocalTiers = localTiers.filter((tier) => (
        (supportedApiTypes.length === 0 || supportedApiTypes.includes(tier.apiType))
        && (isSubscriptionlessSupported || !SUBSCRIPTIONLESS_LOCAL_POLICIES.has(tier.name))
    ));
    const visibleLocalTierNames = new Set(visibleLocalTiers.map((tier) => tier.name));

    const groupOrder = supportedApiTypes.length > 0
        ? supportedApiTypes
        : [...new Set(visibleLocalTiers.map((tier) => tier.apiType))];

    const groupedLocalTiers = groupOrder
        .map((apiType) => ({
            apiType,
            tiers: visibleLocalTiers.filter((tier) => tier.apiType === apiType),
        }))
        .filter((group) => group.tiers.length > 0);

    const buildVhostDto = () => {
        const gatewaysProvidedByWSO2 = ['Regular', 'APK'];
        const vhostDto = [];
        if (gatewayType === 'Regular') {
            vhosts.forEach((vhost) => {
                vhostDto.push({
                    host: vhost.host,
                    httpContext: vhost.httpContext,
                    httpPort: vhost.httpPort,
                    httpsPort: vhost.httpsPort,
                    wsPort: vhost.wsPort,
                    wssPort: vhost.wssPort,
                });
            });
        } else if (gatewayType === 'APK') {
            vhosts.forEach((vhost) => {
                vhostDto.push({
                    host: vhost.host,
                    httpContext: vhost.httpContext,
                    httpPort: vhost.httpPort,
                    httpsPort: vhost.httpsPort,
                });
            });
        } else if (!gatewaysProvidedByWSO2.includes(gatewayType)) {
            vhosts.forEach((vhost) => {
                vhostDto.push({
                    host: vhost.host,
                    httpContext: vhost.httpContext,
                    httpPort: vhost.httpPort,
                    httpsPort: vhost.httpsPort,
                });
            });
        }
        return vhostDto;
    };

    const buildAdditionalPropertiesArrayDTO = () => {
        const additionalPropertiesArrayDTO = [];
        Object.keys(state.additionalProperties).forEach((key) => {
            additionalPropertiesArrayDTO.push({ key, value: state.additionalProperties[key] });
        });
        return additionalPropertiesArrayDTO;
    };

    const resolveProvider = () => {
        const gatewaysProvidedByWSO2 = ['Regular', 'APK'];
        return gatewaysProvidedByWSO2.includes(gatewayType) ? 'wso2' : 'external';
    };

    const hasGatewayConnectorConfigErrors = (connectorConfigurations) => {
        for (const connectorConfig of connectorConfigurations) {
            if (connectorConfig.required && (!additionalProperties[connectorConfig.name]
                || additionalProperties[connectorConfig.name] === '')) {
                return true;
            }
            if (connectorConfig.values && connectorConfig.values.length > 0
                && additionalProperties[connectorConfig.name]) {
                const selectedOption = connectorConfig.values.find((option) => {
                    if (typeof option === 'string') {
                        return option === additionalProperties[connectorConfig.name];
                    }
                    return option.name === additionalProperties[connectorConfig.name];
                });
                if (selectedOption && typeof selectedOption === 'object' && selectedOption.values) {
                    if (hasGatewayConnectorConfigErrors(selectedOption.values)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const hasConnectorConfigChanged = () => {
        if (!id) {
            return true;
        }
        const currentProperties = state.additionalProperties || {};
        const allKeys = new Set([
            ...Object.keys(currentProperties),
            ...Object.keys(initialAdditionalProperties || {}),
        ]);
        for (const key of allKeys) {
            if ((currentProperties[key] || '') !== (initialAdditionalProperties[key] || '')) {
                return true;
            }
        }
        return false;
    };

    const buildRemotePlanLookupRequest = () => {
        if (id && !hasConnectorConfigChanged()) {
            return { environmentId: id };
        }
        return {
            environment: {
                name: name.trim() || 'temp-environment',
                displayName: displayName || name.trim() || 'temp-environment',
                type,
                description,
                gatewayType,
                mode: gatewayMode,
                apiDiscoveryScheduledWindow: scheduledInterval,
                vhosts: buildVhostDto(),
                permissions: {
                    permissionType: state.permissions.permissionType,
                    roles: roles.concat(validRoles),
                },
                additionalProperties: buildAdditionalPropertiesArrayDTO(),
                provider: resolveProvider(),
            },
        };
    };

    useEffect(() => {
        if (!isPlanMappingSupported || gatewayType === 'other'
                || hasGatewayConnectorConfigErrors(gatewayConfigurations)) {
            setRemotePlans([]);
            setLoadingRemotePlans(false);
            setRemotePlansFetchError('');
            return () => {};
        }

        let isCancelled = false;
        const timer = setTimeout(() => {
            setLoadingRemotePlans(true);
            setRemotePlansFetchError('');
            if (!hasUserEditedTierMappings) {
                setHasInitializedDefaultMappings(false);
            }
            new API().getEnvironmentRemotePlans(buildRemotePlanLookupRequest()).then((result) => {
                if (!isCancelled) {
                    const { body } = result;
                    setRemotePlans(body.list || []);
                }
            })
                .catch((error) => {
                    if (!isCancelled) {
                        const { response } = error;
                        if (response && response.body) {
                            setRemotePlansFetchError(response.body.description);
                        } else {
                            setRemotePlansFetchError(intl.formatMessage({
                                id: 'GatewayEnvironments.PlanMapping.fetch.error',
                                defaultMessage: 'Failed to fetch remote plans from the gateway.',
                            }));
                        }
                        setRemotePlans([]);
                    }
                })
                .finally(() => {
                    if (!isCancelled) {
                        setLoadingRemotePlans(false);
                    }
                });
        }, 400);

        return () => {
            clearTimeout(timer);
            isCancelled = true;
        };
    }, [
        id,
        intl,
        isPlanMappingSupported,
        gatewayType,
        gatewayConfigurations,
        additionalProperties,
        name,
        displayName,
        description,
        type,
        gatewayMode,
        scheduledInterval,
        vhosts,
        roles,
        validRoles,
        state.permissions.permissionType,
        state.additionalProperties,
        hasUserEditedTierMappings,
    ]);

    useEffect(() => {
        if (!isPlanMappingSupported || hasInitializedDefaultMappings || hasUserEditedTierMappings) {
            return;
        }
        if (remotePlans.length === 0 || visibleLocalTiers.length === 0) {
            return;
        }
        const defaultRemotePlan = remotePlans[0];
        setTierMappings((prev) => {
            const remotePlanIds = new Set(remotePlans.map((plan) => plan.id));
            const existingMappingsByTier = new Map(prev.map((mapping) => [mapping.localTierName, mapping]));
            const hiddenMappings = prev.filter((mapping) => !visibleLocalTierNames.has(mapping.localTierName));
            const normalizedVisibleMappings = visibleLocalTiers.map((tier) => {
                const existing = existingMappingsByTier.get(tier.name);
                if (existing?.remotePlanReference?.id && remotePlanIds.has(existing.remotePlanReference.id)) {
                    return existing;
                }
                return {
                    localTierName: tier.name,
                    remotePlanReference: defaultRemotePlan,
                };
            });
            const nextMappings = [...hiddenMappings, ...normalizedVisibleMappings];
            if (JSON.stringify(prev) === JSON.stringify(nextMappings)) {
                return prev;
            }
            return nextMappings;
        });
        setHasInitializedDefaultMappings(true);
    }, [
        isPlanMappingSupported,
        hasInitializedDefaultMappings,
        hasUserEditedTierMappings,
        remotePlans,
        visibleLocalTiers,
        visibleLocalTierNames,
    ]);

    useEffect(() => {
        if (!isPlanMappingSupported || !hasUserEditedTierMappings || remotePlans.length === 0) {
            return;
        }
        const remotePlanIds = new Set(remotePlans.map((plan) => plan.id));
        const fallbackPlan = remotePlans[0];
        setTierMappings((prev) => {
            let changed = false;
            const next = prev.map((mapping) => {
                if (!visibleLocalTierNames.has(mapping.localTierName)) {
                    return mapping;
                }
                const mappedPlanId = mapping?.remotePlanReference?.id;
                if (mappedPlanId && !remotePlanIds.has(mappedPlanId)) {
                    changed = true;
                    return {
                        ...mapping,
                        remotePlanReference: fallbackPlan,
                    };
                }
                return mapping;
            });
            return changed ? next : prev;
        });
    }, [isPlanMappingSupported, hasUserEditedTierMappings, remotePlans, visibleLocalTierNames]);

    const getLocalApiTypeLabel = (apiType) => {
        switch (apiType) {
            case 'rest':
                return intl.formatMessage({
                    id: 'GatewayEnvironments.PlanMapping.apiType.rest',
                    defaultMessage: 'REST APIs',
                });
            case 'async':
                return intl.formatMessage({
                    id: 'GatewayEnvironments.PlanMapping.apiType.async',
                    defaultMessage: 'Async APIs',
                });
            case 'ai-api':
                return intl.formatMessage({
                    id: 'GatewayEnvironments.PlanMapping.apiType.ai',
                    defaultMessage: 'AI APIs',
                });
            default:
                return intl.formatMessage({
                    id: 'GatewayEnvironments.PlanMapping.apiType.other',
                    defaultMessage: 'Other APIs',
                });
        }
    };

    let permissionType = '';
    if (permissions) {
        permissionType = state.permissions.permissionType;
    }
    const handleRoleDeletion = (role) => {
        if (invalidRoles.includes(role)) {
            const invalidRolesArray = invalidRoles.filter((existingRole) => existingRole !== role);
            setInvalidRoles(invalidRolesArray);
            if (invalidRolesArray.length === 0) {
                setRoleValidity(true);
            }
        } else if (roles.includes(role)) {
            setRoles(roles.filter((existingRole) => existingRole !== role));
        } else {
            setValidRoles(validRoles.filter((existingRole) => existingRole !== role));
        }
    };

    const restApi = new API();
    const handleRoleAddition = (role) => {
        const promise = restApi.validateSystemRole(base64url.encode(role));
        promise
            .then(() => {
                // Check if the role is already added
                if (roles.includes(role) || validRoles.includes(role) || invalidRoles.includes(role)) {
                    Alert.error('Role already added: ' + role);
                    return;
                }

                setValidRoles(validRoles.concat(role));
                if (invalidRoles.length === 0) {
                    setRoleValidity(true);
                } else {
                    setRoleValidity(false);
                }
            })
            .catch((error) => {
                if (error.status === 404) {
                    setInvalidRoles(invalidRoles.concat(role));
                    setRoleValidity(false);
                } else {
                    Alert.error('Error when validating role: ' + role);
                    console.error('Error when validating role ' + error);
                }
            });
    };

    const setAdditionalProperties = (key, value) => {
        const clonedAdditionalProperties = cloneDeep(additionalProperties);
        if (value === undefined) {
            delete clonedAdditionalProperties[key];
        } else {
            clonedAdditionalProperties[key] = value;
        }
        dispatch({ field: 'additionalProperties', value: clonedAdditionalProperties });
    };

    const onChange = (e) => {
        if (e.target.name === 'GatewayPermissionRestrict') {
            permissionType = e.target.value;
            dispatch({ field: 'permissionType', value: permissionType });
        }
        dispatch({ field: e.target.name, value: e.target.value });
    };

    useEffect(() => {
        if (!supportedModes?.includes(gatewayMode) && supportedModes?.length > 0) {
            onChange({
                target: {
                    name: 'gatewayMode',
                    value: supportedModes[0],
                },
            });
        }
    }, [supportedModes]);

    /* const getBorderColor = (gatewayTypeNew) => {
        return gatewayType === gatewayTypeNew
            ? '2px solid #1976D2'
            : '2px solid gray';
    }; */

    const handleHostValidation = (vhost) => {
        if (!vhost) {
            return false;
        }
        if (!vhost.host) {
            return (
                intl.formatMessage({
                    id: 'GatewayEnvironments.AddEditGWEnvironment.form.vhost.host.empty',
                    defaultMessage: 'Host of Vhost is empty',
                })
            );
        }

        // same pattern used in admin Rest API
        const httpContextRegex = /^\/?([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])*$/g;
        // empty http context are valid
        const validHttpContext = !vhost.httpContext || vhost.httpContext.match(httpContextRegex);
        if (!validHttpContext) {
            return (
                intl.formatMessage({
                    id: 'GatewayEnvironments.AddEditGWEnvironment.form.vhost.context.invalid',
                    defaultMessage: 'Invalid Http context',
                })
            );
        }

        // skip port validation for external gateways
        const portValidatingGWTypes = ['Regular', 'APK'];
        if (portValidatingGWTypes.includes(gatewayType)) {
            let portError;
            const ports = ['httpPort', 'httpsPort', 'wsPort', 'wssPort'];
            for (const port of ports) {
                portError = Number.isInteger(vhost[port])
                    && vhost[port] >= 1 && vhost[port] <= 65535 ? '' : 'Invalid Port';
                if (portError) {
                    return portError;
                }
            }
        }
        return false;
    };

    const hasErrors = (fieldName, value, validatingActive) => {
        let error;
        if (!validatingActive) {
            return false;
        }
        switch (fieldName) {
            case 'name':
                if (value === undefined) {
                    error = false;
                    break;
                }
                if (value === '') {
                    error = (
                        intl.formatMessage({
                            id: 'GatewayEnvironments.AddEditGWEnvironment.form.environment.name.empty',
                            defaultMessage: 'Name is Empty',
                        })
                    );
                } else if (!((/^[A-Za-z0-9_-]+$/)).test(value)) {
                    error = (
                        intl.formatMessage({
                            id: 'GatewayEnvironments.AddEditGWEnvironment.form.environment.name.invalid',
                            defaultMessage: 'Name must not contain special characters or spaces',
                        })
                    );
                } else {
                    error = false;
                }
                break;
            case 'displayName':
                if (value === undefined) {
                    error = false;
                    break;
                }
                if (value === '') {
                    error = (
                        intl.formatMessage({
                            id: 'GatewayEnvironments.AddEditGWEnvironment.form.environment.displayName.empty',
                            defaultMessage: 'Display Name is Empty',
                        })
                    );
                }
                break;
            case 'vhosts': {
                if (value === undefined) {
                    error = false;
                    break;
                }
                if (value.length === 0) {
                    error = (
                        intl.formatMessage({
                            id: 'AdminPagesGatewayEnvironments.AddEditGWEnvironment.form.environment.vhost.empty',
                            defaultMessage: 'VHost is empty',
                        })
                    );
                    break;
                }
                const hosts = value.map((vhost) => vhost.host);
                if (hosts.length !== new Set(hosts).size) {
                    error = (
                        intl.formatMessage({
                            id: 'AdminPagesGatewayEnvironments.AddEditGWEnvironment.form.environment.vhost.duplicate',
                            defaultMessage: 'VHosts are duplicated',
                        })
                    );
                    break;
                }
                for (const host of value) {
                    error = handleHostValidation(host);
                    if (error) {
                        break;
                    }
                }
                break;
            }
            case 'scheduledInterval':
                if (value === '') {
                    error = intl.formatMessage({
                        id: 'AdminPagesGatewayEnvironments.AddEditGWEnvironment.form.environment'
                        + '.scheduledInterval.empty',
                        defaultMessage: 'Scheduled interval is empty',
                    });
                } else if (parseInt(value, 10) < 0) {
                    error = intl.formatMessage({
                        id: 'AdminPagesGatewayEnvironments.AddEditGWEnvironment.form.environment'
                        + '.scheduledInterval.parse',
                        defaultMessage: 'Invalid scheduled interval',
                    });
                } else {
                    error = '';
                }
                break;
            case 'gatewayConfig':
                if (value === '') {
                    error = intl.formatMessage({
                        id: 'GatewayEnvironments.AddEditGWEnvironment.form.gateway.config.empty',
                        defaultMessage: 'Required field is empty',
                    });
                }
                break;
            default:
                break;
        }
        return error;
    };
    const getAllFormErrors = () => {
        let errorText = '';
        const nameErrors = hasErrors('name', name, true);
        const displayNameErrors = hasErrors('displayName', displayName, true);
        const vhostErrors = hasErrors('vhosts', vhosts, true);
        const scheduledIntervalErrors = hasErrors('scheduledInterval', scheduledInterval, true);
        if (nameErrors) {
            errorText += nameErrors + '\n';
        }
        if (displayNameErrors) {
            errorText += displayNameErrors + '\n';
        }
        if (vhostErrors) {
            errorText += vhostErrors + '\n';
        }
        if (scheduledIntervalErrors) {
            errorText += scheduledIntervalErrors + '\n';
        }
        let gatewayConnectorConfigHasErrors = false;

        const checkGatewayConnectorConfigErrors = (connectorConfigurations) => {
            for (const connectorConfig of connectorConfigurations) {
                if (connectorConfig.required && (!additionalProperties[connectorConfig.name]
                    || additionalProperties[connectorConfig.name] === '')) {
                    return true;
                }

                if (connectorConfig.values && connectorConfig.values.length > 0
                        && additionalProperties[connectorConfig.name]) {
                    const selectedOption = connectorConfig.values.find((option) => {
                        if (typeof option === 'string') {
                            return option === additionalProperties[connectorConfig.name];
                        }
                        return option.name === additionalProperties[connectorConfig.name];
                    });

                    if (selectedOption && typeof selectedOption === 'object' && selectedOption.values) {
                        if (checkGatewayConnectorConfigErrors(selectedOption.values)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        gatewayConnectorConfigHasErrors = checkGatewayConnectorConfigErrors(gatewayConfigurations);

        if (gatewayConnectorConfigHasErrors) {
            const errorConfig = intl.formatMessage({
                id: 'GatewayEnvironments.AddEditGWEnvironment.form.gateway.config.has.errors',
                defaultMessage: 'Connector configuration has errors',
            });
            errorText += errorConfig + '\n';
        }
        return errorText;
    };
    const formSaveCallback = () => {
        setValidating(true);
        const formErrors = getAllFormErrors();
        if (formErrors !== '') {
            Alert.error(intl.formatMessage({
                id: 'GatewayEnvironments.AddEditGWEnvironment.form.has.errors',
                defaultMessage: 'One or more fields contain errors',
            }));
            return false;
        }

        setSaving(true);
        const vhostDto = buildVhostDto();
        const provider = resolveProvider();

        permissions.permissionType = state.permissions.permissionType;
        permissions.roles = roles.concat(validRoles);

        const additionalPropertiesArrayDTO = buildAdditionalPropertiesArrayDTO();

        if (isPlanMappingSupported) {
            if (loadingRemotePlans) {
                Alert.error(intl.formatMessage({
                    id: 'GatewayEnvironments.PlanMapping.fetch.pending.error',
                    defaultMessage: 'Please wait until remote plans are loaded before saving.',
                }));
                setSaving(false);
                return false;
            }
            if (remotePlansFetchError) {
                Alert.error(remotePlansFetchError);
                setSaving(false);
                return false;
            }
        }

        const filteredTierMappings = isPlanMappingSupported
            ? tierMappings.filter((mapping) => (
                !!mapping
                && !!mapping.localTierName
                && visibleLocalTierNames.has(mapping.localTierName)
            ))
            : [];
        const promiseAPICall = id
            ? restApi.updateGatewayEnvironment(id, name.trim(), displayName, type, description,
                gatewayType, gatewayMode, scheduledInterval, vhostDto, permissions, additionalPropertiesArrayDTO,
                provider, filteredTierMappings)
            : restApi.addGatewayEnvironment(name.trim(), displayName, type, description,
                gatewayType, gatewayMode, scheduledInterval, vhostDto, permissions, additionalPropertiesArrayDTO,
                provider, filteredTierMappings);

        promiseAPICall.then(() => {
            if (id) {
                Alert.success(`${name} ${intl.formatMessage({
                    id: 'Environment.edit.success',
                    defaultMessage: ' - Gateway Environment edited successfully.',
                })}`);
            } else {
                Alert.success(`${name} ${intl.formatMessage({
                    id: 'Environment.add.success',
                    defaultMessage: ' - Gateway Environment added successfully.',
                })}`);
            }
            setSaving(false);
            history.push('/settings/environments/');
        }).catch((error) => {
            const { response } = error;
            if (response.body) {
                Alert.error(response.body.description);
            }
            setSaving(false);
        });
        return true;
    };

    const pageTitle = id ? `${intl.formatMessage({
        id: 'Gateways.AddEditGateway.title.edit',
        defaultMessage: 'Gateway Environment - Edit ',
    })} ${state.name}` : intl.formatMessage({
        id: 'Gateways.AddEditGateway.title.new',
        defaultMessage: 'Gateway Environment - Create new',
    });

    const getDisplayName = (value) => {
        if (value === 'Regular') {
            return 'Universal Gateway';
        } else if (value === 'APK') {
            return 'Kubernetes Gateway';
        } else {
            return value + ' Gateway';
        }
    };

    const GW_MODE_METADATA = {
        WRITE_ONLY: {
            displayName: 'Write-Only',
            helperText: 'APIs can only be deployed to the Gateway',
        },
        READ_ONLY: {
            displayName: 'Read-Only',
            helperText: 'APIs can only be discovered from the Gateway',
        },
        READ_WRITE: {
            displayName: 'Read-Write',
            helperText: 'APIs can be both deployed to and discovered from the Gateway',
        },
    };

    return (
        <StyledContentBase
            pageStyle='half'
            title={pageTitle}
            help={<div />}
        >
            <Box component='div' m={2} sx={(theme) => ({ mb: theme.spacing(10) })}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={12} lg={3}>
                        <Typography
                            color='inherit'
                            variant='subtitle2'
                            component='div'
                            id='GatewayEnvironments.AddEditGWEnvironment.general.details.div'
                        >
                            <FormattedMessage
                                id='GatewayEnvironments.AddEditGWEnvironment.general.details'
                                defaultMessage='General Details'
                            />
                        </Typography>
                        <Typography
                            color='inherit'
                            variant='caption'
                            component='p'
                            id='GatewayEnvironments.AddEditGWEnvironment.general.details.description.div'
                        >
                            <FormattedMessage
                                id='GatewayEnvironments.AddEditGWEnvironment.general.details.description'
                                defaultMessage='Provide name and description of the Gateway Environment'
                            />
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={12} lg={9}>
                        <Box component='div' m={1}>
                            <Grid container>
                                <Grid item xs={6}>
                                    <TextField
                                        id='name'
                                        autoFocus
                                        margin='dense'
                                        name='name'
                                        label={(
                                            <span>
                                                <FormattedMessage
                                                    id='GatewayEnvironments.AddEditGWEnvironment.form.name'
                                                    defaultMessage='Name'
                                                />

                                                <StyledSpan>*</StyledSpan>
                                            </span>
                                        )}
                                        fullWidth
                                        variant='outlined'
                                        value={state.name}
                                        disabled={!!id || isReadOnly}
                                        onChange={(e) => dispatch({
                                            field: 'name',
                                            value: e.target.value,
                                        })}
                                        error={hasErrors('name', state.name, validating)}
                                        helperText={hasErrors('name', state.name, validating) || intl.formatMessage({
                                            id: 'GatewayEnvironments.AddEditGWEnvironment.form.name.help',
                                            defaultMessage: 'Name of the Gateway Environment.',
                                        })}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <Box ml={1}>
                                        <TextField
                                            id='displayName'
                                            margin='dense'
                                            name='displayName'
                                            fullWidth
                                            variant='outlined'
                                            value={state.displayName}
                                            disabled={!!id || isReadOnly}
                                            onChange={(e) => dispatch({
                                                field: 'displayName',
                                                value: e.target.value,
                                            })}
                                            label={(
                                                <span>
                                                    <FormattedMessage
                                                        id='GatewayEnvironments.AddEditGWEnvironment.form.displayName'
                                                        defaultMessage='Display Name'
                                                    />
                                                    <StyledSpan>*</StyledSpan>
                                                </span>
                                            )}
                                            error={hasErrors('displayName', state.displayName, validating)}
                                            helperText={hasErrors('displayName', state.displayName, validating)
                                                || intl.formatMessage({
                                                    id: 'GatewayEnvironments.AddEditGWEnvironment.form.name.'
                                                        + 'form.displayName.help',
                                                    defaultMessage: 'Display name of the Gateway Environment.',
                                                })}
                                        />
                                    </Box>
                                </Grid>
                            </Grid>

                            <TextField
                                id='description'
                                multiline
                                minRows={4}
                                maxRows={10}
                                margin='dense'
                                name='description'
                                label={(
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.form.description'
                                        defaultMessage='Description'
                                    />
                                )}
                                fullWidth
                                variant='outlined'
                                value={state.description}
                                disabled={isReadOnly}
                                onChange={(e) => dispatch({
                                    field: 'description',
                                    value: e.target.value,
                                })}
                                helperText={intl.formatMessage({
                                    id: 'GatewayEnvironments.AddEditGWEnvironment.form.name.form.description.help',
                                    defaultMessage: 'Description of the Gateway Environment.',
                                })}
                            />
                        </Box>
                    </Grid>

                    <Grid item xs={12}>
                        <Box marginTop={2} marginBottom={2}>
                            <StyledHr />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={12} lg={3}>
                        <Typography
                            color='inherit'
                            variant='subtitle2'
                            component='div'
                            id='gatewayEnvironment-type'
                        >
                            <FormattedMessage
                                id='GatewayEnvironments.AddEditGWEnvironment.GatewayEnvironment.type'
                                defaultMessage='Gateway Environment Type'
                            />
                        </Typography>
                        <Typography
                            color='inherit'
                            variant='caption'
                            component='p'
                            id='AddEditGWEnvironment.External.GatewayEnvironment.description.container'
                        >
                            <FormattedMessage
                                id={'GatewayEnvironments.AddEditGWEnvironment.External.GatewayEnvironment'
                                    + '.general.details.description'}
                                defaultMessage='Gateway vendor'
                            />
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={12} lg={9}>
                        <Box component='div' m={1}>
                            <FormControl
                                variant='outlined'
                                fullWidth
                                error={hasErrors('type', type, validating)}
                            >
                                <InputLabel sx={{ position: 'relative' }}>
                                    <FormattedMessage
                                        defaultMessage='Gateway Environment Type'
                                        id='Admin.GatewayEnvironment.form.type'
                                    />
                                    <StyledSpan>*</StyledSpan>
                                </InputLabel>
                                <Select
                                    variant='outlined'
                                    id='Admin.GatewayEnvironment.form.type.select'
                                    name='gatewayType'
                                    value={gatewayType}
                                    disabled={!!id || isReadOnly}
                                    onChange={onChange}
                                    data-testid='gateway-environment-type-select'
                                >
                                    {settings.gatewayTypes.map((item) => (
                                        <MenuItem key={item} value={item}>
                                            {getDisplayName(item)}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>
                                    {hasErrors('gatewayType', type, validating) || (
                                        <FormattedMessage
                                            defaultMessage='Select Gateway Environment Type'
                                            id='GatewayEnvironments.AddEditGWEnvironment.form.type.help'
                                        />
                                    )}
                                </FormHelperText>
                            </FormControl>
                        </Box>
                    </Grid>
                    <Grid item xs={12}>
                        <Box marginTop={2} marginBottom={2}>
                            <StyledHr />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={12} lg={3}>
                        <Box display='flex' flexDirection='row' alignItems='center'>
                            <Box flex='1'>
                                <Typography color='inherit' variant='subtitle2' component='div'>
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.mode'
                                        defaultMessage='Gateway Mode'
                                    />
                                </Typography>
                                <Typography color='inherit' variant='caption' component='p'>
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.mode.description'
                                        defaultMessage='Deployability or discoverabilty of APIs'
                                    />
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={12} lg={9}>
                        <FormControl
                            variant='outlined'
                            fullWidth
                        >
                            <InputLabel id='demo-simple-select-label'>
                                <FormattedMessage
                                    id='GatewayEnvironments.AddEditGWEnvironment.form.mode.label'
                                    defaultMessage='Mode'
                                />
                            </InputLabel>
                            <Select
                                labelId='demo-simple-select-label'
                                id='demo-simple-select'
                                name='gatewayMode'
                                value={gatewayMode}
                                label={(
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.form.mode.select.label'
                                        defaultMessage='Mode'
                                    />
                                )}
                                onChange={onChange}
                                disabled={editMode}
                            >
                                {supportedModes?.length > 0
                                    && supportedModes.map((item) => (
                                        <MenuItem key={item} value={item}>
                                            <Box display='flex' flexDirection='column'>
                                                <Typography
                                                    color='inherit'
                                                    variant='subtitle3'
                                                    component='div'
                                                    id='GatewayEnvironments.AddEditGWEnvironment.mode.select.heading'
                                                >
                                                    {GW_MODE_METADATA[item]?.displayName || item}
                                                </Typography>
                                                <Typography
                                                    color='inherit'
                                                    variant='caption'
                                                    component='p'
                                                    id='GatewayEnvironments.AddEditGWEnvironment.mode.select
                                                    .helper'
                                                >
                                                    {GW_MODE_METADATA[item]?.helperText || item}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                            </Select>
                            <FormHelperText>
                                <FormattedMessage
                                    id='GatewayEnvironments.AddEditGWEnvironment.form.mode.helper.text'
                                    defaultMessage='Select the deployability or discoverability of APIs'
                                />
                            </FormHelperText>
                        </FormControl>
                        {
                            (gatewayMode === 'READ_ONLY' || gatewayMode === 'READ_WRITE')
                            && (
                                <Box display='flex' flexDirection='row'>
                                    <TextField
                                        margin='dense'
                                        name='scheduledInterval'
                                        value={scheduledInterval}
                                        onChange={onChange}
                                        disabled={isReadOnly}
                                        type='number'
                                        label={(
                                            <FormattedMessage
                                                id='GatewayEnvironments.AddEditGWEnvironment.form.mode
                                                .scheduled.interval'
                                                defaultMessage='API Discovery Scheduling Interval'
                                            />
                                        )}
                                        required
                                        error={hasErrors('scheduledInterval', state.scheduledInterval, validating)}
                                        helperText={hasErrors('scheduledInterval', state.scheduledInterval, validating)
                                            || intl.formatMessage({
                                                id: 'GatewayEnvironments.AddEditGWEnvironment.form.mode.'
                                                    + 'scheduledInterval.help',
                                                defaultMessage: 'Provide interval in minutes for scheduling API'
                                                + ' discovery',
                                            })}
                                        sx={{ width: 350, mt: 3 }}
                                        variant='outlined'
                                    />
                                </Box>
                            )
                        }
                    </Grid>
                    {(gatewayConfigurations && gatewayConfigurations.length > 0)
                    && (
                        <>
                            <Grid item xs={12}>
                                <Box marginTop={2} marginBottom={2}>
                                    <StyledHr />
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={12} lg={3}>
                                <Typography
                                    color='inherit'
                                    variant='subtitle2'
                                    component='div'
                                    id='GatewayEnvironments.AddEditGWEnvironment.connector.configurations.header'
                                >
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.connector.configurations'
                                        defaultMessage='Gateway Connector Configurations'
                                    />
                                </Typography>
                                <Typography
                                    color='inherit'
                                    variant='caption'
                                    component='p'
                                    id='GatewayEnvironments.AddEditGWEnvironment.connector.configurations.body'
                                >
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.connector.configurations
                                            .description'
                                        defaultMessage='Provide connection params for the selected Gateway Environment.'
                                    />
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={12} lg={9}>
                                <Box component='div' m={1}>
                                    <GatewayConfiguration
                                        gatewayConfigurations={gatewayConfigurations}
                                        additionalProperties={cloneDeep(additionalProperties)}
                                        setAdditionalProperties={setAdditionalProperties}
                                        hasErrors={hasErrors}
                                        validating={validating}
                                        gatewayId={cloneDeep(id)}
                                        isReadOnly={isReadOnly}
                                    />
                                </Box>
                            </Grid>
                        </>
                    )}

                    <Grid item xs={12}>
                        <Box marginTop={2} marginBottom={2}>
                            <StyledHr />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={12} lg={3}>
                        <Box display='flex' flexDirection='row' alignItems='center'>
                            <Box flex='1'>
                                <Typography color='inherit' variant='subtitle2' component='div'>
                                    <FormattedMessage
                                        id='GatewayEnvironment.type'
                                        defaultMessage='Key Type'
                                    />
                                </Typography>
                                <Typography color='inherit' variant='caption' component='p'>
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.type.description'
                                        defaultMessage='Key type supported by the Gateway Environment'
                                    />
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={12} lg={9}>
                        <FormControl
                            variant='outlined'
                            fullWidth
                        >
                            <InputLabel id='demo-simple-select-label'>
                                <FormattedMessage
                                    id='GatewayEnvironments.AddEditGWEnvironment.form.type.label'
                                    defaultMessage='Type'
                                />
                            </InputLabel>
                            <Select
                                labelId='demo-simple-select-label'
                                id='demo-simple-select'
                                value={type}
                                name='type'
                                label={(
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.form.type.label'
                                        defaultMessage='Type'
                                    />
                                )}
                                onChange={onChange}
                                disabled={editMode}
                            >
                                <MenuItem value='hybrid'>
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.form.type.hybrid.option'
                                        defaultMessage='Hybrid'
                                    />
                                </MenuItem>
                                <MenuItem value='production'>
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.form.type.prod.option'
                                        defaultMessage='Production'
                                    />
                                </MenuItem>
                                <MenuItem value='sandbox'>
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.form.type.sandbox.option'
                                        defaultMessage='Sandbox'
                                    />
                                </MenuItem>
                            </Select>
                            <FormHelperText>
                                <FormattedMessage
                                    id='GatewayEnvironments.AddEditGWEnvironment.form.type.helper.text'
                                    defaultMessage='Supported Key Type of the Gateway Environment'
                                />
                            </FormHelperText>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <Box marginTop={2} marginBottom={2}>
                            <StyledHr />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={12} lg={3}>
                        <Box display='flex' flexDirection='row' alignItems='center'>
                            <Box flex='1'>
                                <Typography color='inherit' variant='subtitle2' component='div'>
                                    <FormattedMessage
                                        id='GatewayEnvironment.visibility'
                                        defaultMessage='Visibility'
                                    />
                                </Typography>
                                <Typography color='inherit' variant='caption' component='p'>
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.visibility.add.description'
                                        defaultMessage='Visibility of the Gateway Environment'
                                    />
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={12} lg={9}>
                        <Box component='div' m={1}>
                            <FormControl
                                variant='outlined'
                                fullWidth
                            >
                                <InputLabel id='demo-simple-select-label' sx={{ position: 'relative' }}>
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.form.visibility'
                                        defaultMessage='Visibility'
                                    />
                                </InputLabel>
                                <Select
                                    labelId='demo-simple-select-label'
                                    id='demo-simple-select'
                                    value={permissionType}
                                    name='GatewayPermissionRestrict'
                                    label={(
                                        <FormattedMessage
                                            id='GatewayEnvironments.AddEditGWEnvironment.form.visibility.select'
                                            defaultMessage='Visibility'
                                        />
                                    )}
                                    onChange={onChange}
                                    disabled={isReadOnly}
                                >
                                    <MenuItem key='PUBLIC' value='PUBLIC'>
                                        <FormattedMessage
                                            id='GatewayEnvironments.AddEditGWEnvironment.form.visibility.public.option'
                                            defaultMessage='Public'
                                        />
                                    </MenuItem>
                                    <MenuItem key='Restricted' value='ALLOW'>
                                        <FormattedMessage
                                            id='GatewayEnvironments.AddEditGWEnvironment.form.visibility.allow.option'
                                            defaultMessage='Allow for role(s)'
                                        />
                                    </MenuItem>
                                    <MenuItem key='Restricted' value='DENY'>
                                        <FormattedMessage
                                            id='GatewayEnvironments.AddEditGWEnvironment.form.visibility.deny.option'
                                            defaultMessage='Deny for role(s)'
                                        />
                                    </MenuItem>
                                </Select>
                                <FormHelperText>
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.form.visibility.helper.text'
                                        defaultMessage='Visibility of the Gateway Environment'
                                    />
                                </FormHelperText>
                                <Box component='div' m={1}>
                                    {
                                        (permissionType === 'ALLOW' || permissionType === 'DENY')
                                        && (
                                            <Box
                                                display='flex'
                                                flexDirection='row'
                                                alignItems='center'
                                                margin='dense'
                                                sx={{
                                                    marginRight: '30px',
                                                    marginLeft: '10px',
                                                    marginTop: '10px',
                                                    marginBottom: '10px',
                                                }}
                                            >
                                                <MuiChipsInput
                                                    fullWidth
                                                    label='Roles'
                                                    InputLabelProps={{
                                                        shrink: true,
                                                    }}
                                                    name='GatewayEnvironmentPermissions'
                                                    variant='outlined'
                                                    value={roles.concat(validRoles, invalidRoles)}
                                                    alwaysShowPlaceholder={false}
                                                    placeholder='Enter roles and press Enter'
                                                    disabled={isReadOnly}
                                                    blurBehavior='clear'
                                                    data-testid='gateway-permission-roles'
                                                    InputProps={{
                                                        endAdornment: !roleValidity && (
                                                            <InputAdornment
                                                                position='end'
                                                                sx={{
                                                                    position: 'absolute',
                                                                    right: '25px',
                                                                    top: '50%',
                                                                }}
                                                            >
                                                                <Error color='error' />
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                    onAddChip={handleRoleAddition}
                                                    renderChip={(ChipComponent, key, ChipProps) => (
                                                        <ChipComponent
                                                            key={ChipProps.label}
                                                            label={ChipProps.label}
                                                            onDelete={() => handleRoleDeletion(ChipProps.label)}
                                                            data-testid={ChipProps.label}
                                                            style={{
                                                                backgroundColor:
                                                                    invalidRoles.includes(ChipProps.label)
                                                                        ? red[300] : null,
                                                                margin: '8px 8px 8px 0',
                                                                float: 'left',
                                                            }}
                                                        />
                                                    )}
                                                    error={!roleValidity}
                                                    helperText={
                                                        !roleValidity ? (
                                                            <FormattedMessage
                                                                id='Gateway.AddEditGWEnvironment.permission.Invalid'
                                                                defaultMessage='Invalid Role(s) Found'
                                                            />
                                                        ) : [
                                                            (permissionType === 'ALLOW'
                                                                ? (
                                                                    <FormattedMessage
                                                                        id='Gateway.AddEditGWEnvironment.permission.
                                                                            allowed'
                                                                        defaultMessage='Use of this Gateway Environment
                                                                            is "Allowed" for above roles.'
                                                                    />
                                                                )
                                                                : (
                                                                    <FormattedMessage
                                                                        id='Gateway.AddEditGWEnvironment.permission
                                                                            .denied'
                                                                        defaultMessage='Use of this Gateway Environment
                                                                            is "Denied" for above roles.'
                                                                    />
                                                                )
                                                            ),
                                                            ' ',
                                                            <FormattedMessage
                                                                id='Gateway.AddEditGWEnvironment.permission.help'
                                                                defaultMessage='Enter a valid role and press `Enter`'
                                                            />,
                                                        ]
                                                    }
                                                />
                                            </Box>
                                        )
                                    }
                                </Box>
                            </FormControl>
                        </Box>
                    </Grid>
                    <Grid item xs={12}>
                        <Box marginTop={2} marginBottom={2}>
                            <StyledHr />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={12} lg={3}>
                        <Box display='flex' flexDirection='row' alignItems='center'>
                            <Box flex='1'>
                                <Typography color='inherit' variant='subtitle2' component='div'>
                                    <FormattedMessage
                                        id='GatewayEnvironment.vhosts'
                                        defaultMessage='Vhosts'
                                    />
                                </Typography>
                                <Typography color='inherit' variant='caption' component='p'>
                                    <FormattedMessage
                                        id='GatewayEnvironments.AddEditGWEnvironment.visibility.add.description'
                                        defaultMessage='Configure vhosts'
                                    />
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={12} lg={9}>
                        <Box component='div' m={1}>
                            <AddEditVhost
                                initialVhosts={vhosts}
                                onVhostChange={onChange}
                                gatewayType={gatewayType}
                                isEditMode={editMode}
                                isReadOnly={isReadOnly}
                            />
                        </Box>
                    </Grid>
                    {/* Plan Mapping Section - enabled only when gateway capability supports it */}
                    {isPlanMappingSupported && (
                        <>
                            <Grid item xs={12}>
                                <Box marginTop={2} marginBottom={2}>
                                    <StyledHr />
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={12} lg={3}>
                                <Box display='flex' flexDirection='row' alignItems='center'>
                                    <Box flex='1'>
                                        <Typography color='inherit' variant='subtitle2' component='div'>
                                            <FormattedMessage
                                                id='GatewayEnvironments.PlanMapping.title'
                                                defaultMessage='Plan Mapping'
                                            />
                                        </Typography>
                                        <Typography color='inherit' variant='caption' component='p'>
                                            <FormattedMessage
                                                id='GatewayEnvironments.PlanMapping.description'
                                                defaultMessage={'Map local WSO2 subscription'
                                                + 'tiers to remote gateway plans.'}
                                            />
                                        </Typography>
                                        <Typography color='inherit' variant='caption' component='p'>
                                            <FormattedMessage
                                                id='GatewayEnvironments.PlanMapping.subscribableOnly.description'
                                                defaultMessage={'Only subscribable local plans are listed.'
                                                    + ' Subscriptionless plans are'
                                                    + ' shown only when the gateway supports them.'}
                                            />
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={12} lg={9}>
                                <Box component='div' m={1}>
                                    <Box display='flex' alignItems='center' mb={2}>
                                        {loadingRemotePlans && (
                                            <CircularProgress size={14} style={{ marginRight: 6 }} />
                                        )}
                                        {remotePlansFetchError && (
                                            <Typography variant='caption' color='error' style={{ marginRight: 8 }}>
                                                {remotePlansFetchError}
                                            </Typography>
                                        )}
                                        {remotePlans.length > 0 && (
                                            <Typography variant='caption'>
                                                <FormattedMessage
                                                    id='GatewayEnvironments.PlanMapping.plansLoaded'
                                                    defaultMessage='{count} remote plans loaded'
                                                    values={{ count: remotePlans.length }}
                                                />
                                            </Typography>
                                        )}
                                    </Box>
                                    {groupedLocalTiers.length > 0 && (
                                        <Table size='small'>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>
                                                        <FormattedMessage
                                                            id='GatewayEnvironments.PlanMapping.localTier'
                                                            defaultMessage='Local Tier'
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormattedMessage
                                                            id='GatewayEnvironments.PlanMapping.remotePlan'
                                                            defaultMessage='Remote Plan'
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {groupedLocalTiers.map((group) => (
                                                    <React.Fragment key={group.apiType}>
                                                        <TableRow>
                                                            <TableCell colSpan={2}>
                                                                <Typography variant='subtitle2'>
                                                                    {getLocalApiTypeLabel(group.apiType)}
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                        {group.tiers.map((tier) => (
                                                            <TableRow key={tier.name}>
                                                                <TableCell>
                                                                    <Typography variant='body2'>
                                                                        {tier.displayName}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <FormControl
                                                                        fullWidth
                                                                        size='small'
                                                                        disabled={isReadOnly}
                                                                    >
                                                                        <Select
                                                                            value={getMappedPlanId(tier.name)}
                                                                            displayEmpty
                                                                            onChange={(e) => {
                                                                                const plan = remotePlans.find(
                                                                                    (p) => p.id === e.target.value,
                                                                                );
                                                                                handleTierMappingChange(
                                                                                    tier.name,
                                                                                    plan || null,
                                                                                );
                                                                            }}
                                                                        >
                                                                            <MenuItem value=''>
                                                                                <em>
                                                                                    <FormattedMessage
                                                                                        id={
                                                                                            'GatewayEnvironments.'
                                                                                            + 'PlanMapping.noMapping'
                                                                                        }
                                                                                        defaultMessage='No mapping'
                                                                                    />
                                                                                </em>
                                                                            </MenuItem>
                                                                            {remotePlans.map((plan) => (
                                                                                <MenuItem key={plan.id} value={plan.id}>
                                                                                    {plan.name}
                                                                                </MenuItem>
                                                                            ))}
                                                                            {/*
                                                                             * Show saved mapping
                                                                             * label when remote plans
                                                                             * not yet fetched.
                                                                             */}
                                                                            {remotePlans.length === 0
                                                                                && getMappedPlanId(tier.name) && (
                                                                                <MenuItem
                                                                                    key={getMappedPlanId(tier.name)}
                                                                                    value={getMappedPlanId(tier.name)}
                                                                                >
                                                                                    {tierMappings.find(
                                                                                        (m) => m.localTierName
                                                                                        === tier.name,
                                                                                    )?.remotePlanReference?.name
                                                                                    || getMappedPlanId(tier.name)}
                                                                                </MenuItem>
                                                                            )}
                                                                        </Select>
                                                                    </FormControl>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                    {localTiers.length > 0 && groupedLocalTiers.length === 0 && (
                                        <Typography variant='caption'>
                                            <FormattedMessage
                                                id='GatewayEnvironments.PlanMapping.noCompatibleLocalPlans'
                                                defaultMessage={'No local subscription plans match the'
                                                    + ' supported API types of this gateway.'}
                                            />
                                        </Typography>
                                    )}
                                </Box>
                            </Grid>
                        </>
                    )}
                    <Grid item xs={12}>
                        <Box marginTop={2} marginBottom={2}>
                            <StyledHr />
                        </Box>
                    </Grid>
                    <Grid item xs={12} mb={2}>
                        <Box component='span' m={1}>
                            <Button
                                id='gateway-add'
                                variant='contained'
                                color='primary'
                                onClick={formSaveCallback}
                                disabled={!roleValidity || isReadOnly}
                                data-testid='form-dialog-base-save-btn'
                            >
                                {saving ? (<CircularProgress size={16} />) : (
                                    <>
                                        {id ? (
                                            <FormattedMessage
                                                id='GatewayEnvironments.AddEditGWEnvironment.form.update.btn'
                                                defaultMessage='Update'
                                            />
                                        ) : (
                                            <FormattedMessage
                                                id='GatewayEnvironments.AddEditGWEnvironment.form.add'
                                                defaultMessage='Add'
                                            />
                                        )}
                                    </>
                                )}
                            </Button>
                        </Box>
                        <RouterLink to='/settings/environments'>
                            <Button variant='outlined'>
                                <FormattedMessage
                                    id='GatewayEnvironments.AddEditGWEnvironment.form.cancel'
                                    defaultMessage='Cancel'
                                />
                            </Button>
                        </RouterLink>
                    </Grid>
                </Grid>
            </Box>
        </StyledContentBase>
    );
}

AddEditGWEnvironment.defaultProps = {
    dataRow: null,
};

AddEditGWEnvironment.propTypes = {
    dataRow: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        isReadOnly: PropTypes.bool.isRequired,
        vhosts: PropTypes.shape([]),
    }),
    triggerButtonText: PropTypes.shape({}).isRequired,
    title: PropTypes.shape({}).isRequired,
};

export default AddEditGWEnvironment;
