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

import React, { useState, useContext, useEffect, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { FormattedMessage } from 'react-intl';
import APIContext from 'AppComponents/Apis/Details/components/ApiContext';
import API from 'AppData/api.js';
import AppAlert from 'AppComponents/Shared/Alert';
import Progress from 'AppComponents/Shared/Progress';
import {getSubscriptionOptionsEditor, getInvocationRenderer} from './FederationConfigRegistry';

const PREFIX = 'FederationConfig';

const classes = {
    root: `${PREFIX}-root`,
    paper: `${PREFIX}-paper`,
    sectionTitle: `${PREFIX}-sectionTitle`,
};

const Root = styled('div')(({ theme }) => ({
    [`&.${classes.root}`]: {
        padding: theme.spacing(3),
        maxWidth: 900,
    },
    [`& .${classes.paper}`]: {
        padding: theme.spacing(3),
        marginBottom: theme.spacing(2),
    },
    [`& .${classes.sectionTitle}`]: {
        fontWeight: 500,
        marginBottom: theme.spacing(1),
    },
}));

/**
 * Parse subscription options body from a GatewaySupportSnapshot.
 * Returns the parsed body object (with plans[].enabled flags) or null.
 */
function parseOptionsBody(snapshotOptions) {
    if (!snapshotOptions?.body) return null;
    try {
        return typeof snapshotOptions.body === 'string'
            ? JSON.parse(snapshotOptions.body) : snapshotOptions.body;
    } catch {
        return null;
    }
}

/**
 * Publisher Subscription Configuration page.
 * Uses schema-driven registry for subscription options editing.
 * Sends curatedPlanSelections [{planId, enabled}] on save.
 */
function FederationConfig({ subscriptionSupported = false }) {
    const { api } = useContext(APIContext);
    const apiId = api.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState(null);
    const [error, setError] = useState(null);

    // Editable state
    const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
    const [curatedPlans, setCuratedPlans] = useState(null);

    const fetchConfig = useCallback(() => {
        setLoading(true);
        setError(null);
        API.getApiFederationConfig(apiId)
            .then((response) => {
                const data = response.body;
                setConfig(data);
                setSubscriptionEnabled(data.subscriptionEnabled || false);

                // Use publisherCuratedConfig (has enabled flags) or fall back to live snapshot
                const source = data.publisherCuratedConfig || data.gatewaySupportSnapshot;
                const parsed = parseOptionsBody(source?.subscriptionOptions);
                setCuratedPlans(parsed);
            })
            .catch((err) => {
                console.error('Error fetching federation config:', err);
                if (err.status === 404) {
                    setConfig(null);
                    setSubscriptionEnabled(false);
                    setCuratedPlans(null);
                } else {
                    setError('Failed to load federation configuration.');
                }
            })
            .finally(() => setLoading(false));
    }, [apiId]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const snapshot = config?.gatewaySupportSnapshot;
    const curatedConfig = config?.publisherCuratedConfig;
    const displaySource = curatedConfig || snapshot;
    const isStale = config?.isStale;
    const hasNoConfig = !config;
    const schemaName = displaySource?.subscriptionOptions?.schemaName;
    const OptionsEditor = getSubscriptionOptionsEditor(schemaName);

    const invocationTemplate = displaySource?.invocationTemplate;
    const InvocationRenderer = getInvocationRenderer(invocationTemplate?.schemaName);

    const handlePlanToggle = (planId, enabled) => {
        setCuratedPlans((prev) => {
            if (!prev?.plans) return prev;
            return {
                ...prev,
                plans: prev.plans.map((p) =>
                    (p.id === planId ? { ...p, enabled } : p)),
            };
        });
    };

    const handleOptionGroupChange = (type, groupId, data) => {
        setCuratedPlans((prev) => {
            if (!prev?.groups) return prev;
            return {
                ...prev,
                groups: prev.groups.map((g) => {
                    if (g.groupId !== groupId) return g;
                    if (type === 'required') return { ...g, required: data.required };
                    if (type === 'item') {
                        return {
                            ...g,
                            items: g.items.map((item) =>
                                (item.id === data.itemId ? { ...item, enabled: data.enabled } : item)),
                        };
                    }
                    return g;
                }),
            };
        });
    };

    const handleLoadLatest = () => {
        // Use the already-fetched gatewaySupportSnapshot as the new curated config
        const snap = config?.gatewaySupportSnapshot;
        if (!snap) return;
        const parsed = parseOptionsBody(snap.subscriptionOptions);
        setCuratedPlans(parsed);
        // Clear stale flag locally since the user has now reviewed the latest snapshot
        setConfig((prev) => ({ ...prev, isStale: false, publisherCuratedConfig: snap }));
    };

    const handleSave = () => {
        setSaving(true);

        let curatedPlanSelections = null;
        if (schemaName === 'option-groups' && curatedPlans?.groups) {
            // Build [{groupId, required, items: [{itemId, enabled}]}]
            const groupSelections = curatedPlans.groups.map((g) => ({
                groupId: g.groupId,
                required: g.required !== false,
                items: (g.items || []).map((item) => ({
                    itemId: item.id,
                    enabled: item.enabled !== false,
                })),
            }));
            curatedPlanSelections = groupSelections.length > 0 ? groupSelections : null;
        } else if (curatedPlans?.plans) {
            // subscription-plans: [{planId, enabled}]
            const planSelections = curatedPlans.plans.map((p) => ({
                planId: p.id,
                enabled: p.enabled !== false,
            }));
            curatedPlanSelections = planSelections.length > 0 ? planSelections : null;
        }

        const body = {
            ...(subscriptionSupported && { subscriptionEnabled }),
            curatedPlanSelections: curatedPlanSelections ? JSON.stringify(curatedPlanSelections) : null,
        };

        API.updateApiFederationConfig(apiId, body)
            .then(() => {
                AppAlert.info('Subscription configuration updated.');
                fetchConfig();
            })
            .catch((err) => {
                console.error('Error saving federation config:', err);
                AppAlert.error('Failed to save subscription configuration.');
            })
            .finally(() => setSaving(false));
    };

    if (loading) {
        return <Progress />;
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity='error'>{error}</Alert>
            </Box>
        );
    }

    return (
        <Root className={classes.root}>
            <Typography variant='h5' gutterBottom>
                <FormattedMessage
                    id='Apis.Details.FederationConfig.title'
                    defaultMessage='Subscriptions'
                />
            </Typography>
            <Typography variant='body2' color='textSecondary' gutterBottom>
                <FormattedMessage
                    id='Apis.Details.FederationConfig.description'
                    defaultMessage={
                        'Control subscription behavior and curation for this API '
                        + 'in the Developer Portal.'
                    }
                />
            </Typography>

            {/* Staleness Warning */}
            {isStale && (
                <Alert
                    severity='warning'
                    sx={{ mb: 2 }}
                    action={
                        <Button
                            color='inherit'
                            size='small'
                            onClick={handleLoadLatest}
                            disabled={saving}
                        >
                            <FormattedMessage
                                id='Apis.Details.FederationConfig.loadLatest'
                                defaultMessage='Load Latest'
                            />
                        </Button>
                    }
                >
                    <FormattedMessage
                        id='Apis.Details.FederationConfig.staleWarning'
                        defaultMessage={
                            'The gateway configuration has changed since your last review. '
                            + 'Click "Load Latest" to see the updated configuration, '
                            + 'or save to acknowledge the current state.'
                        }
                    />
                </Alert>
            )}

            {/* Enable/Disable Toggle — only shown when gateway supports subscriptions */}
            {subscriptionSupported && (
                <Paper className={classes.paper} elevation={0} variant='outlined'>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={subscriptionEnabled}
                                onChange={(e) => setSubscriptionEnabled(e.target.checked)}
                                color='primary'
                            />
                        }
                        label={
                            <Typography variant='subtitle1'>
                                <FormattedMessage
                                    id='Apis.Details.FederationConfig.enableLabel'
                                    defaultMessage='Enable Subscriptions'
                                />
                            </Typography>
                        }
                    />
                    <Typography variant='body2' color='textSecondary' sx={{ ml: 6 }}>
                        <FormattedMessage
                            id='Apis.Details.FederationConfig.enableHelp'
                            defaultMessage={
                                'When enabled, developers can create subscriptions and credentials '
                                + 'for this API through the Developer Portal.'
                            }
                        />
                    </Typography>
                </Paper>
            )}

            {/* Context banner: tells publisher when devportal developers will see these options */}
            <Alert
                severity='info'
                sx={{ mb: 2 }}
            >
                {subscriptionSupported ? (
                    <FormattedMessage
                        id='Apis.Details.FederationConfig.subscriptionTimeNote'
                        defaultMessage={
                            'The following options will be presented to developers at subscription time '
                            + 'in the Developer Portal.'
                        }
                    />
                ) : (
                    <FormattedMessage
                        id='Apis.Details.FederationConfig.keyGenTimeNote'
                        defaultMessage={
                            'This gateway does not support subscriptions. The following options will be '
                            + 'presented to developers at key generation time in the Developer Portal.'
                        }
                    />
                )}
            </Alert>

            {/* No snapshot / no config message */}
            {hasNoConfig && !snapshot && (
                <Alert severity='info' sx={{ mb: 2 }}>
                    <FormattedMessage
                        id='Apis.Details.FederationConfig.noConfig'
                        defaultMessage='No subscription configuration found. Save to create one.'
                    />
                </Alert>
            )}

            {/* Subscription Options Curation (schema-driven) */}
            {OptionsEditor && curatedPlans && (
                <Paper className={classes.paper} elevation={0} variant='outlined'>
                    <Typography className={classes.sectionTitle} variant='subtitle1'>
                        <FormattedMessage
                            id='Apis.Details.FederationConfig.optionsTitle'
                            defaultMessage='Subscription Options'
                        />
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <OptionsEditor
                        body={curatedPlans}
                        onChange={schemaName === 'option-groups'
                            ? handleOptionGroupChange : handlePlanToggle}
                        disabled={saving}
                    />
                </Paper>
            )}

            {/* Invocation Instruction (schema-driven, read-only from gateway snapshot) */}
            {InvocationRenderer && invocationTemplate?.body && (
                <Paper className={classes.paper} elevation={0} variant='outlined'>
                    <Typography className={classes.sectionTitle} variant='subtitle1'>
                        <FormattedMessage
                            id='Apis.Details.FederationConfig.invocationTitle'
                            defaultMessage='Invocation Instructions'
                        />
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <InvocationRenderer body={invocationTemplate.body} />
                </Paper>
            )}

            {/* Save Button */}
            <Box display='flex' gap={2} mt={2}>
                <Button
                    variant='contained'
                    color='primary'
                    onClick={() => handleSave()}
                    disabled={saving}
                >
                    {saving ? (
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                    ) : null}
                    <FormattedMessage
                        id='Apis.Details.FederationConfig.save'
                        defaultMessage='Save'
                    />
                </Button>
            </Box>
        </Root>
    );
}

export default FederationConfig;
