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
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { FormattedMessage } from 'react-intl';
import Api from 'AppData/api';
import Alert from 'AppComponents/Shared/Alert';
import {
    getCredentialRenderer,
    getInvocationRenderer,
} from './federated/CredentialRendererRegistry';

const PREFIX = 'FederatedCredentialPanel';

const classes = {
    keyTitle: `${PREFIX}-keyTitle`,
    subTitle: `${PREFIX}-subTitle`,
};

const FederatedCredentialPanel = (props) => {
    const {
        apiId,
        credentialId,
        initialData,
    } = props;
    const [loading, setLoading] = useState(!initialData);
    const [fedCredentialInfo, setFedCredentialInfo] = useState(initialData || null);
    const [retrieving, setRetrieving] = useState(false);

    const api = new Api();

    const fetchCredential = () => {
        if (!apiId || !credentialId) {
            setFedCredentialInfo(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        api.getApiFederatedCredential(apiId, credentialId)
            .then((response) => {
                setFedCredentialInfo(response.body);
            })
            .catch((error) => {
                if (error.status === 404) {
                    setFedCredentialInfo(null);
                } else {
                    Alert.error('Failed to fetch federated credential information');
                    console.error(error);
                }
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!initialData) {
            fetchCredential();
        }
    }, [apiId, credentialId]);

    const handleRetrieve = () => {
        setRetrieving(true);
        api.retrieveApiFederatedCredential(apiId, credentialId)
            .then((response) => {
                setFedCredentialInfo((prev) => ({
                    ...prev,
                    credential: response.body.credential,
                }));
            })
            .catch((error) => {
                Alert.error('Failed to retrieve credential');
                console.error(error);
            })
            .finally(() => setRetrieving(false));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (!fedCredentialInfo) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant='body2'>
                    <FormattedMessage
                        id='Apis.Details.Credentials.FederatedCredentialPanel.credential.not.found'
                        defaultMessage='Credential details are not available.'
                    />
                </Typography>
            </Box>
        );
    }

    const { credential, invocationInstruction } = fedCredentialInfo;

    // Read schema names directly from DTO envelopes (no body parsing)
    const extractedCredentialSchema = credential?.schemaName;
    const extractedInvocationSchema = invocationInstruction?.schemaName;

    const CredentialRenderer = getCredentialRenderer(extractedCredentialSchema);
    const InvocationRenderer = getInvocationRenderer(extractedInvocationSchema);

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
            {credential && (
                <CredentialRenderer
                    body={credential.body}
                    masked={credential.masked}
                    onRetrieve={credential.isValueRetrievable ? handleRetrieve : undefined}
                    retrieving={retrieving}
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
    apiId: PropTypes.string.isRequired,
    credentialId: PropTypes.string.isRequired,
    initialData: PropTypes.shape({}),
};

FederatedCredentialPanel.defaultProps = {
    initialData: null,
};

export default FederatedCredentialPanel;
