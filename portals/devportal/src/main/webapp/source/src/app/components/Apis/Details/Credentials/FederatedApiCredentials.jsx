/*
 * Copyright (c) 2026, WSO2 LLC. (http://www.wso2.org) All Rights Reserved.
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
import React, { useContext, useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import MuiAlert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import Api from 'AppData/api';
import CONSTANTS from 'AppData/Constants';
import Alert from 'AppComponents/Shared/Alert';
import { ApiContext } from '../ApiContext';
import FederatedCredentialPanel from './FederatedCredentialPanel';
import {
    getSubscriptionOptionsRenderer,
    getSubscriptionOptionsColumnHeader,
    isSubscriptionOptionSelectionComplete,
    getCredentialRenderer,
    getInvocationRenderer,
    SelectedOptionPreview,
} from './federated/CredentialRendererRegistry';

const PREFIX = 'FederatedApiCredentials';

const classes = {
    sectionContainer: `${PREFIX}-sectionContainer`,
    titleWrapper: `${PREFIX}-titleWrapper`,
    cardContent: `${PREFIX}-cardContent`,
    credTable: `${PREFIX}-credTable`,
};

const Root = styled('div')(({ theme }) => ({
    [`& .${classes.sectionContainer}`]: {
        marginBottom: theme.spacing(4),
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        padding: theme.spacing(2),
    },

    [`& .${classes.titleWrapper}`]: {
        display: 'flex',
        alignItems: 'center',
        paddingBottom: theme.spacing(2),
        '& h5': {
            marginRight: theme.spacing(1),
        },
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
 * FederatedApiCredentials page - unified credential management for federated APIs.
 * Credentials page with credential lifecycle actions and generated credential display.
 */
