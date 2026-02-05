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

import React, { useEffect, useState, useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import WarningIcon from '@mui/icons-material/Warning';
import Api from 'AppData/api';
import Alert from 'AppComponents/Shared/Alert';
import { ApiContext } from '../../Apis/Details/ApiContext';
import { getCredentialRenderer, getInvocationRenderer } from '../../Apis/Details/Credentials/federated/CredentialRendererRegistry';
import { getTryOutConfig } from '../../Apis/Details/Credentials/federated/TryOutConfigProvider';

const FederatedDetailsPanel = (props) => {
    const {
        classes,
        setAdvAuthHeader,
        setAdvAuthHeaderValue,
    } = props;

    const { api, subscribedApplications } = useContext(ApiContext);
    const [selectedSubscription, setSelectedSubscription] = useState('');
    const [fedSubInfo, setFedSubInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const apiClient = new Api();

    useEffect(() => {
        if (subscribedApplications && subscribedApplications.length > 0 && !selectedSubscription) {
            setSelectedSubscription(subscribedApplications[0].subscriptionId);
        }
    }, [subscribedApplications]);

    useEffect(() => {
        if (selectedSubscription) {
            setLoading(true);
            setFedSubInfo(null);
            apiClient.getFederatedSubscription(selectedSubscription)
                .then((response) => {
                    setFedSubInfo(response.body);
                    updateAuthValues(response.body);
                })
                .catch((error) => {
                    if (error.status !== 404) {
                        console.error('Failed to fetch federated subscription', error);
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [selectedSubscription]);

    const updateAuthValues = (info) => {
        if (!info) return;

        const credentialBody = info.credential?.body;
        const invocationBody = info.invocationInstruction?.body;

        // Use schema-based TryOutConfigProvider to extract values
        // This automatically handles different credential types:
        // - opaque-api-key (AWS, Kong) → extracts 'value' field
        // - primary-secondary-key-pair (Azure) → extracts 'primaryKey' field
        // - jwt-bearer (future) → extracts 'token' field
        const tryOutConfig = getTryOutConfig(credentialBody, invocationBody);

        // Set header name from invocation schema
        if (tryOutConfig.headerName && setAdvAuthHeader) {
            setAdvAuthHeader(tryOutConfig.headerName);
        }

        // Only set value if credential is not masked (full value available)
        if (info.credential && !info.credential.masked && tryOutConfig.headerValue && setAdvAuthHeaderValue) {
            setAdvAuthHeaderValue(tryOutConfig.headerValue);
        }
    };

    const handleSubscriptionChange = (event) => {
        setSelectedSubscription(event.target.value);
    };

    const handleCreate = () => {
        setActionLoading(true);
        apiClient.createFederatedSubscription(selectedSubscription)
            .then((response) => {
                setFedSubInfo(response.body);
                updateAuthValues(response.body);
                Alert.info('Credential created successfully');
            })
            .catch((error) => {
                Alert.error('Failed to create credential');
                console.error(error);
            })
            .finally(() => setActionLoading(false));
    };

    const handleRegenerate = () => {
        setActionLoading(true);
        apiClient.regenerateFederatedCredential(selectedSubscription)
            .then((response) => {
                setFedSubInfo(response.body);
                updateAuthValues(response.body);
                Alert.info('Credential regenerated successfully');
            })
            .catch((error) => {
                Alert.error('Failed to regenerate credential');
                console.error(error);
            })
            .finally(() => setActionLoading(false));
    };

    const handleRetrieve = () => {
        setActionLoading(true);
        apiClient.retrieveFederatedCredential(selectedSubscription)
            .then((response) => {
                setFedSubInfo((prev) => ({
                    ...prev,
                    credential: response.body,
                }));
                updateAuthValues({ ...fedSubInfo, credential: response.body });
            })
            .catch((error) => {
                Alert.error('Failed to retrieve credential');
                console.error(error);
            })
            .finally(() => setActionLoading(false));
    };

    const hasSubscriptions = subscribedApplications && subscribedApplications.length > 0;
    const hasCredential = fedSubInfo && fedSubInfo.credential;
    const isMasked = hasCredential && fedSubInfo.credential.masked;
    const isRetrievable = hasCredential && fedSubInfo.credential.isValueRetrievable;

    const gatewayType = fedSubInfo && fedSubInfo.gatewayType;

    // Extract schemas from response bodies
    let credentialSchema = null;
    let invocationSchema = null;

    if (hasCredential && fedSubInfo.credential.body) {
        try {
            const credentialData = JSON.parse(fedSubInfo.credential.body);
            credentialSchema = credentialData.credentialType || null;
        } catch {
            // ignore parse errors
        }
    }

    if (fedSubInfo && fedSubInfo.invocationInstruction && fedSubInfo.invocationInstruction.body) {
        try {
            const invocationData = JSON.parse(fedSubInfo.invocationInstruction.body);
            invocationSchema = invocationData.invocationSchema || null;
        } catch {
            // ignore parse errors
        }
    }

    const CredentialRenderer = getCredentialRenderer(gatewayType, credentialSchema);
    const InvocationRenderer = getInvocationRenderer(gatewayType, invocationSchema);

    return (
        <Box display='block' justifyContent='center' className={classes.authHeader}>
            {!hasSubscriptions ? (
                <Grid xs={8} md={6} className={classes.tokenType} item>
                    <Box mb={1} alignItems='center'>
                        <Typography variant='body1'>
                            <Box display='flex'>
                                <WarningIcon className={classes.warningIcon} />
                                <div>
                                    <FormattedMessage
                                        id='Apis.Details.ApiConsole.FederatedDetailsPanel.subscribe.first'
                                        defaultMessage='Please subscribe to an application'
                                    />
                                </div>
                            </Box>
                        </Typography>
                    </Box>
                </Grid>
            ) : (
                <>
                    <Grid xs={12} md={6} className={classes.centerItems}>
                        <Typography variant='h5' component='h2' color='textPrimary' className={classes.categoryHeading}>
                            <FormattedMessage
                                id='Apis.Details.ApiConsole.FederatedDetailsPanel.security.heading'
                                defaultMessage='Security'
                            />
                        </Typography>
                        <Typography
                            variant='h6'
                            component='label'
                            color='textSecondary'
                            className={classes.tryoutHeading}
                        >
                            <FormattedMessage
                                id='Apis.Details.ApiConsole.FederatedDetailsPanel.subscription.heading'
                                defaultMessage='Application'
                            />
                        </Typography>
                        <TextField
                            fullWidth
                            id='selected-subscription'
                            select
                            label={(
                                <FormattedMessage
                                    defaultMessage='Application'
                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.subscription'
                                />
                            )}
                            value={selectedSubscription}
                            name='selectedSubscription'
                            onChange={handleSubscriptionChange}
                            helperText={(
                                <FormattedMessage
                                    defaultMessage='Select an application'
                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.select.subscription'
                                />
                            )}
                            margin='normal'
                            variant='outlined'
                        >
                            {subscribedApplications.map((sub) => (
                                <MenuItem
                                    value={sub.subscriptionId}
                                    key={sub.subscriptionId}
                                    className={classes.menuItem}
                                >
                                    {sub.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    {loading && (
                        <Box display='flex' justifyContent='center' p={2}>
                            <CircularProgress size={24} />
                        </Box>
                    )}

                    {!loading && !hasCredential && (
                        <Grid
                            xs={8}
                            md={6}
                            className={classes.tokenType}
                            item
                            style={{ flexDirection: 'column', alignItems: 'flex-start' }}
                        >
                            <Box mb={1} alignItems='center'>
                                <Typography variant='body1'>
                                    <Box display='flex'>
                                        <WarningIcon className={classes.warningIcon} />
                                        <div>
                                            <FormattedMessage
                                                id='Apis.Details.ApiConsole.FederatedDetailsPanel.no.credential'
                                                defaultMessage='No credential generated for this subscription.'
                                            />
                                        </div>
                                    </Box>
                                </Typography>
                            </Box>
                            <Button
                                onClick={handleCreate}
                                variant='contained'
                                color='grey'
                                className={classes.genKeyButton}
                                style={{ marginLeft: 0 }}
                                disabled={actionLoading || !selectedSubscription}
                                id='gen-federated-credential'
                            >
                                {actionLoading && <CircularProgress size={15} />}
                                <FormattedMessage
                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.generate'
                                    defaultMessage='GENERATE CREDENTIAL'
                                />
                            </Button>
                        </Grid>
                    )}

                    {!loading && hasCredential && (
                        <>
                            <Grid xs={12} md={6} className={classes.centerItems}>
                                <Typography
                                    variant='h6'
                                    component='label'
                                    color='textSecondary'
                                    className={classes.tryoutHeading}
                                >
                                    <FormattedMessage
                                        id='Apis.Details.ApiConsole.FederatedDetailsPanel.credentials.heading'
                                        defaultMessage='Credentials'
                                    />
                                </Typography>
                            </Grid>
                            <Grid xs={12} md={6} className={classes.centerItems}>
                                <CredentialRenderer
                                    body={fedSubInfo.credential.body}
                                    masked={fedSubInfo.credential.masked}
                                    actionButtons={{
                                        retrieve: isMasked && isRetrievable && (
                                            <Button
                                                onClick={handleRetrieve}
                                                variant='contained'
                                                color='grey'
                                                className={classes.genKeyButton}
                                                disabled={actionLoading}
                                                style={{ marginLeft: 0 }}
                                                id='retrieve-federated-credential'
                                            >
                                                {actionLoading && <CircularProgress size={15} />}
                                                <FormattedMessage
                                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.retrieve'
                                                    defaultMessage='SHOW KEYS'
                                                />
                                            </Button>
                                        ),
                                        regenerate: (
                                            <Button
                                                onClick={handleRegenerate}
                                                variant='contained'
                                                color='grey'
                                                className={classes.genKeyButton}
                                                disabled={actionLoading}
                                                style={{ marginLeft: 0 }}
                                                id='regen-federated-credential'
                                            >
                                                {actionLoading && <CircularProgress size={15} />}
                                                <FormattedMessage
                                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.regenerate'
                                                    defaultMessage='REGENERATE KEYS'
                                                />
                                            </Button>
                                        ),
                                        delete: null,
                                    }}
                                />
                            </Grid>
                        </>
                    )}

                    {!loading && fedSubInfo && fedSubInfo.invocationInstruction && (
                        <Grid xs={12} md={6} className={classes.centerItems} style={{ marginTop: '10px' }}>
                            <Typography
                                variant='h6'
                                component='label'
                                color='textSecondary'
                                className={classes.tryoutHeading}
                            >
                                <FormattedMessage
                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.invocation.heading'
                                    defaultMessage='Invocation'
                                />
                            </Typography>
                            <InvocationRenderer body={fedSubInfo.invocationInstruction.body} />
                        </Grid>
                    )}
                </>
            )}
        </Box>
    );
};

export default FederatedDetailsPanel;
