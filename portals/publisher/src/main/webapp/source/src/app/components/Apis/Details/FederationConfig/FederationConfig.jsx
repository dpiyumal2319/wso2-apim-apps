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
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import { FormattedMessage } from 'react-intl';
import APIContext from 'AppComponents/Apis/Details/components/ApiContext';
import API from 'AppData/api.js';
import AppAlert from 'AppComponents/Shared/Alert';
import Progress from 'AppComponents/Shared/Progress';

const PREFIX = 'FederationConfig';

const classes = {
    root: `${PREFIX}-root`,
    paper: `${PREFIX}-paper`,
    sectionTitle: `${PREFIX}-sectionTitle`,
    snapshotCard: `${PREFIX}-snapshotCard`,
    optionsGrid: `${PREFIX}-optionsGrid`,
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
    [`& .${classes.snapshotCard}`]: {
        backgroundColor: theme.palette.grey[50],
        padding: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${theme.palette.divider}`,
    },
    [`& .${classes.optionsGrid}`]: {
        display: 'flex',
        gap: theme.spacing(3),
        marginTop: theme.spacing(2),
    },
}));

/**
 * Parse subscription options body JSON into array of option objects.
 */
function parseOptionsBody(optionsObj) {
    if (!optionsObj?.body) return [];
    try {
        const parsed = JSON.parse(optionsObj.body);
        // TierSelectorOptions schema has { options: [...] }
        if (parsed.options && Array.isArray(parsed.options)) {
            return parsed.options;
        }
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Build options body JSON from selected option objects.
 */
function buildOptionsBody(options, schemaName) {
    if (!options || options.length === 0) return null;
    return {
        body: JSON.stringify({ options }),
        schemaName: schemaName || 'TierSelectorOptions',
    };
}

/**
 * Publisher Federation Configuration page.
 * Allows enabling/disabling federation, viewing gateway snapshot,
 * curating subscription options, and acknowledging staleness.
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
    const [selectedOptions, setSelectedOptions] = useState([]); // curated option indices

    const fetchConfig = useCallback(() => {
        setLoading(true);
        setError(null);
        API.getApiFederationConfig(apiId)
            .then((response) => {
                const data = response.body;
                setConfig(data);
                setFederationEnabled(data.federationEnabled || false);

                // Initialize curated options selection
                const curatedOptions = parseOptionsBody(data.publisherCuratedOptions);
                const gatewayOptions = parseOptionsBody(
                    data.gatewaySupportSnapshot?.subscriptionOptions,
                );
                if (curatedOptions.length > 0 && gatewayOptions.length > 0) {
                    const indices = curatedOptions.map((co) =>
                        gatewayOptions.findIndex(
                            (go) => JSON.stringify(go) === JSON.stringify(co),
                        ),
                    ).filter((i) => i >= 0);
                    setSelectedOptions(indices);
                } else {
                    // Default: all gateway options selected
                    setSelectedOptions(gatewayOptions.map((_, i) => i));
                }
            })
            .catch((err) => {
                console.error('Error fetching federation config:', err);
                if (err.status === 404) {
                    // No config yet — show default empty state
                    setConfig(null);
                    setFederationEnabled(false);
                    setSelectedOptions([]);
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
    const gatewayOptions = parseOptionsBody(snapshot?.subscriptionOptions);
    const isStale = config?.gatewaySnapshotHash
        && config?.liveSnapshotHash
        && config.gatewaySnapshotHash !== config.liveSnapshotHash;
    const hasNoConfig = !config;

    const handleOptionToggle = (index) => {
        setSelectedOptions((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index],
        );
    };

    const handleSave = (acknowledgeStale = false) => {
        setSaving(true);
        const curatedItems = selectedOptions
            .sort((a, b) => a - b)
            .map((i) => gatewayOptions[i])
            .filter(Boolean);

        const body = {
            federationEnabled,
            publisherCuratedOptions: curatedItems.length > 0
                ? buildOptionsBody(
                    curatedItems,
                    snapshot?.subscriptionOptions?.schemaName,
                )
                : null,
            acknowledgeStale,
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
            {isStale && (
                <Alert
                    severity='warning'
                    sx={{ mb: 2 }}
                    action={
                        <Button
                            color='inherit'
                            size='small'
                            onClick={() => handleSave(true)}
                            disabled={saving}
                        >
                            <FormattedMessage
                                id='Apis.Details.FederationConfig.acknowledge'
                                defaultMessage='Acknowledge Changes'
                            />
                        </Button>
                    }
                >
                    <FormattedMessage
                        id='Apis.Details.FederationConfig.staleWarning'
                        defaultMessage={
                            'The gateway configuration has changed since your last review. '
                            + 'Please review and acknowledge.'
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

            {/* Gateway Snapshot (read-only) */}
            {snapshot && (
                <Paper className={classes.paper} elevation={0} variant='outlined'>
                    <Typography className={classes.sectionTitle} variant='subtitle1'>
                        <FormattedMessage
                            id='Apis.Details.FederationConfig.snapshotTitle'
                            defaultMessage='Gateway Configuration (Live)'
                        />
                    </Typography>
                    <Box className={classes.snapshotCard}>
                        <Box display='flex' gap={1} alignItems='center' mb={1}>
                            <Typography variant='body2' fontWeight={500}>
                                <FormattedMessage
                                    id='Apis.Details.FederationConfig.subscriptionStatus'
                                    defaultMessage='Subscription Status:'
                                />
                            </Typography>
                            <Chip
                                label={snapshot.subscriptionStatus || 'UNKNOWN'}
                                size='small'
                                color={snapshot.subscriptionStatus === 'REQUIRED' ? 'primary' : 'default'}
                            />
                        </Box>
                        {snapshot.supportedAuthTypes && snapshot.supportedAuthTypes.length > 0 && (
                            <Box display='flex' gap={1} alignItems='center' mb={1} flexWrap='wrap'>
                                <Typography variant='body2' fontWeight={500}>
                                    <FormattedMessage
                                        id='Apis.Details.FederationConfig.authTypes'
                                        defaultMessage='Auth Types:'
                                    />
                                </Typography>
                                {snapshot.supportedAuthTypes.map((authType) => (
                                    <Chip key={authType} label={authType} size='small' variant='outlined' />
                                ))}
                            </Box>
                        )}
                        {snapshot.invocationTemplate?.body && (
                            <Box mt={1}>
                                <Typography variant='body2' fontWeight={500} gutterBottom>
                                    <FormattedMessage
                                        id='Apis.Details.FederationConfig.invocationTemplate'
                                        defaultMessage='Invocation Template:'
                                    />
                                </Typography>
                                <Box
                                    sx={{
                                        bgcolor: 'grey.100',
                                        p: 1,
                                        borderRadius: 1,
                                        fontFamily: 'monospace',
                                        fontSize: '0.85rem',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {snapshot.invocationTemplate.body}
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Paper>
            )}

            {/* No snapshot / no config message */}
            {hasNoConfig && !snapshot && (
                <Alert severity='info' sx={{ mb: 2 }}>
                    <FormattedMessage
                        id='Apis.Details.FederationConfig.noConfig'
                        defaultMessage='No federation configuration found. Save to create one.'
                    />
                </Alert>
            )}

            {/* Subscription Options Curation */}
            {gatewayOptions.length > 0 && (
                <Paper className={classes.paper} elevation={0} variant='outlined'>
                    <Typography className={classes.sectionTitle} variant='subtitle1'>
                        <FormattedMessage
                            id='Apis.Details.FederationConfig.optionsTitle'
                            defaultMessage='Subscription Options'
                        />
                    </Typography>
                    <Typography variant='body2' color='textSecondary' gutterBottom>
                        <FormattedMessage
                            id='Apis.Details.FederationConfig.optionsHelp'
                            defaultMessage={
                                'Select which gateway subscription tiers/plans '
                                + 'should be available to developers.'
                            }
                        />
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <FormGroup>
                        {gatewayOptions.map((option, index) => (
                            <FormControlLabel
                                key={option.id || option.name || `opt-${index}`}
                                control={
                                    <Checkbox
                                        checked={selectedOptions.includes(index)}
                                        onChange={() => handleOptionToggle(index)}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant='body2'>
                                            {option.name || option.label || option.id || `Option ${index + 1}`}
                                        </Typography>
                                        {option.description && (
                                            <Typography variant='caption' color='textSecondary'>
                                                {option.description}
                                            </Typography>
                                        )}
                                    </Box>
                                }
                            />
                        ))}
                    </FormGroup>
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
