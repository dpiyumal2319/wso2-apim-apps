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
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { FormattedMessage } from 'react-intl';
import Api from 'AppData/api';
import Alert from 'AppComponents/Shared/Alert';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    getCredentialRenderer,
    getInvocationRenderer,
    getSubscriptionOptionsRenderer,
} from './federated/CredentialRendererRegistry';

const PREFIX = 'FederatedCredentialPanel';

const classes = {
    keyTitle: `${PREFIX}-keyTitle`,
    subTitle: `${PREFIX}-subTitle`,
};

const FederatedCredentialPanel = (props) => {
    const {
        subscriptionId,
        apiId,
    } = props;
    const [loading, setLoading] = useState(true);
    const [fedSubInfo, setFedSubInfo] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [subscriptionOptions, setSubscriptionOptions] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [optionsLoading, setOptionsLoading] = useState(false);

    const api = new Api();
    const OptionsRenderer = getSubscriptionOptionsRenderer(subscriptionOptions?.schemaName);

    const fetchCredential = () => {
        setLoading(true);
        api.getFederatedSubscription(subscriptionId)
            .then((response) => {
                setFedSubInfo(response.body);
            })
            .catch((error) => {
                if (error.status === 404) {
                    setFedSubInfo(null);
                } else {
                    Alert.error('Failed to fetch federated subscription information');
                    console.error(error);
                }
            })
            .finally(() => setLoading(false));
    };

    const fetchSubscriptionOptions = () => {
        if (!apiId) return;
        setOptionsLoading(true);
        api.getApiSubscriptionSupport(apiId)
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
    };

    useEffect(() => {
        fetchCredential();
    }, [subscriptionId]);

    // Fetch subscription options when no credential exists yet
    useEffect(() => {
        if (!loading && !fedSubInfo) {
            fetchSubscriptionOptions();
        }
    }, [loading, fedSubInfo, apiId]);

    const handleCreate = () => {
        setActionLoading(true);
        api.createFederatedSubscription(subscriptionId, selectedOption)
            .then((response) => {
                setFedSubInfo(response.body);
                setSubscriptionOptions(null);
                setSelectedOption(null);
                Alert.info('Credential created successfully');
            })
            .catch((error) => {
                Alert.error('Failed to create federated credential');
                console.error(error);
            })
            .finally(() => setActionLoading(false));
    };

    const handleRetrieve = () => {
        setActionLoading(true);
        api.retrieveFederatedCredential(subscriptionId)
            .then((response) => {
                setFedSubInfo((prev) => ({
                    ...prev,
                    credential: response.body.credential,
                }));
            })
            .catch((error) => {
                Alert.error('Failed to retrieve credential');
                console.error(error);
            })
            .finally(() => setActionLoading(false));
    };

    const handleRegenerate = () => {
        setActionLoading(true);
        api.regenerateFederatedCredential(subscriptionId)
            .then((response) => {
                setFedSubInfo(response.body);
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
        api.deleteFederatedSubscription(subscriptionId)
            .then(() => {
                setFedSubInfo(null);
                Alert.info('Credential deleted successfully');
            })
            .catch((error) => {
                Alert.error('Failed to delete federated credential');
                console.error(error);
            })
            .finally(() => setActionLoading(false));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (!fedSubInfo) {
        const hasOptions = subscriptionOptions && subscriptionOptions.body;
        const requiresSelection = hasOptions && !selectedOption;

        return (
            <Box sx={{ p: 2 }}>
                <Typography variant='body2' sx={{ mb: 2 }}>
                    <FormattedMessage
                        id='Apis.Details.Credentials.FederatedCredentialPanel.no.credential'
                        defaultMessage='No credential has been generated for this subscription yet.'
                    />
                </Typography>
                {optionsLoading && (
                    <Box
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 1, mb: 2,
                        }}
                    >
                        <CircularProgress size={16} />
                        <Typography variant='body2' color='text.secondary'>
                            <FormattedMessage
                                id='Apis.Details.Credentials.FederatedCredentialPanel.loading.options'
                                defaultMessage='Loading subscription options...'
                            />
                        </Typography>
                    </Box>
                )}
                {hasOptions && OptionsRenderer && (
                    <OptionsRenderer
                        body={subscriptionOptions.body}
                        selectedOption={selectedOption}
                        onSelect={setSelectedOption}
                    />
                )}
                <Button
                    variant='contained'
                    color='primary'
                    onClick={handleCreate}
                    disabled={actionLoading || optionsLoading || requiresSelection}
                >
                    {actionLoading ? <CircularProgress size={20} /> : (
                        <FormattedMessage
                            id='Apis.Details.Credentials.FederatedCredentialPanel.generate'
                            defaultMessage='Generate Credentials'
                        />
                    )}
                </Button>
            </Box>
        );
    }

    const { credential, invocationInstruction } = fedSubInfo;

    // Read schema names directly from DTO envelopes (no body parsing)
    const extractedCredentialSchema = credential?.schemaName;
    const extractedInvocationSchema = invocationInstruction?.schemaName;

    const CredentialRenderer = getCredentialRenderer(extractedCredentialSchema);
    const InvocationRenderer = getInvocationRenderer(extractedInvocationSchema);

    const actionButtons = {
        retrieve: credential && credential.masked && credential.isValueRetrievable && (
            <Button
                variant='outlined'
                size='small'
                onClick={handleRetrieve}
                disabled={actionLoading}
            >
                {actionLoading ? <CircularProgress size={16} /> : (
                    <FormattedMessage
                        id='Apis.Details.Credentials.FederatedCredentialPanel.retrieve'
                        defaultMessage='Retrieve Full Credential'
                    />
                )}
            </Button>
        ),
        regenerate: (
            <Button
                variant='outlined'
                size='small'
                onClick={handleRegenerate}
                disabled={actionLoading}
            >
                {actionLoading ? <CircularProgress size={16} /> : (
                    <FormattedMessage
                        id='Apis.Details.Credentials.FederatedCredentialPanel.regenerate'
                        defaultMessage='Regenerate Credential'
                    />
                )}
            </Button>
        ),
        delete: (
            <Button
                variant='outlined'
                color='secondary'
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                disabled={actionLoading}
            >
                {actionLoading ? <CircularProgress size={16} /> : (
                    <FormattedMessage
                        id='Apis.Details.Credentials.FederatedCredentialPanel.delete'
                        defaultMessage='Delete Credential'
                    />
                )}
            </Button>
        ),
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box mb={1}>
                <Typography variant='h5' className={classes.keyTitle}>
                    <FormattedMessage
                        id='Apis.Details.Credentials.FederatedCredentialPanel.title'
                        defaultMessage='Credentials'
                    />
                </Typography>
            </Box>
            <Box mb={1}>
                <Typography className={classes.subTitle} variant='h6' component='h6'>
                    <FormattedMessage
                        id='Apis.Details.Credentials.FederatedCredentialPanel.key.and.secret.title'
                        defaultMessage='Key and Secret'
                    />
                </Typography>
            </Box>
            {credential && (
                <CredentialRenderer
                    body={credential.body}
                    masked={credential.masked}
                    actionButtons={actionButtons}
                    actionLoading={actionLoading}
                />
            )}
            {invocationInstruction && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <InvocationRenderer body={invocationInstruction.body} />
                </>
            )}

        </Box>
    );
};

FederatedCredentialPanel.propTypes = {
    subscriptionId: PropTypes.string.isRequired,
    apiId: PropTypes.string,
};

FederatedCredentialPanel.defaultProps = {
    apiId: null,
};

export default FederatedCredentialPanel;
