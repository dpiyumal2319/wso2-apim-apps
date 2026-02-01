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
import { getCredentialRenderer, getInvocationRenderer } from './federated/CredentialRendererRegistry';

const FederatedCredentialPanel = (props) => {
    const {
        subscriptionId,
        credentialSchema,
        invocationSchema,
    } = props;
    const [loading, setLoading] = useState(true);
    const [fedSubInfo, setFedSubInfo] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const api = new Api();

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

    useEffect(() => {
        fetchCredential();
    }, [subscriptionId]);

    const handleCreate = () => {
        setActionLoading(true);
        api.createFederatedSubscription(subscriptionId)
            .then((response) => {
                setFedSubInfo(response.body);
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
                    credential: response.body,
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
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant='body2' sx={{ mb: 2 }}>
                    <FormattedMessage
                        id='Apis.Details.Credentials.FederatedCredentialPanel.no.credential'
                        defaultMessage='No credential has been generated for this subscription yet.'
                    />
                </Typography>
                <Button
                    variant='contained'
                    color='primary'
                    onClick={handleCreate}
                    disabled={actionLoading}
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
    const CredentialRenderer = getCredentialRenderer(credentialSchema);
    const InvocationRenderer = getInvocationRenderer(invocationSchema);

    return (
        <Box sx={{ p: 2 }}>
            {credential && (
                <CredentialRenderer body={credential.body} masked={credential.masked} />
            )}
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                {credential && credential.masked && credential.isValueRetrievable && (
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
                )}
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
                <Button
                    variant='outlined'
                    color='error'
                    size='small'
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
            </Box>
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
    credentialSchema: PropTypes.string,
    invocationSchema: PropTypes.string,
};

FederatedCredentialPanel.defaultProps = {
    credentialSchema: null,
    invocationSchema: null,
};

export default FederatedCredentialPanel;
