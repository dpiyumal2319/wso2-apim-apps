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
import { FormattedMessage } from 'react-intl';
import Api from 'AppData/api';
import Alert from 'AppComponents/Shared/Alert';
import { ApiContext } from '../ApiContext';
import FederatedCredentialPanel from './FederatedCredentialPanel';
import {
    getSubscriptionOptionsRenderer,
    getSubscriptionOptionsColumnHeader,
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
        subscriptionSupport,
        updateSubscriptionData,
    } = useContext(ApiContext);

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
            })
            .finally(() => setOptionsLoading(false));
    };

    useEffect(() => {
        if (api && api.id) {
            fetchSummaries();
            fetchSubscriptionOptions();
        }
    }, [api?.id]);

    // Pick first app from whichever list is active when the wizard opens
    const wizardApps = subscriptionSupport
        ? (subscribedApplications || [])
        : (applicationsAvailable || []);

    useEffect(() => {
        if (wizardApps.length > 0 && !selectedAppId) {
            setSelectedAppId(wizardApps[0].value);
        }
    }, [wizardApps.length, selectedAppId]);

    const openResultDialog = (data) => {
        setResultData(data);
        setResultDialogOpen(true);
    };

    const handleGenerate = () => {
        if (!selectedAppId) {
            Alert.error('Please select an application');
            return;
        }
        if (!name.trim()) {
            Alert.error('Please provide a name for the credential');
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

    const hasOptions = !subscriptionSupport && subscriptionOptions && subscriptionOptions.body;
    const requiresSelection = hasOptions && !selectedOption;
    const noAppsAvailable = wizardApps.length === 0;
    let appDropdownHelperText = '';
    if (noAppsAvailable) {
        appDropdownHelperText = subscriptionSupport
            ? 'No subscribed applications. Subscribe to this API first.'
            : 'No applications available. Create an application first.';
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
                            disabled={noAppsAvailable}
                        >
                            <FormattedMessage
                                id='FederatedApiCredentials.add.button'
                                defaultMessage='Generate Keys'
                            />
                        </Button>
                    </Box>
                </Box>

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
                                                    <FormattedMessage
                                                        id='FederatedApiCredentials.empty'
                                                        defaultMessage='No credentials found.'
                                                    />
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
                    <Box sx={{
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
                                {wizardApps.map((app) => (
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
                        disabled={creating || noAppsAvailable || optionsLoading || requiresSelection || !name.trim()}
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
