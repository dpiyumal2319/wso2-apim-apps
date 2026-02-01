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
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Api from 'AppData/api';
import { ApiContext } from '../ApiContext';
import { getCredentialRenderer, getInvocationRenderer } from '../Credentials/federated/CredentialRendererRegistry';

export default function InvocationInstructionsPanel() {
    const { api, subscribedApplications } = useContext(ApiContext);
    const [loading, setLoading] = useState(true);
    const [fedSubInfo, setFedSubInfo] = useState(null);
    const [federatedSupport, setFederatedSupport] = useState(null);

    const apiClient = new Api();

    useEffect(() => {
        if (!subscribedApplications || subscribedApplications.length === 0) {
            setLoading(false);
            return;
        }

        const firstSub = subscribedApplications[0];
        Promise.all([
            apiClient.getFederatedSubscription(firstSub.subscriptionId),
            apiClient.getFederatedSubscriptionSupport(),
        ]).then(([subResponse, supportResponse]) => {
            setFedSubInfo(subResponse.body);
            const envSupport = supportResponse.body.list.find((env) => env.supported);
            setFederatedSupport(envSupport || null);
        }).catch((error) => {
            if (error.status !== 404) {
                console.error('Failed to fetch federated subscription info', error);
            }
        }).finally(() => setLoading(false));
    }, [subscribedApplications]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (!subscribedApplications || subscribedApplications.length === 0) {
        return (
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant='body2' sx={{ mb: 1 }}>
                    <FormattedMessage
                        id='Apis.Details.ApiConsole.InvocationInstructionsPanel.subscribe.first'
                        defaultMessage='Subscribe to this API to get invocation instructions and credentials.'
                    />
                </Typography>
                <Button
                    variant='outlined'
                    size='small'
                    component={Link}
                    to={`/apis/${api.id}/credentials`}
                >
                    <FormattedMessage
                        id='Apis.Details.ApiConsole.InvocationInstructionsPanel.go.to.credentials'
                        defaultMessage='Go to Subscriptions'
                    />
                </Button>
            </Paper>
        );
    }

    if (!fedSubInfo) {
        return (
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant='body2'>
                    <FormattedMessage
                        id='Apis.Details.ApiConsole.InvocationInstructionsPanel.generate.credential'
                        defaultMessage='Generate credentials for your subscription to see invocation instructions.'
                    />
                </Typography>
                <Button
                    variant='outlined'
                    size='small'
                    component={Link}
                    to={`/apis/${api.id}/credentials`}
                    sx={{ mt: 1 }}
                >
                    <FormattedMessage
                        id='Apis.Details.ApiConsole.InvocationInstructionsPanel.go.to.credentials.manage'
                        defaultMessage='Manage Credentials'
                    />
                </Button>
            </Paper>
        );
    }

    const credentialSchema = federatedSupport
        && federatedSupport.credentialSchemas
        && federatedSupport.credentialSchemas[0];
    const invocationSchema = federatedSupport
        && federatedSupport.invocationSchemas
        && federatedSupport.invocationSchemas[0];

    const { credential, invocationInstruction } = fedSubInfo;
    const CredentialRenderer = getCredentialRenderer(credentialSchema);
    const InvocationRenderer = getInvocationRenderer(invocationSchema);

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>
                <FormattedMessage
                    id='Apis.Details.ApiConsole.InvocationInstructionsPanel.title'
                    defaultMessage='Invocation Details'
                />
            </Typography>
            {credential && (
                <CredentialRenderer body={credential.body} masked={credential.masked} />
            )}
            {invocationInstruction && (
                <InvocationRenderer body={invocationInstruction.body} />
            )}
        </Paper>
    );
}
