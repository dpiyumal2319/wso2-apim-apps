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
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import Alert from 'AppComponents/Shared/Alert';
import Api from 'AppData/api';
import { ApiContext } from '../ApiContext';
import {
    getSubscriptionOptionsColumnHeader,
    getSubscriptionOptionsRenderer,
    SelectedOptionPreview,
} from './federated/CredentialRendererRegistry';

const PREFIX = 'FederatedApiSubscriptions';

const classes = {
    sectionContainer: `${PREFIX}-sectionContainer`,
    titleWrapper: `${PREFIX}-titleWrapper`,
    cardContent: `${PREFIX}-cardContent`,
    table: `${PREFIX}-table`,
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
    [`& .${classes.table}`]: {
        '& td': {
            padding: '6px 8px',
        },
        '& th': {
            padding: '8px',
        },
        tableLayout: 'fixed',
        width: '100%',
    },
}));

export default function FederatedApiSubscriptions() {
    const { api, applicationsAvailable, updateSubscriptionData } = useContext(ApiContext);
    const restApi = new Api();
    const history = useHistory();

    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [subscriptionOptions, setSubscriptionOptions] = useState(null);
    const [subscriptionSupport, setSubscriptionSupport] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [unsubscribing, setUnsubscribing] = useState(null);
    const [selectedAppId, setSelectedAppId] = useState('');
    const [selectedOption, setSelectedOption] = useState(null);

    const optionsRenderer = getSubscriptionOptionsRenderer(subscriptionOptions?.schemaName);

    const loadSummaries = () => {
        setLoading(true);
        restApi.getApiSubscriptionSummaries(api.id)
            .then((response) => {
                setSummaries(response.body.list || []);
            })
            .catch((error) => {
                console.error('Failed to load federated subscriptions', error);
                Alert.error('Failed to load subscriptions');
            })
            .finally(() => setLoading(false));
    };

    const loadSubscriptionSupport = () => {
        setOptionsLoading(true);
        restApi.getApiSubscriptionSupport(api.id)
            .then((response) => {
                const supportInfo = response.body || {};
                const isSupported = supportInfo.subscriptionSupport === true;
                setSubscriptionSupport(isSupported);
                if (!isSupported) {
                    history.replace(`/apis/${api.id}/credentials`);
                    return;
                }
                setSubscriptionOptions(supportInfo.subscriptionOptions || null);
            })
            .catch((error) => {
                console.error('Failed to load subscription support', error);
                setSubscriptionSupport(false);
                setSubscriptionOptions(null);
                history.replace(`/apis/${api.id}/credentials`);
            })
            .finally(() => setOptionsLoading(false));
    };

    useEffect(() => {
        if (api?.id) {
            loadSubscriptionSupport();
        }
    }, [api?.id]);

    useEffect(() => {
        if (subscriptionSupport === true) {
            loadSummaries();
        } else {
            setSummaries([]);
            setLoading(false);
        }
    }, [subscriptionSupport]);

    useEffect(() => {
        if (applicationsAvailable && applicationsAvailable.length > 0 && !selectedAppId) {
            setSelectedAppId(applicationsAvailable[0].value);
        }
    }, [applicationsAvailable, selectedAppId]);

    const openCreateDialog = () => {
        setDialogOpen(true);
    };

    const closeCreateDialog = () => {
        if (creating) {
            return;
        }
        setDialogOpen(false);
        setSelectedOption(null);
    };

    const handleCreateSubscription = () => {
        if (subscriptionSupport !== true) {
            Alert.error('Federated subscriptions are not supported for this API.');
            return;
        }
        if (!selectedAppId) {
            Alert.error('Please select an application');
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
        restApi.createFederatedSubscriptionForApi(api.id, selectedAppId, wrappedSelectedOption)
            .then((response) => {
                const status = response.body?.status;
                if (status === 'ACTIVE') {
                    Alert.info('Subscribed successfully');
                } else {
                    Alert.info('Subscription request submitted. Pending approval.');
                }
                setDialogOpen(false);
                setSelectedOption(null);
                loadSummaries();
                updateSubscriptionData();
            })
            .catch((error) => {
                if (error.status === 409) {
                    Alert.error('A subscription already exists for this API and application');
                } else {
                    Alert.error('Failed to create subscription');
                }
                console.error(error);
            })
            .finally(() => setCreating(false));
    };

    const handleUnsubscribe = (subscriptionId) => {
        if (subscriptionSupport !== true) {
            Alert.error('Federated subscriptions are not supported for this API.');
            return;
        }
        setUnsubscribing(subscriptionId);
        restApi.deleteFederatedSubscription(subscriptionId)
            .then(() => {
                Alert.info('Unsubscribed successfully');
                loadSummaries();
                updateSubscriptionData();
            })
            .catch((error) => {
                Alert.error('Failed to unsubscribe');
                console.error(error);
            })
            .finally(() => setUnsubscribing(null));
    };

    const noAppsAvailable = !applicationsAvailable || applicationsAvailable.length === 0;
    const subscriptionActionDisabled = subscriptionSupport !== true;
    const hasOptions = !!(subscriptionOptions && subscriptionOptions.body);
    const requiresSelection = hasOptions && !selectedOption;

    return (
        <Root sx={{ p: 3 }}>
            <Box className={classes.sectionContainer}>
                <Box className={classes.titleWrapper}>
                    <Typography variant='h5'>
                        <FormattedMessage
                            id='FederatedApiSubscriptions.table.title'
                            defaultMessage='Subscriptions'
                        />
                    </Typography>
                    <Box sx={{ ml: 'auto' }}>
                        <Button
                            variant='contained'
                            color='primary'
                            startIcon={<AddIcon />}
                            onClick={openCreateDialog}
                            disabled={noAppsAvailable || subscriptionActionDisabled}
                        >
                            <FormattedMessage
                                id='FederatedApiSubscriptions.create.button'
                                defaultMessage='Subscribe'
                            />
                        </Button>
                    </Box>
                </Box>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <Box className={classes.cardContent}>
                        <TableContainer>
                            <Table className={classes.table}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            <FormattedMessage
                                                id='FederatedApiSubscriptions.col.app'
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
                                                id='FederatedApiSubscriptions.col.created'
                                                defaultMessage='Created'
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedMessage
                                                id='FederatedApiSubscriptions.col.updated'
                                                defaultMessage='Last Updated'
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedMessage
                                                id='FederatedApiSubscriptions.col.status'
                                                defaultMessage='Status'
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormattedMessage
                                                id='FederatedApiSubscriptions.col.actions'
                                                defaultMessage='Actions'
                                            />
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {summaries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align='center'>
                                                <Typography variant='body2' color='text.secondary' sx={{ py: 3 }}>
                                                    <FormattedMessage
                                                        id='FederatedApiSubscriptions.empty'
                                                        defaultMessage='No subscriptions found. Click Subscribe to add one.'
                                                    />
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : summaries.map((summary) => {
                                        const isStatusLocked = summary.subscriptionStatus === 'DELETE_PENDING'
                                            || summary.subscriptionStatus === 'BLOCKED'
                                            || summary.subscriptionStatus === 'ON_HOLD';
                                        const statusChipColor = (() => {
                                            switch (summary.subscriptionStatus) {
                                                case 'UNBLOCKED': return 'success';
                                                case 'ON_HOLD': return 'warning';
                                                case 'BLOCKED': return 'error';
                                                case 'REJECTED': return 'error';
                                                case 'DELETE_PENDING': return 'default';
                                                default: return 'default';
                                            }
                                        })();
                                        const statusLabel = summary.subscriptionStatus === 'UNBLOCKED'
                                            ? 'Active'
                                            : (summary.subscriptionStatus || '-');

                                        return (
                                            <TableRow key={summary.subscriptionId}>
                                                <TableCell>{summary.applicationName}</TableCell>
                                                <TableCell>
                                                    <SelectedOptionPreview selectedOption={summary.selectedOption} />
                                                </TableCell>
                                                <TableCell>
                                                    {summary.createdTime
                                                        ? new Date(summary.createdTime).toLocaleString()
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {summary.lastUpdatedTime
                                                        ? new Date(summary.lastUpdatedTime).toLocaleString()
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={statusLabel}
                                                        color={statusChipColor}
                                                        size='small'
                                                        variant='outlined'
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant='outlined'
                                                        size='small'
                                                        color='error'
                                                        disabled={unsubscribing === summary.subscriptionId
                                                            || isStatusLocked
                                                            || subscriptionActionDisabled}
                                                        onClick={() => handleUnsubscribe(summary.subscriptionId)}
                                                    >
                                                        {unsubscribing === summary.subscriptionId
                                                            ? <CircularProgress size={16} />
                                                            : (
                                                                <FormattedMessage
                                                                    id='FederatedApiSubscriptions.unsubscribe'
                                                                    defaultMessage='Unsubscribe'
                                                                />
                                                            )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </Box>

            <Dialog
                open={dialogOpen}
                onClose={closeCreateDialog}
                maxWidth='sm'
                fullWidth
            >
                <DialogTitle>
                    <FormattedMessage
                        id='FederatedApiSubscriptions.dialog.title'
                        defaultMessage='Subscribe to API'
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
                                    id='FederatedApiSubscriptions.app'
                                    defaultMessage='Application'
                                />
                            )}
                            value={selectedAppId}
                            onChange={(e) => setSelectedAppId(e.target.value)}
                            size='small'
                            disabled={noAppsAvailable || subscriptionActionDisabled}
                        >
                            {applicationsAvailable && applicationsAvailable.map((app) => (
                                <MenuItem key={app.value} value={app.value}>
                                    {app.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        {optionsLoading && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} />
                                <Typography variant='body2' color='text.secondary'>
                                    <FormattedMessage
                                        id='FederatedApiSubscriptions.options.loading'
                                        defaultMessage='Loading subscription options...'
                                    />
                                </Typography>
                            </Box>
                        )}
                        {hasOptions && optionsRenderer && React.createElement(optionsRenderer, {
                            body: subscriptionOptions.body,
                            selectedOption,
                            onSelect: setSelectedOption,
                        })}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeCreateDialog} disabled={creating}>
                        <FormattedMessage
                            id='FederatedApiSubscriptions.cancel'
                            defaultMessage='Cancel'
                        />
                    </Button>
                    <Button
                        variant='contained'
                        color='primary'
                        onClick={handleCreateSubscription}
                        disabled={creating
                            || noAppsAvailable
                            || optionsLoading
                            || requiresSelection
                            || subscriptionActionDisabled}
                    >
                        {creating ? <CircularProgress size={20} /> : (
                            <FormattedMessage
                                id='FederatedApiSubscriptions.subscribe'
                                defaultMessage='Subscribe'
                            />
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </Root>
    );
}
