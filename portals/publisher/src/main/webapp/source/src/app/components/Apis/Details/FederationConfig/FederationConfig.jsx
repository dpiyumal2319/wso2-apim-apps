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
import getSubscriptionOptionsEditor from './FederationConfigRegistry';
import getInvocationRenderer from './InvocationRendererRegistry';

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
 * Publisher Federation Configuration page.
 * Uses schema-driven registry for subscription options editing.
 * Sends curatedPlanSelections [{planId, enabled}] on save.
 */
function FederationConfig() {
    const { api } = useContext(APIContext);
    const apiId = api.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState(null);
    const [error, setError] = useState(null);

    // Editable state
    const [federationEnabled, setFederationEnabled] = useState(false);
    const [curatedPlans, setCuratedPlans] = useState(null);
    const [showLiveSnapshot, setShowLiveSnapshot] = useState(false);

    const fetchConfig = useCallback(() => {
        setLoading(true);
        setError(null);
        setShowLiveSnapshot(false);
        API.getApiFederationConfig(apiId)
            .then((response) => {
                const data = response.body;
                setConfig(data);
                setFederationEnabled(data.federationEnabled || false);

                // Use publisherCuratedConfig (has enabled flags) or fall back to live snapshot
                const source = data.publisherCuratedConfig || data.gatewaySupportSnapshot;
                const parsed = parseOptionsBody(source?.subscriptionOptions);
                setCuratedPlans(parsed);
            })
            .catch((err) => {
                console.error('Error fetching federation config:', err);
                if (err.status === 404) {
                    setConfig(null);
                    setFederationEnabled(false);
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
    const isStale = config?.isStale;
    const hasNoConfig = !config;
    const schemaName = snapshot?.subscriptionOptions?.schemaName;
    const OptionsEditor = getSubscriptionOptionsEditor(schemaName);

    const invocationTemplate = snapshot?.invocationTemplate;
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

    const handleLoadLatest = () => {
        // Swap editor display to live gateway snapshot
        const liveParsed = parseOptionsBody(snapshot?.subscriptionOptions);
        setCuratedPlans(liveParsed);
        setShowLiveSnapshot(true);
    };

    const handleSave = (acknowledgeStale = false) => {
        setSaving(true);
        const planSelections = curatedPlans?.plans?.map((p) => ({
            planId: p.id,
            enabled: p.enabled !== false,
        })) || [];

        const body = {
            federationEnabled,
            curatedPlanSelections: planSelections.length > 0 ? planSelections : null,
            acknowledgeStale: acknowledgeStale || showLiveSnapshot,
        };

        API.updateApiFederationConfig(apiId, body)
            .then(() => {
                AppAlert.info('Federation configuration updated.');
                fetchConfig();
            })
            .catch((err) => {
                console.error('Error saving federation config:', err);
                AppAlert.error('Failed to save federation configuration.');
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
                    defaultMessage='Federation Configuration'
                />
            </Typography>
            <Typography variant='body2' color='textSecondary' gutterBottom>
                <FormattedMessage
                    id='Apis.Details.FederationConfig.description'
                    defaultMessage={
                        'Control how this API is presented to developers '
                        + 'in the Developer Portal for federated subscriptions.'
                    }
                />
            </Typography>

            {/* Staleness Warning */}
            {isStale && !showLiveSnapshot && (
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
                            + 'Click "Load Latest" to see the updated configuration.'
                        }
                    />
                </Alert>
            )}
            {showLiveSnapshot && (
                <Alert severity='info' sx={{ mb: 2 }}>
                    <FormattedMessage
                        id='Apis.Details.FederationConfig.loadedLatest'
                        defaultMessage={
                            'Showing latest gateway configuration. '
                            + 'Review the changes and save to acknowledge.'
                        }
                    />
                </Alert>
            )}

            {/* Enable/Disable Toggle */}
            <Paper className={classes.paper} elevation={0} variant='outlined'>
                <FormControlLabel
                    control={
                        <Switch
                            checked={federationEnabled}
                            onChange={(e) => setFederationEnabled(e.target.checked)}
                            color='primary'
                        />
                    }
                    label={
                        <Typography variant='subtitle1'>
                            <FormattedMessage
                                id='Apis.Details.FederationConfig.enableLabel'
                                defaultMessage='Enable Federation'
                            />
                        </Typography>
                    }
                />
                <Typography variant='body2' color='textSecondary' sx={{ ml: 6 }}>
                    <FormattedMessage
                        id='Apis.Details.FederationConfig.enableHelp'
                        defaultMessage={
                            'When enabled, developers can create federated subscriptions '
                            + 'to this API through the Developer Portal.'
                        }
                    />
                </Typography>
            </Paper>

            {/* No snapshot / no config message */}
            {hasNoConfig && !snapshot && (
                <Alert severity='info' sx={{ mb: 2 }}>
                    <FormattedMessage
                        id='Apis.Details.FederationConfig.noConfig'
                        defaultMessage='No federation configuration found. Save to create one.'
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
                        onChange={handlePlanToggle}
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
                    onClick={() => handleSave(false)}
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
