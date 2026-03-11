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
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import MuiAlert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import Api from 'AppData/api';
import Subscription from 'AppData/Subscription';
import CONSTANTS from 'AppData/Constants';
import { getBasePath } from 'AppUtils/utils';
import {
    getCredentialRenderer,
    getInvocationRenderer,
    getSubscriptionOptionsRenderer,
    isSubscriptionOptionSelectionComplete,
    SelectedOptionPreview,
} from 'AppComponents/Apis/Details/Credentials/federated/CredentialRendererRegistry';
import Alert from 'AppComponents/Shared/Alert';
import FederatedCredentialPanel from 'AppComponents/Apis/Details/Credentials/FederatedCredentialPanel';

const PREFIX = 'SubscriptionKeys';

const classes = {
    root: `${PREFIX}-root`,
    cardContent: `${PREFIX}-cardContent`,
    titleWrapper: `${PREFIX}-titleWrapper`,
    credTable: `${PREFIX}-credTable`,
    sectionContainer: `${PREFIX}-sectionContainer`,
    description: `${PREFIX}-description`,
};

const Root = styled('div')(({ theme }) => ({
    [`& .${classes.root}`]: {
        padding: theme.spacing(3),
        '& h5': {
            color: theme.palette.getContrastText(theme.palette.background.default),
        },
    },

    [`& .${classes.sectionContainer}`]: {
        marginBottom: theme.spacing(4),
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        padding: theme.spacing(2),
    },

    [`& .${classes.cardContent}`]: {
        '& table tr td': {
            paddingLeft: theme.spacing(1),
        },
        '& table tr:nth-child(even)': {
            backgroundColor: theme.custom.listView.tableBodyEvenBackgrund,
            '& td, & a': {
                color: theme.palette.getContrastText(theme.custom.listView.tableBodyEvenBackgrund),
            },
        },
        '& table tr:nth-child(odd)': {
            backgroundColor: theme.custom.listView.tableBodyOddBackgrund,
            '& td, & a': {
                color: theme.palette.getContrastText(theme.custom.listView.tableBodyOddBackgrund),
            },
        },
        '& table th': {
            backgroundColor: theme.custom.listView.tableHeadBackground,
            color: theme.palette.getContrastText(theme.custom.listView.tableHeadBackground),
            paddingLeft: theme.spacing(1),
        },
    },

    [`& .${classes.titleWrapper}`]: {
        display: 'flex',
        alignItems: 'center',
        paddingBottom: theme.spacing(2),
        '& h5': {
            marginRight: theme.spacing(1),
        },
    },

    [`& .${classes.description}`]: {
        marginBottom: theme.spacing(2),
        color: theme.palette.text.secondary,
    },

    [`& .${classes.credTable}`]: {
        '& td': {
            padding: '4px 8px',
        },
        '& th': {
            padding: '8px',
        },
        tableLayout: 'fixed',
        width: '100%',
    },
}));

/**
 * SubscriptionKeys component displays application-scoped federated credentials.
 * @param {Object} props Component props
 * @returns {JSX.Element} The subscription keys component
 */
