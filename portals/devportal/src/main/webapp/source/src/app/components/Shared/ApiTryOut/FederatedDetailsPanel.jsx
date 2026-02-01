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
    const [federatedSupport, setFederatedSupport] = useState(null);

    const apiClient = new Api();

    useEffect(() => {
        apiClient.getFederatedSubscriptionSupport()
            .then((response) => {
                const envSupport = response.body.list.find((env) => env.supported);
                setFederatedSupport(envSupport || null);
            })
            .catch((error) => {
                console.error('Failed to fetch federated subscription support', error);
            });
    }, []);

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
        if (info && info.invocationInstruction) {
            try {
                const parsed = JSON.parse(info.invocationInstruction.body);
                if (parsed.headerName && setAdvAuthHeader) {
                    setAdvAuthHeader(parsed.headerName);
                }
            } catch {
                // ignore parse errors
            }
        }
        if (info && info.credential && !info.credential.masked && setAdvAuthHeaderValue) {
            try {
                const parsed = JSON.parse(info.credential.body);
                if (parsed.primaryKey) {
                    setAdvAuthHeaderValue(parsed.primaryKey);
                }
            } catch {
                // ignore parse errors
            }
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

    // Determine credential schema, defaulting to primary-secondary-key-pair if not present
    const credentialSchema = 'primary-secondary-key-pair';
    const CredentialRenderer = getCredentialRenderer(credentialSchema);

    // Determine invocation schema if available, otherwise fallback
    const invocationSchema = 'header-with-query-fallback'; 
    const InvocationRenderer = getInvocationRenderer(invocationSchema);

    return (
        <Box display='block' justifyContent='center' className={classes.authHeader}>
            {!hasSubscriptions ? (
                <Grid x={8} md={6} className={classes.tokenType} item>
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
                    <Grid x={12} md={6} className={classes.centerItems}>
                        <TextField
                            fullWidth
                            id='selected-subscription'
                            select
                            label={(
                                <FormattedMessage
                                    defaultMessage='Subscription'
                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.subscription'
                                />
                            )}
                            value={selectedSubscription}
                            name='selectedSubscription'
                            onChange={handleSubscriptionChange}
                            helperText={(
                                <FormattedMessage
                                    defaultMessage='Select a subscription'
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
                        <Grid x={8} md={6} className={classes.tokenType} item>
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
                        </Grid>
                    )}

                    {!loading && (
                        <Box display='block' justifyContent='center'>
                            <Grid x={8} md={6} className={classes.tokenType} item>
                                {hasCredential && (
                                    <CredentialRenderer body={fedSubInfo.credential.body} masked={fedSubInfo.credential.masked} />
                                )}
                                <Box display='flex' flexWrap='wrap' alignItems='center' gap={1} mt={2}>
                                    {!hasCredential && (
                                        <Button
                                            onClick={handleCreate}
                                            variant='contained'
                                            color='grey'
                                            className={classes.genKeyButton}
                                            disabled={actionLoading || !selectedSubscription}
                                            id='gen-federated-credential'
                                        >
                                            {actionLoading && <CircularProgress size={15} />}
                                            <FormattedMessage
                                                id='Apis.Details.ApiConsole.FederatedDetailsPanel.generate'
                                                defaultMessage='GENERATE CREDENTIAL'
                                            />
                                        </Button>
                                    )}
                                    {hasCredential && (
                                        <>
                                            <Button
                                                onClick={handleRegenerate}
                                                variant='contained'
                                                color='grey'
                                                className={classes.genKeyButton}
                                                disabled={actionLoading}
                                                id='regen-federated-credential'
                                            >
                                                {actionLoading && <CircularProgress size={15} />}
                                                <FormattedMessage
                                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.regenerate'
                                                    defaultMessage='REGENERATE KEYS'
                                                />
                                            </Button>
                                            {isMasked && isRetrievable && (
                                                <Button
                                                    onClick={handleRetrieve}
                                                    variant='contained'
                                                    color='grey'
                                                    className={classes.genKeyButton}
                                                    disabled={actionLoading}
                                                    id='retrieve-federated-credential'
                                                >
                                                    {actionLoading && <CircularProgress size={15} />}
                                                    <FormattedMessage
                                                        id='Apis.Details.ApiConsole.FederatedDetailsPanel.retrieve'
                                                        defaultMessage='SHOW KEYS'
                                                    />
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </Box>
                            </Grid>
                        </Box>
                    )}

                    {!loading && fedSubInfo && fedSubInfo.invocationInstruction && (
                        <Grid x={12} md={6} className={classes.centerItems} style={{ marginTop: '10px' }}>
                            <InvocationRenderer body={fedSubInfo.invocationInstruction.body} />
                        </Grid>
                    )}
                </>
            )}
        </Box>
    );
};

export default FederatedDetailsPanel;
