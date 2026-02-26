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
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { FormattedMessage } from 'react-intl';
import Api from 'AppData/api';
import Alert from 'AppComponents/Shared/Alert';
import { ApiContext } from '../ApiContext';
import FederatedCredentialPanel from './FederatedCredentialPanel';
import {
    getSubscriptionOptionsRenderer,
    getSubscriptionOptionsColumnHeader,
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
 * Top section: Generation wizard (select app, name, subscription option, generate)
 * Bottom section: Credentials table with expandable rows
 */
export default function FederatedApiCredentials() {
    const {
        api,
        applicationsAvailable,
        updateSubscriptionData,
    } = useContext(ApiContext);

    const [summaries, setSummaries] = useState([]);
    const [summariesLoading, setSummariesLoading] = useState(true);

    // Wizard state
    const [selectedAppId, setSelectedAppId] = useState('');
    const [name, setName] = useState('');
    const [subscriptionOptions, setSubscriptionOptions] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [unsubscribing, setUnsubscribing] = useState(null); // subscriptionId being unsubscribed
    const [provisioning, setProvisioning] = useState(null); // subscriptionId being provisioned
    const [provisionedData, setProvisionedData] = useState({}); // subscriptionId -> create response body

    // Table expand state
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
        if (api && api.id) {
            fetchSummaries();
            fetchSubscriptionOptions();
        }
    }, [api?.id]);

    // Set default app when apps become available
    useEffect(() => {
        if (applicationsAvailable && applicationsAvailable.length > 0 && !selectedAppId) {
            setSelectedAppId(applicationsAvailable[0].value);
        }
    }, [applicationsAvailable]);

    const handleGenerate = () => {
        if (!selectedAppId) {
            Alert.error('Please select an application');
            return;
        }

        if (!name.trim()) {
            Alert.error('Please provide a name for the credential');
            return;
        }

        // Build selectedOption wrapper: {schemaName, body}
        let wrappedSelectedOption = null;
        if (selectedOption && subscriptionOptions) {
            wrappedSelectedOption = JSON.stringify({
                schemaName: subscriptionOptions.schemaName,
                body: selectedOption,
            });
        }

        setCreating(true);
        restApi.createFederatedCredentialForApi(
            api.id,
            selectedAppId,
            name,
            wrappedSelectedOption,
        )
            .then((response) => {
                const result = response.body;
                if (result.status === 'ACTIVE') {
                    Alert.info('Credential generated successfully');
                    setExpandedRow(result.subscriptionId);
                } else {
                    Alert.info('Subscription requires approval. You will be able to generate keys after approval.');
                }
                // Refresh summaries table and subscription data
                fetchSummaries();
                updateSubscriptionData();
                // Reset wizard
                setName('');
                setSelectedOption(null);
                setSelectedAppId('');
            })
            .catch((error) => {
                if (error.status === 409) {
                    Alert.error('A subscription already exists for this API and application');
                } else {
                    Alert.error('Failed to generate credential');
                }
                console.error(error);
            })
            .finally(() => setCreating(false));
    };

    const handleLazyProvision = (subscriptionId) => {
        // Subscription approved but credential not yet generated (lazy provisioning).
        // selectedOption is resolved from the stored subscription record on the server side.
        setProvisioning(subscriptionId);
        restApi.createFederatedSubscription(subscriptionId)
            .then((response) => {
                Alert.info('Credential generated successfully');
                setProvisionedData((prev) => ({ ...prev, [subscriptionId]: response.body }));
                fetchSummaries();
                setExpandedRow(subscriptionId);
            })
            .catch((error) => {
                Alert.error('Failed to generate credential');
                console.error(error);
            })
            .finally(() => setProvisioning(null));
    };

    const handleUnsubscribe = (subscriptionId) => {
        setUnsubscribing(subscriptionId);
        restApi.deleteSubscription(subscriptionId)
            .then(() => {
                Alert.info('Unsubscribed successfully');
                fetchSummaries();
                updateSubscriptionData();
                if (expandedRow === subscriptionId) {
                    setExpandedRow(null);
                }
            })
            .catch((error) => {
                if (error.status === 200 || error.status === 201) {
                    Alert.info('Unsubscribe request submitted. Pending approval.');
                    fetchSummaries();
                    updateSubscriptionData();
                } else {
                    Alert.error('Failed to unsubscribe');
                    console.error(error);
                }
            })
            .finally(() => setUnsubscribing(null));
    };

    const getStatusChip = (summary) => {
        const { subscriptionStatus, isProvisioned } = summary;

        if (subscriptionStatus === 'DELETE_PENDING') {
            return <Chip label='Deletion Pending' size='small' color='warning' />;
        }
        if (subscriptionStatus === 'ON_HOLD') {
            return <Chip label='Pending Approval' size='small' color='info' />;
        }
        if (subscriptionStatus === 'UNBLOCKED' && !isProvisioned) {
            return <Chip label='Approved' size='small' color='primary' variant='outlined' />;
        }
        if (subscriptionStatus === 'UNBLOCKED' && isProvisioned) {
            return <Chip label='Active' size='small' color='success' />;
        }
        return <Chip label={subscriptionStatus} size='small' />;
    };

    const getActionButton = (summary) => {
        const { subscriptionStatus, isProvisioned } = summary;
        const isUnsubscribing = unsubscribing === summary.subscriptionId;
        const isProvisioning = provisioning === summary.subscriptionId;

        return (
            <Box sx={{
                display: 'flex', gap: 1, alignItems: 'center',
            }}
            >
                {subscriptionStatus === 'UNBLOCKED' && !isProvisioned && (
                    <Button
                        variant='contained'
                        size='small'
                        color='primary'
                        onClick={() => handleLazyProvision(summary.subscriptionId)}
                        disabled={isProvisioning || isUnsubscribing}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        {isProvisioning
                            ? <CircularProgress size={16} />
                            : (
                                <FormattedMessage
                                    id='FederatedApiCredentials.generate.keys'
                                    defaultMessage='Generate Keys'
                                />
                            )}
                    </Button>
                )}
                <Button
                    variant='outlined'
                    size='small'
                    color='error'
                    onClick={() => handleUnsubscribe(summary.subscriptionId)}
                    disabled={subscriptionStatus === 'DELETE_PENDING' || isUnsubscribing}
                >
                    {isUnsubscribing
                        ? <CircularProgress size={16} />
                        : (
                            <FormattedMessage
                                id='FederatedApiCredentials.unsubscribe'
                                defaultMessage='Unsubscribe'
                            />
                        )}
                </Button>
            </Box>
        );
    };

    const isExpandable = (summary) => {
        return summary.subscriptionStatus === 'UNBLOCKED' && summary.isProvisioned;
    };

    const hasOptions = subscriptionOptions && subscriptionOptions.body;
    const requiresSelection = hasOptions && !selectedOption;
    const noAppsAvailable = !applicationsAvailable || applicationsAvailable.length === 0;

    return (
        <Root sx={{ p: 3 }}>
            {/* Generation Wizard */}
            <Box className={classes.sectionContainer}>
                <Box className={classes.titleWrapper}>
                    <Typography variant='h5'>
                        <FormattedMessage
                            id='FederatedApiCredentials.wizard.title'
                            defaultMessage='Generate API Credentials'
                        />
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Application and Display Name - side by side */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            select
                            label={<FormattedMessage id='FederatedApiCredentials.app' defaultMessage='Application' />}
                            value={selectedAppId}
                            onChange={(e) => setSelectedAppId(e.target.value)}
                            size='small'
                            disabled={noAppsAvailable}
                            helperText={noAppsAvailable
                                ? 'No applications available. Create an application or all are already subscribed.'
                                : ''}
                            sx={{ flex: 1 }}
                        >
                            {applicationsAvailable && applicationsAvailable.map((app) => (
                                <MenuItem key={app.value} value={app.value}>
                                    {app.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Name */}
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

                    {/* Subscription options */}
                    {optionsLoading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant='body2' color='text.secondary'>
                                Loading subscription options...
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

                    {/* Generate button */}
                    <Box>
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
                    </Box>
                </Box>
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
                                        <TableCell padding='checkbox' />
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
                                                id='FederatedApiCredentials.col.status'
                                                defaultMessage='Status'
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
                                            <TableCell colSpan={7} align='center'>
                                                <Typography variant='body2' color='text.secondary' sx={{ py: 3 }}>
                                                    <FormattedMessage
                                                        id='FederatedApiCredentials.empty'
                                                        defaultMessage={'No credentials yet. Use the form above to '
                                                            + 'generate your first credential.'}
                                                    />
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : summaries.map((summary) => {
                                        const expanded = expandedRow === summary.subscriptionId;
                                        const canExpand = isExpandable(summary);
                                        return (
                                            <React.Fragment key={summary.subscriptionId}>
                                                <TableRow
                                                    hover={canExpand}
                                                    sx={canExpand ? { cursor: 'pointer' } : {}}
                                                    onClick={() => {
                                                        if (canExpand) {
                                                            setExpandedRow(expanded ? null : summary.subscriptionId);
                                                        }
                                                    }}
                                                >
                                                    <TableCell padding='checkbox'>
                                                        {canExpand && (
                                                            <IconButton size='small'>
                                                                {expanded
                                                                    ? <KeyboardArrowUpIcon />
                                                                    : <KeyboardArrowDownIcon />}
                                                            </IconButton>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{summary.name}</TableCell>
                                                    <TableCell>{summary.applicationName}</TableCell>
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
                                                        {getStatusChip(summary)}
                                                    </TableCell>
                                                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        {getActionButton(summary)}
                                                    </TableCell>
                                                </TableRow>
                                                {canExpand && (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={7}
                                                            sx={{
                                                                py: 0,
                                                                borderLeft: expanded ? '3px solid' : 'none',
                                                                borderColor: 'primary.main',
                                                            }}
                                                        >
                                                            <Collapse in={expanded} timeout='auto' unmountOnExit>
                                                                <FederatedCredentialPanel
                                                                    subscriptionId={summary.subscriptionId}
                                                                    initialData={provisionedData[summary.subscriptionId]}
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
        </Root>
    );
}