const SubscriptionKeys = ({ application }) => {
    const restApi = new Api();
    const [credentialSummaries, setCredentialSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);
    const [deletingCredential, setDeletingCredential] = useState(null);
    const [eligibleApis, setEligibleApis] = useState([]);
    const [eligibleApisLoading, setEligibleApisLoading] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [selectedApiId, setSelectedApiId] = useState('');
    const [credentialName, setCredentialName] = useState('');
    const [creatingCredential, setCreatingCredential] = useState(false);
    const [subscriptionOptions, setSubscriptionOptions] = useState(null);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);
    const [supportNotConfigured, setSupportNotConfigured] = useState(false);
    const [resultDialogOpen, setResultDialogOpen] = useState(false);
    const [resultData, setResultData] = useState(null);

    const selectedApiMeta = eligibleApis.find((apiItem) => apiItem.id === selectedApiId);
    const optionsSelectableAtKeyGeneration = !!selectedApiMeta?.subscriptionless;
    const optionsRenderer = getSubscriptionOptionsRenderer(subscriptionOptions?.schemaName);
    const hasOptions = optionsSelectableAtKeyGeneration
        && !!(subscriptionOptions && subscriptionOptions.body && optionsRenderer);
    const requiresSelection = hasOptions && !isSubscriptionOptionSelectionComplete(
        subscriptionOptions?.schemaName,
        subscriptionOptions?.body,
        selectedOption,
    );
    const selectedApiNeedsActiveSubscription = !!selectedApiMeta && !selectedApiMeta.subscriptionless;
    const selectedApiMissingActiveSubscription = selectedApiNeedsActiveSubscription
        && !selectedApiMeta?.hasActiveSubscription;
    const resultCredential = resultData?.credential;
    const resultInvocation = resultData?.invocationInstruction;
    const ResultCredentialRenderer = getCredentialRenderer(resultCredential?.schemaName);
    const ResultInvocationRenderer = getInvocationRenderer(resultInvocation?.schemaName);
    const isWriteOnce = resultCredential && resultCredential.isValueRetrievable === false;

    const isFederatedApi = (apiItem) => !!(apiItem?.gatewayVendor && apiItem.gatewayVendor.toLowerCase() !== 'wso2');
    const isSubscriptionlessApi = (apiItem) => {
        const policies = apiItem?.throttlingPolicies || [];
        return policies.length === 1
            && policies[0].includes(CONSTANTS.DEFAULT_SUBSCRIPTIONLESS_PLAN);
    };

    const fetchCredentialSummaries = async () => {
        setLoading(true);
        try {
            const response = await restApi.getApplicationCredentialSummaries(application.applicationId);
            setCredentialSummaries(response?.body?.list || []);
        } catch (error) {
            console.error('Failed to fetch application credential summaries:', error);
            setCredentialSummaries([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchEligibleApis = async () => {
        setEligibleApisLoading(true);
        try {
            const subscriptionClient = new Subscription();
            const [subResponse, apisResponse] = await Promise.all([
                subscriptionClient.getSubscriptions(null, application.applicationId, 1000),
                restApi.getAllAPIs({ query: 'status:published', limit: 1000, offset: 0 }),
            ]);

            const activeSubscribedApiIds = new Set(
                (subResponse?.body?.list || [])
                    .filter((sub) => isFederatedApi(sub.apiInfo) && sub.status === 'UNBLOCKED')
                    .map((sub) => sub.apiId),
            );

            const federatedApis = (apisResponse?.body?.list || [])
                .filter((apiItem) => isFederatedApi(apiItem))
                .map((apiItem) => ({
                    id: apiItem.id,
                    apiName: apiItem.name,
                    apiVersion: apiItem.version,
                    displayName: apiItem.displayName,
                    subscriptionless: isSubscriptionlessApi(apiItem),
                    hasActiveSubscription: activeSubscribedApiIds.has(apiItem.id),
                }));

            const sortedApis = federatedApis.sort((a, b) => {
                const aLabel = (a.displayName || a.apiName || '').toLowerCase();
                const bLabel = (b.displayName || b.apiName || '').toLowerCase();
                return aLabel.localeCompare(bLabel);
            });
            setEligibleApis(sortedApis);
        } catch (error) {
            console.error('Failed to fetch eligible federated APIs for credential generation:', error);
            setEligibleApis([]);
        } finally {
            setEligibleApisLoading(false);
        }
    };

    const fetchSubscriptionOptions = async (apiId) => {
        if (!apiId) {
            setSubscriptionOptions(null);
            setSupportNotConfigured(false);
            return;
        }
        setOptionsLoading(true);
        setSupportNotConfigured(false);
        try {
            const response = await restApi.getApiSubscriptionSupport(apiId);
            setSubscriptionOptions(response?.body?.subscriptionOptions || null);
            setSelectedOption(null);
        } catch (error) {
            console.error('Failed to fetch subscription options:', error);
            setSubscriptionOptions(null);
            setSelectedOption(null);
            if (error?.status === 404) {
                setSupportNotConfigured(true);
            }
        } finally {
            setOptionsLoading(false);
        }
    };

    const handleOpenCreateDialog = () => {
        setCreateDialogOpen(true);
        if (!selectedApiId && eligibleApis.length > 0) {
            setSelectedApiId(eligibleApis[0].id);
        }
    };

    const handleCloseCreateDialog = () => {
        if (creatingCredential) {
            return;
        }
        setCreateDialogOpen(false);
        setCredentialName('');
        setSelectedOption(null);
    };

    const handleCreateCredential = async () => {
        if (!selectedApiId) {
            Alert.error('Select an API');
            return;
        }
        if (!credentialName.trim()) {
            Alert.error('Provide a credential name');
            return;
        }
        if (requiresSelection) {
            Alert.error('Select a subscription option to continue');
            return;
        }
        if (selectedApiMissingActiveSubscription) {
            Alert.error('You need an active subscription to generate credentials for the selected API.');
            return;
        }
        if (supportNotConfigured) {
            Alert.error('This API does not support credential generation. Please contact your administrator.');
            return;
        }

        let wrappedSelectedOption = null;
        if (optionsSelectableAtKeyGeneration && selectedOption && subscriptionOptions) {
            wrappedSelectedOption = JSON.stringify({
                schemaName: subscriptionOptions.schemaName,
                body: selectedOption,
            });
        }

        setCreatingCredential(true);
        try {
            const response = await restApi.createFederatedCredentialForApi(
                selectedApiId,
                application.applicationId,
                credentialName,
                wrappedSelectedOption,
            );
            Alert.info('Credential generated successfully');
            handleCloseCreateDialog();
            setResultData(response?.body || null);
            setResultDialogOpen(true);
            await fetchCredentialSummaries();
        } catch (error) {
            if (error?.status === 409) {
                Alert.error('A credential already exists for this API and application context');
            } else {
                Alert.error('Failed to generate credential');
            }
            console.error('Failed to create federated credential:', error);
        } finally {
            setCreatingCredential(false);
        }
    };

    useEffect(() => {
        if (application?.applicationId) {
            fetchCredentialSummaries();
            fetchEligibleApis();
        }
    }, [application?.applicationId]);

    useEffect(() => {
        if (!selectedApiId && eligibleApis.length > 0) {
            setSelectedApiId(eligibleApis[0].id);
            return;
        }
        if (selectedApiId && !eligibleApis.some((apiItem) => apiItem.id === selectedApiId)) {
            setSelectedApiId(eligibleApis.length > 0 ? eligibleApis[0].id : '');
        }
    }, [eligibleApis, selectedApiId]);

    useEffect(() => {
        if (createDialogOpen && selectedApiId) {
            fetchSubscriptionOptions(selectedApiId);
        } else if (!createDialogOpen) {
            setSubscriptionOptions(null);
            setSelectedOption(null);
        }
    }, [createDialogOpen, selectedApiId]);

    const handleDeleteCredential = async (summary) => {
        if (!summary?.credentialId || !summary?.apiId) {
            return;
        }
        setDeletingCredential(summary.credentialId);
        try {
            const client = new Api();
            await client.deleteApiFederatedCredential(summary.apiId, summary.credentialId);
            Alert.info('Credential deleted successfully');
            if (expandedRow === summary.credentialId) {
                setExpandedRow(null);
            }
            await fetchCredentialSummaries();
        } catch (error) {
            console.error('Failed to delete federated credential:', error);
            Alert.error('Failed to delete credential');
        } finally {
            setDeletingCredential(null);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Root>
            <Box className={classes.root}>
                <Typography
                    variant='h4'
                    sx={{
                        textTransform: 'capitalize',
                        marginBottom: 3,
                    }}
                >
                    <FormattedMessage
                        id='Applications.Details.SubscriptionKeys.title'
                        defaultMessage='API Credentials'
                    />
                </Typography>

                <Box className={classes.sectionContainer}>
                    <Box className={classes.titleWrapper}>
                        <Typography
                            variant='h5'
                            sx={{
                                textTransform: 'capitalize',
                            }}
                        >
                            <FormattedMessage
                                id='Applications.Details.SubscriptionKeys.federated.apis'
                                defaultMessage='API Credentials by API'
                            />
                        </Typography>
                        <Box sx={{ ml: 'auto' }}>
                            <Button
                                variant='contained'
                                color='primary'
                                startIcon={<AddIcon />}
                                onClick={handleOpenCreateDialog}
                                disabled={eligibleApisLoading || eligibleApis.length === 0}
                            >
                                <FormattedMessage
                                    id='Applications.Details.SubscriptionKeys.generate.credential'
                                    defaultMessage='Generate Credential'
                                />
                            </Button>
                        </Box>
                    </Box>
                    <Typography variant='body2' className={classes.description}>
                        <FormattedMessage
                            id='Applications.Details.SubscriptionKeys.description'
                            defaultMessage='This page lists credentials generated for this application across APIs.'
                        />
                    </Typography>
                    <MuiAlert severity='info' sx={{ mb: 2 }}>
                        <FormattedMessage
                            id='Applications.Details.SubscriptionKeys.guidance'
                            defaultMessage={'Use View to inspect a credential and invocation details. '
                                + 'Delete removes that credential only for the selected API.'}
                        />
                    </MuiAlert>
                    {eligibleApis.length === 0 && !eligibleApisLoading && (
                        <MuiAlert severity='warning' sx={{ mb: 2 }}>
                            <FormattedMessage
                                id='Applications.Details.SubscriptionKeys.generate.no.apis'
                                defaultMessage='No federated APIs are available for credential generation.'
                            />
                        </MuiAlert>
                    )}
                    <Box className={classes.cardContent}>
                        <TableContainer>
                            <Table className={classes.credTable}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            <FormattedMessage
                                                id='Applications.Details.SubscriptionKeys.column.api'
                                                defaultMessage='API'
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedMessage
                                                id='Applications.Details.SubscriptionKeys.column.lifecycle'
                                                defaultMessage='Status'
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedMessage
                                                id='Applications.Details.SubscriptionKeys.column.credential'
                                                defaultMessage='Credential Name'
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedMessage
                                                id='Applications.Details.SubscriptionKeys.column.selected.option'
                                                defaultMessage='Selected Option'
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedMessage
                                                id='Applications.Details.SubscriptionKeys.column.updated'
                                                defaultMessage='Last Updated'
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedMessage
                                                id='Applications.Details.SubscriptionKeys.column.actions'
                                                defaultMessage='Actions'
                                            />
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {credentialSummaries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align='center'>
                                                <Typography variant='body2' color='text.secondary' sx={{ py: 3 }}>
                                                    <FormattedMessage
                                                        id='Applications.Details.SubscriptionKeys.empty'
                                                        defaultMessage='No credentials have been generated for this application yet.'
                                                    />
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : credentialSummaries.map((summary, index) => {
                                        const apiDisplayName = summary.apiDisplayName || summary.apiName || '-';
                                        const apiLink = summary.apiId
                                            ? `${getBasePath(summary.apiType)}${summary.apiId}/overview`
                                            : null;
                                        const expanded = expandedRow === summary.credentialId;
                                        const isDeleting = deletingCredential === summary.credentialId;

                                        return (
                                            <React.Fragment key={summary.credentialId || `${summary.name}-${index}`}>
                                                <TableRow>
                                                    <TableCell>
                                                        {apiLink ? (
                                                            <Link
                                                                to={apiLink}
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                            >
                                                                <span>
                                                                    {apiDisplayName}
                                                                    {summary.apiVersion ? ` - ${summary.apiVersion}` : ''}
                                                                </span>
                                                                <OpenInNewIcon fontSize='inherit' />
                                                            </Link>
                                                        ) : (
                                                            `${apiDisplayName}${summary.apiVersion ? ` - ${summary.apiVersion}` : ''}`
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{summary.apiLifeCycleStatus || '-'}</TableCell>
                                                    <TableCell>{summary.name || '-'}</TableCell>
                                                    <TableCell>
                                                        <SelectedOptionPreview selectedOption={summary.selectedOption} />
                                                    </TableCell>
                                                    <TableCell>
                                                        {summary.lastUpdatedTime
                                                            ? new Date(summary.lastUpdatedTime).toLocaleString()
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <Button
                                                                variant='outlined'
                                                                size='small'
                                                                onClick={() => setExpandedRow(expanded ? null : summary.credentialId)}
                                                                disabled={!summary.credentialId || !summary.apiId}
                                                            >
                                                                <FormattedMessage
                                                                    id='Applications.Details.SubscriptionKeys.action.view'
                                                                    defaultMessage='View'
                                                                />
                                                            </Button>
                                                            <Button
                                                                variant='outlined'
                                                                size='small'
                                                                color='error'
                                                                onClick={() => handleDeleteCredential(summary)}
                                                                disabled={isDeleting || !summary.credentialId || !summary.apiId}
                                                            >
                                                                {isDeleting ? (
                                                                    <CircularProgress size={16} />
                                                                ) : (
                                                                    <FormattedMessage
                                                                        id='Applications.Details.SubscriptionKeys.action.delete'
                                                                        defaultMessage='Delete'
                                                                    />
                                                                )}
                                                            </Button>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                                {expanded && summary.credentialId && summary.apiId && (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={6}
                                                            sx={{
                                                                py: 0,
                                                                borderLeft: '3px solid',
                                                                borderColor: 'primary.main',
                                                            }}
                                                        >
                                                            <Collapse in timeout='auto' unmountOnExit>
                                                                <FederatedCredentialPanel
                                                                    apiId={summary.apiId}
                                                                    credentialId={summary.credentialId}
                                                                />
                                                            </Collapse>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Box>
                <Dialog
                    open={createDialogOpen}
                    onClose={handleCloseCreateDialog}
                    maxWidth='sm'
                    fullWidth
                >
                    <DialogTitle>
                        <FormattedMessage
                            id='Applications.Details.SubscriptionKeys.dialog.title'
                            defaultMessage='Generate API Credential'
                        />
                    </DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{
                            display: 'flex', flexDirection: 'column', gap: 2, pt: 1,
                        }}
                        >
                            <TextField
                                select
                                label={(
                                    <FormattedMessage
                                        id='Applications.Details.SubscriptionKeys.dialog.api'
                                        defaultMessage='API'
                                    />
                                )}
                                value={selectedApiId}
                                onChange={(e) => setSelectedApiId(e.target.value)}
                                size='small'
                                disabled={eligibleApisLoading || eligibleApis.length === 0}
                            >
                                {eligibleApis.map((apiItem) => {
                                    const label = `${apiItem.displayName || apiItem.apiName || '-'}`
                                        + `${apiItem.apiVersion ? ` - ${apiItem.apiVersion}` : ''}`;
                                    return (
                                        <MenuItem key={apiItem.id} value={apiItem.id}>{label}</MenuItem>
                                    );
                                })}
                            </TextField>
                            <TextField
                                label={(
                                    <FormattedMessage
                                        id='Applications.Details.SubscriptionKeys.dialog.name'
                                        defaultMessage='Credential Name'
                                    />
                                )}
                                value={credentialName}
                                onChange={(e) => setCredentialName(e.target.value)}
                                size='small'
                                required
                                inputProps={{ maxLength: 255 }}
                            />
                            {selectedApiMissingActiveSubscription && (
                                <MuiAlert severity='error'>
                                    <FormattedMessage
                                        id='Applications.Details.SubscriptionKeys.dialog.banner.subscription.required'
                                        defaultMessage='You need an active subscription to generate credentials for this API.'
                                    />
                                    {' '}
                                    <Link to={`/applications/${application.applicationId}/subscriptions`}>
                                        <FormattedMessage
                                            id='Applications.Details.SubscriptionKeys.dialog.banner.subscription.link'
                                            defaultMessage='Go to Subscriptions'
                                        />
                                    </Link>
                                </MuiAlert>
                            )}
                            {supportNotConfigured && (
                                <MuiAlert severity='warning'>
                                    <FormattedMessage
                                        id='Applications.Details.SubscriptionKeys.dialog.banner.support.missing'
                                        defaultMessage='This API does not support credential generation. Please contact your administrator.'
                                    />
                                </MuiAlert>
                            )}
                            {optionsLoading && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={16} />
                                    <Typography variant='body2' color='text.secondary'>
                                        <FormattedMessage
                                            id='Applications.Details.SubscriptionKeys.dialog.options.loading'
                                            defaultMessage='Loading API options...'
                                        />
                                    </Typography>
                                </Box>
                            )}
                            {!optionsLoading && hasOptions && optionsRenderer({
                                body: subscriptionOptions.body,
                                value: selectedOption,
                                selectedOption,
                                onSelect: (value) => setSelectedOption(value),
                                onChange: (value) => setSelectedOption(value),
                                mode: 'select',
                            })}
                            {!optionsLoading && requiresSelection && (
                                <Typography variant='caption' color='error'>
                                    <FormattedMessage
                                        id='Applications.Details.SubscriptionKeys.dialog.options.required'
                                        defaultMessage='Select a subscription option to continue.'
                                    />
                                </Typography>
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseCreateDialog} disabled={creatingCredential}>
                            <FormattedMessage
                                id='Applications.Details.SubscriptionKeys.dialog.cancel'
                                defaultMessage='Cancel'
                            />
                        </Button>
                        <Button
                            variant='contained'
                            color='primary'
                            onClick={handleCreateCredential}
                            disabled={creatingCredential
                                || !selectedApiId
                                || !credentialName.trim()
                                || optionsLoading
                                || requiresSelection
                                || selectedApiMissingActiveSubscription
                                || supportNotConfigured}
                        >
                            {creatingCredential ? <CircularProgress size={20} /> : (
                                <FormattedMessage
                                    id='Applications.Details.SubscriptionKeys.dialog.generate'
                                    defaultMessage='Generate Credential'
                                />
                            )}
                        </Button>
                    </DialogActions>
                </Dialog>
                <Dialog
                    open={resultDialogOpen}
                    onClose={() => setResultDialogOpen(false)}
                    maxWidth='sm'
                    fullWidth
                >
                    <DialogTitle>
                        <FormattedMessage
                            id='Applications.Details.SubscriptionKeys.result.title'
                            defaultMessage='Credential Generated'
                        />
                    </DialogTitle>
                    <DialogContent dividers>
                        {isWriteOnce && (
                            <MuiAlert severity='warning' sx={{ mb: 2 }}>
                                <FormattedMessage
                                    id='Applications.Details.SubscriptionKeys.result.writeonce.warning'
                                    defaultMessage='This credential cannot be retrieved again. Copy it now and store it securely.'
                                />
                            </MuiAlert>
                        )}
                        {resultCredential && ResultCredentialRenderer && (
                            <ResultCredentialRenderer
                                body={resultCredential.body}
                                masked={false}
                            />
                        )}
                        {resultInvocation && ResultInvocationRenderer && (
                            <>
                                <Divider sx={{ my: 2 }} />
                                <ResultInvocationRenderer body={resultInvocation.body} />
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            variant='contained'
                            onClick={() => setResultDialogOpen(false)}
                        >
                            <FormattedMessage
                                id='Applications.Details.SubscriptionKeys.result.close'
                                defaultMessage='Done'
                            />
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Root>
    );
};

SubscriptionKeys.propTypes = {
    application: PropTypes.shape({
        applicationId: PropTypes.string.isRequired,
    }).isRequired,
};

export default SubscriptionKeys;
