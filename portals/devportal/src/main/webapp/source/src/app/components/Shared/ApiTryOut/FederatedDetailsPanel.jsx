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
import { Link } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import InfoIcon from '@mui/icons-material/Info';
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

    const { api, subscribedApplications, subscriptionStatus } = useContext(ApiContext);
    const [selectedSubscription, setSelectedSubscription] = useState('');
    const [fedSubInfo, setFedSubInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [retrieving, setRetrieving] = useState(false);
    const [editableCredentialValue, setEditableCredentialValue] = useState('');
    const [advAuthHeader, setAdvAuthHeaderInternal] = useState('');
    const [credentialSummaries, setCredentialSummaries] = useState([]);

    const apiClient = new Api();

    useEffect(() => {
        if (api && api.id) {
            apiClient.getApiCredentialSummaries(api.id)
                .then((response) => setCredentialSummaries(response.body.list || []))
                .catch(() => setCredentialSummaries([]));
        }
    }, [api?.id]);

    useEffect(() => {
        if (subscribedApplications && subscribedApplications.length > 0 && !selectedSubscription) {
            setSelectedSubscription(subscribedApplications[0].subscriptionId);
        }
    }, [subscribedApplications]);

    useEffect(() => {
        if (selectedSubscription) {
            const summary = credentialSummaries.find((s) => s.subscriptionId === selectedSubscription);
            if (summary && !summary.isProvisioned) {
                setFedSubInfo(null);
                return;
            }
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
    }, [selectedSubscription, credentialSummaries]);

    const updateAuthValues = (info) => {
        if (!info) {
            setEditableCredentialValue('');
            if (setAdvAuthHeaderValue) setAdvAuthHeaderValue('');
            return;
        }

        const credentialBody = info.credential?.body;
        const invocationBody = info.invocationInstruction?.body;
        const credentialSchemaName = info.credential?.schemaName;
        const invocationSchemaName = info.invocationInstruction?.schemaName;

        // Use schema-based TryOutConfigProvider to extract values
        // This automatically handles different credential types:
        // - opaque-api-key (AWS, Kong) → extracts 'value' field
        // - primary-secondary-key-pair (Azure) → extracts 'primaryKey' field
        // - jwt-bearer (future) → extracts 'token' field
        const tryOutConfig = getTryOutConfig(
            credentialBody, 
            invocationBody, 
            credentialSchemaName, 
            invocationSchemaName
        );

        // Set header name from invocation schema
        if (tryOutConfig.headerName) {
            setAdvAuthHeaderInternal(tryOutConfig.headerName);
            if (setAdvAuthHeader) {
                setAdvAuthHeader(tryOutConfig.headerName);
            }
        }

        // Populate editable field with credential value
        // If masked, sanitize non-ISO-8859-1 characters (like •) to 'X' for HTTP headers
        const credValue = tryOutConfig.headerValue || '';
        const sanitizedValue = credValue.replace(/[^\x00-\xFF]/g, 'X');
        
        setEditableCredentialValue(credValue); // Show original value in UI
        if (setAdvAuthHeaderValue) {
            setAdvAuthHeaderValue(sanitizedValue); // Use sanitized value for API calls
        }
    };

    const handleSubscriptionChange = (event) => {
        setSelectedSubscription(event.target.value);
    };

    const handleCredentialChange = (event) => {
        const { value } = event.target;
        setEditableCredentialValue(value);
        // Sanitize non-ISO-8859-1 characters for HTTP headers
        const sanitizedValue = value.replace(/[^\x00-\xFF]/g, 'X');
        if (setAdvAuthHeaderValue) {
            setAdvAuthHeaderValue(sanitizedValue);
        }
    };

    const handleRetrieve = () => {
        setRetrieving(true);
        apiClient.retrieveFederatedCredential(selectedSubscription)
            .then((response) => {
                setFedSubInfo((prev) => ({
                    ...prev,
                    credential: response.body.credential,
                }));
                updateAuthValues({ ...fedSubInfo, credential: response.body.credential });
            })
            .catch((error) => {
                Alert.error('Failed to retrieve credential');
                console.error(error);
            })
            .finally(() => setRetrieving(false));
    };

    // Build subscriptionId → summary map from fetched summaries
    const summaryBySubscriptionId = Object.fromEntries(
        credentialSummaries.map((s) => [s.subscriptionId, s]),
    );

    const selectedSummary = summaryBySubscriptionId[selectedSubscription];
    const isProvisioned = selectedSummary ? selectedSummary.isProvisioned : true;

    const hasSubscriptions = subscribedApplications && subscribedApplications.length > 0;
    const hasCredential = fedSubInfo && fedSubInfo.credential;
    const isRetrievable = hasCredential && fedSubInfo.credential.isValueRetrievable;

    const gatewayType = fedSubInfo && fedSubInfo.gatewayType;

    // Read schema names directly from DTO envelopes (no body parsing)
    const credentialSchema = fedSubInfo?.credential?.schemaName || null;
    const invocationSchema = fedSubInfo?.invocationInstruction?.schemaName || null;

    const CredentialRenderer = getCredentialRenderer(credentialSchema);
    const InvocationRenderer = getInvocationRenderer(invocationSchema);

    // Handle OPEN state - show appropriate message instead of credential management
    if (subscriptionStatus === 'OPEN') {
        return (
            <Box display='block' justifyContent='center' className={classes.authHeader}>
                <Grid xs={8} md={6} className={classes.tokenType} item>
                    <Box mb={1} alignItems='center'>
                        <Typography variant='body1'>
                            <FormattedMessage
                                id='Apis.Details.ApiConsole.FederatedDetailsPanel.no.subscription.required'
                                defaultMessage='This API does not require subscription credentials. You can invoke it directly.'
                            />
                        </Typography>
                    </Box>
                </Grid>
            </Box>
        );
    }

    return (
        <Box display='block' justifyContent='center' className={classes.authHeader}>
            {!hasSubscriptions ? (
                <Grid xs={8} md={6} className={classes.tokenType} item>
                    <Box mb={1} alignItems='center'>
                        <Typography variant='body1'>
                            <Box display='flex' alignItems='center' gap={1}>
                                <InfoIcon color='info' />
                                <div>
                                    <FormattedMessage
                                        id='Apis.Details.ApiConsole.FederatedDetailsPanel.no.credentials'
                                        defaultMessage='No credentials available.'
                                    />
                                    {' '}
                                    <Link to={`/apis/${api.id}/credentials`}>
                                        <FormattedMessage
                                            id='Apis.Details.ApiConsole.FederatedDetailsPanel.go.to.credentials'
                                            defaultMessage='Go to API Credentials page to generate one.'
                                        />
                                    </Link>
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
                                id='Apis.Details.ApiConsole.FederatedDetailsPanel.credential.heading'
                                defaultMessage='Credential'
                            />
                        </Typography>
                        <TextField
                            fullWidth
                            id='selected-subscription'
                            select
                            label={(
                                <FormattedMessage
                                    defaultMessage='Credential'
                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.credential'
                                />
                            )}
                            value={selectedSubscription}
                            name='selectedSubscription'
                            onChange={handleSubscriptionChange}
                            helperText={(
                                <FormattedMessage
                                    defaultMessage='Select a credential'
                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.select.credential'
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
                                    {summaryBySubscriptionId[sub.subscriptionId]?.name || sub.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    {loading && (
                        <Box display='flex' justifyContent='center' p={2}>
                            <CircularProgress size={24} />
                        </Box>
                    )}

                    {!loading && !isProvisioned && (
                        <Grid
                            xs={8}
                            md={6}
                            className={classes.tokenType}
                            item
                            style={{ flexDirection: 'column', alignItems: 'flex-start' }}
                        >
                            <Box mb={1} alignItems='center'>
                                <Typography variant='body1'>
                                    <Box display='flex' alignItems='center' gap={1}>
                                        <InfoIcon color='info' />
                                        <div>
                                            <FormattedMessage
                                                id='Apis.Details.ApiConsole.FederatedDetailsPanel.not.provisioned'
                                                defaultMessage='Keys have not been generated for this subscription.'
                                            />
                                            {' '}
                                            <Link to={`/apis/${api.id}/credentials`}>
                                                <FormattedMessage
                                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.go.to.credentials'
                                                    defaultMessage='Go to API Credentials page to generate one.'
                                                />
                                            </Link>
                                        </div>
                                    </Box>
                                </Typography>
                            </Box>
                        </Grid>
                    )}

                    {!loading && isProvisioned && !hasCredential && (
                        <Grid
                            xs={8}
                            md={6}
                            className={classes.tokenType}
                            item
                            style={{ flexDirection: 'column', alignItems: 'flex-start' }}
                        >
                            <Box mb={1} alignItems='center'>
                                <Typography variant='body1'>
                                    <Box display='flex' alignItems='center' gap={1}>
                                        <InfoIcon color='info' />
                                        <div>
                                            <FormattedMessage
                                                id='Apis.Details.ApiConsole.FederatedDetailsPanel.no.credential'
                                                defaultMessage='No credential generated for this subscription.'
                                            />
                                            {' '}
                                            <Link to={`/apis/${api.id}/credentials`}>
                                                <FormattedMessage
                                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.go.to.credentials'
                                                    defaultMessage='Go to API Credentials page to generate one.'
                                                />
                                            </Link>
                                        </div>
                                    </Box>
                                </Typography>
                            </Box>
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
                                    editable
                                    value={editableCredentialValue}
                                    onChange={handleCredentialChange}
                                    headerName={advAuthHeader}
                                    onRetrieve={isRetrievable ? handleRetrieve : undefined}
                                    retrieving={retrieving}
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
