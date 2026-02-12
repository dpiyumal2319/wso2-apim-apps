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
import ConfirmDialog from 'AppComponents/Shared/ConfirmDialog';
import { ApiContext } from '../../Apis/Details/ApiContext';
import { getCredentialRenderer, getInvocationRenderer } from '../../Apis/Details/Credentials/federated/CredentialRendererRegistry';
import { getTryOutConfig } from '../../Apis/Details/Credentials/federated/TryOutConfigProvider';
import SubscriptionPlansRenderer from '../../Apis/Details/Credentials/federated/SubscriptionPlansRenderer';

const FederatedDetailsPanel = (props) => {
    const {
        classes,
        setAdvAuthHeader,
        setAdvAuthHeaderValue,
    } = props;

    const { api, subscribedApplications, requiresSubscription } = useContext(ApiContext);
    const [selectedSubscription, setSelectedSubscription] = useState('');
    const [fedSubInfo, setFedSubInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [editableCredentialValue, setEditableCredentialValue] = useState('');
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmDialogType, setConfirmDialogType] = useState(null); // 'regenerate' or 'delete'
    const [advAuthHeader, setAdvAuthHeaderInternal] = useState('');
    const [subscriptionOptions, setSubscriptionOptions] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [optionsLoading, setOptionsLoading] = useState(false);

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
            setSubscriptionOptions(null);
            setSelectedOption(null);
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

    // Fetch subscription options when no credential exists
    useEffect(() => {
        if (!loading && !fedSubInfo && selectedSubscription && api) {
            setOptionsLoading(true);
            apiClient.getApiSubscriptionSupport(api.id)
                .then((response) => {
                    const { body } = response;
                    if (body && body.subscriptionOptions) {
                        setSubscriptionOptions(body.subscriptionOptions);
                        // Auto-select if only one option
                        try {
                            const parsed = JSON.parse(body.subscriptionOptions.body);
                            if (parsed.plans && parsed.plans.length === 1) {
                                setSelectedOption(JSON.stringify(parsed.plans[0]));
                            }
                        } catch {
                            // ignore
                        }
                    }
                })
                .catch((error) => {
                    console.error('Failed to fetch subscription options', error);
                })
                .finally(() => setOptionsLoading(false));
        }
    }, [loading, fedSubInfo, selectedSubscription]);

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

    const handleCreate = () => {
        setActionLoading(true);
        apiClient.createFederatedSubscription(selectedSubscription, selectedOption)
            .then((response) => {
                setFedSubInfo(response.body);
                updateAuthValues(response.body);
                setSubscriptionOptions(null);
                setSelectedOption(null);
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

    const handleDelete = () => {
        setActionLoading(true);
        apiClient.deleteFederatedSubscription(selectedSubscription)
            .then(() => {
                setFedSubInfo(null);
                setEditableCredentialValue('');
                if (setAdvAuthHeaderValue) setAdvAuthHeaderValue('');
                Alert.info('Credential deleted successfully');
            })
            .catch((error) => {
                Alert.error('Failed to delete credential');
                console.error(error);
            })
            .finally(() => setActionLoading(false));
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

    const openConfirmDialog = (type) => {
        setConfirmDialogType(type);
        setConfirmDialogOpen(true);
    };

    const handleConfirmDialog = (confirmed) => {
        setConfirmDialogOpen(false);
        if (confirmed) {
            if (confirmDialogType === 'regenerate') {
                handleRegenerate();
            } else if (confirmDialogType === 'delete') {
                handleDelete();
            }
        }
        setConfirmDialogType(null);
    };

    const handleRetrieve = () => {
        setActionLoading(true);
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
            .finally(() => setActionLoading(false));
    };

    const hasSubscriptions = subscribedApplications && subscribedApplications.length > 0;
    const hasCredential = fedSubInfo && fedSubInfo.credential;
    const isMasked = hasCredential && fedSubInfo.credential.masked;
    const isRetrievable = hasCredential && fedSubInfo.credential.isValueRetrievable;

    const gatewayType = fedSubInfo && fedSubInfo.gatewayType;

    // Read schema names directly from DTO envelopes (no body parsing)
    const credentialSchema = fedSubInfo?.credential?.schemaName || null;
    const invocationSchema = fedSubInfo?.invocationInstruction?.schemaName || null;

    const CredentialRenderer = getCredentialRenderer(credentialSchema);
    const InvocationRenderer = getInvocationRenderer(invocationSchema);

    // If API doesn't require subscriptions, show info message instead of credential management
    if (requiresSubscription === false) {
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
                            {optionsLoading && (
                                <Box display='flex' justifyContent='center' p={1}>
                                    <CircularProgress size={20} />
                                </Box>
                            )}
                            {!optionsLoading && subscriptionOptions && subscriptionOptions.body && (
                                <Box mb={2} width='100%'>
                                    <SubscriptionPlansRenderer
                                        body={subscriptionOptions.body}
                                        selectedOption={selectedOption}
                                        onSelect={setSelectedOption}
                                    />
                                </Box>
                            )}
                            <Button
                                onClick={handleCreate}
                                variant='contained'
                                color='grey'
                                className={classes.genKeyButton}
                                style={{ marginLeft: 0 }}
                                disabled={
                                    actionLoading
                                    || !selectedSubscription
                                    || (subscriptionOptions && subscriptionOptions.body && !selectedOption)
                                }
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
                                    editable={true}
                                    value={editableCredentialValue}
                                    onChange={handleCredentialChange}
                                    headerName={advAuthHeader}
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
                                                onClick={() => openConfirmDialog('regenerate')}
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
                                        delete: (
                                            <Button
                                                onClick={() => openConfirmDialog('delete')}
                                                variant='outlined'
                                                color='error'
                                                disabled={actionLoading}
                                                style={{ marginLeft: 0 }}
                                                className={classes.deleteButton}
                                                id='delete-federated-credential'
                                            >
                                                <FormattedMessage
                                                    id='Apis.Details.ApiConsole.FederatedDetailsPanel.delete'
                                                    defaultMessage='DELETE'
                                                />
                                            </Button>
                                        ),
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
            <ConfirmDialog
                open={confirmDialogOpen}
                title={
                    confirmDialogType === 'regenerate'
                        ? 'Regenerate Credential'
                        : 'Delete Credential'
                }
                message={
                    confirmDialogType === 'regenerate'
                        ? 'Are you sure you want to regenerate this credential? The old credential will stop working immediately.'
                        : 'Are you sure you want to delete this credential? This action cannot be undone.'
                }
                labelOk={
                    confirmDialogType === 'regenerate'
                        ? 'Regenerate'
                        : 'Delete'
                }
                labelCancel='Cancel'
                callback={handleConfirmDialog}
            />
        </Box>
    );
};

export default FederatedDetailsPanel;