export default function FederatedApiCredentials() {
    const {
        api,
        applicationsAvailable,
        subscribedApplications,
        updateSubscriptionData,
    } = useContext(ApiContext);

    const isSubValidationDisabled = api && api.tiers && api.tiers.length === 1
        && api.tiers[0].tierName.includes(CONSTANTS.DEFAULT_SUBSCRIPTIONLESS_PLAN);
    const subscriptionsEnabled = !isSubValidationDisabled;

    const [summaries, setSummaries] = useState([]);
    const [summariesLoading, setSummariesLoading] = useState(true);
    const [invocationInstruction, setInvocationInstruction] = useState(null);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [selectedAppId, setSelectedAppId] = useState('');
    const [name, setName] = useState('');
    const [subscriptionOptions, setSubscriptionOptions] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [resultDialogOpen, setResultDialogOpen] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [deletingCredential, setDeletingCredential] = useState(null);
    const [expandedRow, setExpandedRow] = useState(null);
    const [supportNotConfigured, setSupportNotConfigured] = useState(false);

    const restApi = new Api();
    const OptionsRenderer = getSubscriptionOptionsRenderer(subscriptionOptions?.schemaName);

    const fetchSummaries = () => {
        setSummariesLoading(true);
        restApi.getApiCredentialSummaries(api.id)
            .then((response) => {
                setSummaries(response.body.list || []);
            })
            .catch((error) => {
                console.error('Failed to fetch credential summaries', error);
                Alert.error('Failed to load credentials');
            })
            .finally(() => setSummariesLoading(false));
    };

    const fetchSubscriptionOptions = () => {
        setOptionsLoading(true);
        setSupportNotConfigured(false);
        restApi.getApiSubscriptionSupport(api.id)
            .then((response) => {
                const { body } = response;
                if (body) {
                    setInvocationInstruction(body.invocationTemplate || null);
                    setSubscriptionOptions(body.subscriptionOptions || null);
                }
            })
            .catch((error) => {
                console.error('Failed to fetch subscription options', error);
                setInvocationInstruction(null);
                setSubscriptionOptions(null);
                if (error.status === 404) {
                    setSupportNotConfigured(true);
                    Alert.error('Credentials are not available for this API. Please contact your administrator.');
                }
            })
            .finally(() => setOptionsLoading(false));
    };

    useEffect(() => {
        if (api && api.id) {
            fetchSummaries();
            fetchSubscriptionOptions();
        }
    }, [api?.id]);

    // Show all applications and validate compatibility at generate time.
    const allApplications = (() => {
        const available = applicationsAvailable || [];
        const subscribed = (subscribedApplications || []).map((app) => ({
            value: app.value,
            label: app.label,
            status: app.status || null,
        }));
        const seen = new Set(subscribed.map((a) => a.value));
        const notSubscribed = available
            .filter((a) => !seen.has(a.value))
            .map((a) => ({ ...a, status: null }));
        return [...subscribed, ...notSubscribed];
    })();
    const selectedAppMeta = allApplications.find((app) => app.value === selectedAppId);
    const selectedAppIncompatible = subscriptionsEnabled
        && !!selectedAppId
        && selectedAppMeta?.status !== 'UNBLOCKED';

    useEffect(() => {
        if (allApplications.length > 0 && !selectedAppId) {
            setSelectedAppId(allApplications[0].value);
        }
    }, [allApplications.length, selectedAppId]);

    const openResultDialog = (data) => {
        setResultData(data);
        setResultDialogOpen(true);
    };

    const handleGenerate = () => {
        if (supportNotConfigured) {
            Alert.error('Credentials are not available for this API. Please contact your administrator.');
            return;
        }
        if (!selectedAppId) {
            Alert.error('Please select an application');
            return;
        }
        if (!name.trim()) {
            Alert.error('Please provide a name for the credential');
            return;
        }
        if (selectedAppIncompatible) {
            Alert.error('You need to create a subscription for the selected application before generating credentials.');
            return;
        }

        let wrappedSelectedOption = null;
        if (selectedOption && subscriptionOptions) {
            wrappedSelectedOption = JSON.stringify({
                schemaName: subscriptionOptions.schemaName,
                body: selectedOption,
            });
        }

        setCreating(true);
        restApi.createFederatedCredentialForApi(api.id, selectedAppId, name, wrappedSelectedOption)
            .then((response) => {
                const result = response.body;
                setWizardOpen(false);
                setName('');
                setSelectedOption(null);
                setSelectedAppId('');
                fetchSummaries();
                updateSubscriptionData();
                if (result?.credentialId) {
                    setExpandedRow(result.credentialId);
                }
                openResultDialog(result);
            })
            .catch((error) => {
                if (error.status === 409) {
                    Alert.error('A credential already exists for this API and application context');
                } else {
                    Alert.error('Failed to generate credential');
                }
                console.error(error);
            })
            .finally(() => setCreating(false));
    };

    const handleDeleteCredential = (credentialId) => {
        setDeletingCredential(credentialId);
        restApi.deleteApiFederatedCredential(api.id, credentialId)
            .then(() => {
                Alert.info('Credential deleted successfully');
                fetchSummaries();
                if (expandedRow === credentialId) {
                    setExpandedRow(null);
                }
            })
            .catch((error) => {
                Alert.error('Failed to delete credential');
                console.error(error);
            })
            .finally(() => setDeletingCredential(null));
    };

    const getActionButton = (summary) => {
        const isDeleting = deletingCredential === summary.credentialId;
        const expanded = expandedRow === summary.credentialId;

        return (
            <Box sx={{
                display: 'flex', gap: 1, alignItems: 'center',
            }}
            >
                <Button
                    variant='outlined'
                    size='small'
                    onClick={() => setExpandedRow(expanded ? null : summary.credentialId)}
                    disabled={!summary.credentialId}
                    sx={{ whiteSpace: 'nowrap' }}
                >
                    <FormattedMessage
                        id='FederatedApiCredentials.view.keys'
                        defaultMessage='View'
                    />
                </Button>
                <Button
                    variant='outlined'
                    size='small'
                    color='error'
                    onClick={() => handleDeleteCredential(summary.credentialId)}
                    disabled={isDeleting || !summary.credentialId}
                    sx={{ whiteSpace: 'nowrap' }}
                >
                    {isDeleting
                        ? <CircularProgress size={16} />
                        : (
                            <FormattedMessage
                                id='FederatedApiCredentials.delete'
                                defaultMessage='Delete'
                            />
                        )}
                </Button>
            </Box>
        );
    };

    const hasOptions = !subscriptionsEnabled && subscriptionOptions && subscriptionOptions.body;
    const requiresSelection = hasOptions && !isSubscriptionOptionSelectionComplete(
        subscriptionOptions?.schemaName,
        subscriptionOptions?.body,
        selectedOption,
    );
    const noAppsAvailable = allApplications.length === 0;
    let appDropdownHelperText = '';
    if (noAppsAvailable) {
        appDropdownHelperText = 'No applications available. Create an application first.';
    }
    const resultCredential = resultData?.credential;
    const resultInvocation = resultData?.invocationInstruction;
    const ResultCredentialRenderer = getCredentialRenderer(resultCredential?.schemaName);
    const ResultInvocationRenderer = getInvocationRenderer(resultInvocation?.schemaName);
    const isWriteOnce = resultCredential && resultCredential.isValueRetrievable === false;
    const TopInvocationRenderer = getInvocationRenderer(invocationInstruction?.schemaName);

    return (
        <Root sx={{ p: 3 }}>
            {/* Invocation Instructions */}
            <Box className={classes.sectionContainer}>
                <Box className={classes.titleWrapper}>
                    <Typography variant='h5'>
                        <FormattedMessage
                            id='FederatedApiCredentials.invocation.title'
                            defaultMessage='How to Invoke'
                        />
                    </Typography>
                </Box>
                {optionsLoading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant='body2' color='text.secondary'>
                            <FormattedMessage
                                id='FederatedApiCredentials.invocation.loading'
                                defaultMessage='Loading invocation instructions...'
                            />
                        </Typography>
                    </Box>
                )}
                {!optionsLoading && invocationInstruction && TopInvocationRenderer && (
                    <TopInvocationRenderer body={invocationInstruction.body} />
                )}
                {!optionsLoading && !invocationInstruction && (
                    <Typography variant='body2' color='text.secondary'>
                        <FormattedMessage
                            id='FederatedApiCredentials.invocation.placeholder'
                            defaultMessage='No invocation guide available for this API.'
                        />
                    </Typography>
                )}
            </Box>

            {/* Credentials Table */}
            <Box className={classes.sectionContainer}>
                <Box className={classes.titleWrapper}>
                    <Typography variant='h5'>
                        <FormattedMessage
                            id='FederatedApiCredentials.table.title'
                            defaultMessage='Credentials'
                        />
                    </Typography>
                    <Box sx={{ ml: 'auto' }}>
                        <Button
                            variant='contained'
                            color='primary'
                            startIcon={<AddIcon />}
                            onClick={() => setWizardOpen(true)}
                            disabled={noAppsAvailable || supportNotConfigured}
                        >
                            <FormattedMessage
                                id='FederatedApiCredentials.add.button'
                                defaultMessage='Generate Keys'
                            />
                        </Button>
                    </Box>
                </Box>
                {supportNotConfigured && (
                    <MuiAlert severity='error' sx={{ mb: 2 }}>
                        <FormattedMessage
                            id='FederatedApiCredentials.config.missing'
                            defaultMessage='Credentials are not available for this API. Please contact your administrator.'
                        />
                    </MuiAlert>
                )}
                {noAppsAvailable && (
                    <MuiAlert severity='warning' sx={{ mb: 2 }}>
                        {subscriptionsEnabled ? (
                            <FormattedMessage
                                id='FederatedApiCredentials.apps.empty.subscription'
                                defaultMessage={'No applications found. Create an application, '
                                    + 'then subscribe it to this API.'}
                            />
                        ) : (
                            <FormattedMessage
                                id='FederatedApiCredentials.apps.empty.direct'
                                defaultMessage='No applications found. Create an application to generate credentials.'
                            />
                        )}
                    </MuiAlert>
                )}

                {summariesLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <Box className={classes.cardContent}>
                        <TableContainer>
                            <Table className={classes.credTable}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            <FormattedMessage
                                                id='FederatedApiCredentials.col.name'
                                                defaultMessage='Name'
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedMessage
                                                id='FederatedApiCredentials.col.app'
                                                defaultMessage='Application'
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {getSubscriptionOptionsColumnHeader(
                                                subscriptionOptions?.schemaName,
                                                subscriptionOptions?.body,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <FormattedMessage
                                                id='FederatedApiCredentials.col.updated'
                                                defaultMessage='Last Updated'
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedMessage
                                                id='FederatedApiCredentials.col.actions'
                                                defaultMessage='Actions'
                                            />
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {summaries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align='center'>
                                                <Typography variant='body2' color='text.secondary' sx={{ py: 3 }}>
                                                    {subscriptionsEnabled ? (
                                                        <FormattedMessage
                                                            id='FederatedApiCredentials.empty.with.subscription'
                                                            defaultMessage={'No credentials found. '
                                                                + 'Subscribe an application, then generate credentials.'}
                                                        />
                                                    ) : (
                                                        <FormattedMessage
                                                            id='FederatedApiCredentials.empty.without.subscription'
                                                            defaultMessage='No credentials found. Click Generate Keys to create one.'
                                                        />
                                                    )}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : summaries.map((summary, index) => {
                                        const rowKey = summary.credentialId || summary.subscriptionId || `${summary.name}-${index}`;
                                        const expanded = expandedRow === summary.credentialId;
                                        return (
                                            <React.Fragment key={rowKey}>
                                                <TableRow>
                                                    <TableCell>{summary.name || '-'}</TableCell>
                                                    <TableCell>{summary.applicationName || '-'}</TableCell>
                                                    <TableCell>
                                                        <SelectedOptionPreview
                                                            selectedOption={summary.selectedOption}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {summary.lastUpdatedTime
                                                            ? new Date(summary.lastUpdatedTime).toLocaleString()
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getActionButton(summary)}
                                                    </TableCell>
                                                </TableRow>
                                                {expanded && summary.credentialId && (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={5}
                                                            sx={{
                                                                py: 0,
                                                                borderLeft: '3px solid',
                                                                borderColor: 'primary.main',
                                                            }}
                                                        >
                                                            <Collapse in timeout='auto' unmountOnExit>
                                                                <FederatedCredentialPanel
                                                                    apiId={api.id}
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
                )}
            </Box>

            <Dialog
                open={wizardOpen}
                onClose={() => !creating && setWizardOpen(false)}
                maxWidth='sm'
                fullWidth
            >
                <DialogTitle>
                    <FormattedMessage
                        id='FederatedApiCredentials.wizard.title'
                        defaultMessage='Generate API Credentials'
                    />
                </DialogTitle>
                <DialogContent dividers>
                    <Box
                        sx={{
                            display: 'flex', flexDirection: 'column', gap: 2, pt: 1,
                        }}
                    >
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                select
                                label={(
                                    <FormattedMessage
                                        id='FederatedApiCredentials.app'
                                        defaultMessage='Application'
                                    />
                                )}
                                value={selectedAppId}
                                onChange={(e) => setSelectedAppId(e.target.value)}
                                size='small'
                                disabled={noAppsAvailable}
                                helperText={appDropdownHelperText}
                                sx={{ flex: 1 }}
                            >
                                {allApplications.map((app) => (
                                    <MenuItem key={app.value} value={app.value}>
                                        {app.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label={(
                                    <FormattedMessage
                                        id='FederatedApiCredentials.name'
                                        defaultMessage='Name'
                                    />
                                )}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                size='small'
                                required
                                inputProps={{ maxLength: 255 }}
                                sx={{ flex: 1 }}
                            />
                        </Box>
                        {selectedAppIncompatible && (
                            <MuiAlert severity='warning'>
                                <FormattedMessage
                                    id='FederatedApiCredentials.wizard.subscription.required'
                                    defaultMessage={'You need to create a subscription for the '
                                        + 'selected application before generating credentials.'}
                                />
                                {' '}
                                <Link to={`/apis/${api.id}/subscriptions`}>
                                    <FormattedMessage
                                        id='FederatedApiCredentials.wizard.subscription.link'
                                        defaultMessage='Go to Subscriptions'
                                    />
                                </Link>
                            </MuiAlert>
                        )}

                        {optionsLoading && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} />
                                <Typography variant='body2' color='text.secondary'>
                                    <FormattedMessage
                                        id='FederatedApiCredentials.options.loading'
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
                        {hasOptions && requiresSelection && (
                            <MuiAlert severity='warning'>
                                <FormattedMessage
                                    id='FederatedApiCredentials.option.required'
                                    defaultMessage='Select an option to continue.'
                                />
                            </MuiAlert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setWizardOpen(false)}
                        disabled={creating}
                    >
                        <FormattedMessage
                            id='FederatedApiCredentials.wizard.cancel'
                            defaultMessage='Cancel'
                        />
                    </Button>
                    <Button
                        variant='contained'
                        color='primary'
                        onClick={handleGenerate}
                        disabled={creating
                            || noAppsAvailable
                            || optionsLoading
                            || requiresSelection
                            || !name.trim()
                            || selectedAppIncompatible}
                    >
                        {creating ? <CircularProgress size={20} /> : (
                            <FormattedMessage
                                id='FederatedApiCredentials.generate'
                                defaultMessage='Generate Keys'
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
                        id='FederatedApiCredentials.result.title'
                        defaultMessage='Credential Generated'
                    />
                </DialogTitle>
                <DialogContent dividers>
                    {isWriteOnce && (
                        <MuiAlert severity='warning' sx={{ mb: 2 }}>
                            <FormattedMessage
                                id='FederatedApiCredentials.result.writeonce.warning'
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
                            id='FederatedApiCredentials.result.close'
                            defaultMessage='Done'
                        />
                    </Button>
                </DialogActions>
            </Dialog>
        </Root>
    );
}
