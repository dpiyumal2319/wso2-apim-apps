/*
 * Copyright (c) 2026, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import SearchIcon from '@mui/icons-material/Search';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CircularProgress from '@mui/material/CircularProgress';
import { FormattedMessage, injectIntl } from 'react-intl';
import Alert from 'AppComponents/Shared/Alert';
import DiscoveredApplication from 'AppData/DiscoveredApplication';

/**
 * Dialog component for discovering and importing applications from external gateways
 */
class DiscoverDialog extends Component {
    constructor(props) {
        super(props);
        this.state = {
            environments: [],
            selectedEnvironment: '',
            applications: [],
            selectedApplications: new Set(),
            loading: false,
            loadingEnvironments: true,
            searchQuery: '',
            currentOffset: 0,
            hasNextPage: false,
            hasPreviousPage: false,
            limit: 6,
        };
    }

    componentDidMount() {
        this.loadEnvironments();
    }

    /**
     * Load available gateway environments
     */
    loadEnvironments = () => {
        this.setState({ loadingEnvironments: true });
        DiscoveredApplication.getEnvironments()
            .then((response) => {
                const environments = response.list || [];
                this.setState({
                    environments,
                    loadingEnvironments: false,
                    selectedEnvironment: environments.length > 0 ? environments[0].id : '',
                });
                // Auto-load applications if there's a default environment
                if (environments.length > 0) {
                    this.loadApplications(environments[0].id);
                }
            })
            .catch((error) => {
                console.error('Error loading environments:', error);
                const { intl } = this.props;
                Alert.error(intl.formatMessage({
                    defaultMessage: 'Error loading gateway environments',
                    id: 'Applications.Listing.DiscoverDialog.environments.error',
                }));
                this.setState({ loadingEnvironments: false });
            });
    };

    /**
     * Load discovered applications from selected environment
     */
    loadApplications = (environmentId = null, offset = 0) => {
        const { selectedEnvironment, searchQuery, limit } = this.state;
        const envId = environmentId || selectedEnvironment;

        if (!envId) {
            return;
        }

        this.setState({ loading: true, selectedApplications: new Set() });
        DiscoveredApplication.getDiscoveredApplications(envId, limit, offset, searchQuery)
            .then((response) => {
                const applications = response.list || [];
                const { pagination } = response;

                this.setState({
                    applications,
                    loading: false,
                    currentOffset: offset,
                    hasNextPage: pagination?.next !== null && pagination?.next !== undefined,
                    hasPreviousPage: offset > 0,
                });
            })
            .catch((error) => {
                console.error('Error loading applications:', error);
                const { intl } = this.props;
                Alert.error(intl.formatMessage({
                    defaultMessage: 'Error loading discovered applications',
                    id: 'Applications.Listing.DiscoverDialog.applications.error',
                }));
                this.setState({ loading: false, applications: [] });
            });
    };

    /**
     * Handle environment selection change
     */
    handleEnvironmentChange = (event) => {
        const selectedEnvironment = event.target.value;
        this.setState({
            selectedEnvironment,
            currentOffset: 0,
            selectedApplications: new Set(),
        }, () => {
            this.loadApplications(selectedEnvironment, 0);
        });
    };

    /**
     * Handle search query change
     */
    handleSearchChange = (event) => {
        this.setState({ searchQuery: event.target.value });
    };

    /**
     * Handle search action
     */
    handleSearch = () => {
        this.setState({ currentOffset: 0 }, () => {
            this.loadApplications(null, 0);
        });
    };

    /**
     * Handle search on Enter key press
     */
    handleSearchKeyPress = (event) => {
        if (event.key === 'Enter') {
            this.handleSearch();
        }
    };

    /**
     * Handle application selection toggle
     */
    handleSelectApplication = (applicationId) => {
        this.setState((prevState) => {
            const selectedApplications = new Set(prevState.selectedApplications);
            if (selectedApplications.has(applicationId)) {
                selectedApplications.delete(applicationId);
            } else {
                selectedApplications.add(applicationId);
            }
            return { selectedApplications };
        });
    };

    /**
     * Handle select all toggle
     */
    handleSelectAll = (event) => {
        const { applications } = this.state;
        if (event.target.checked) {
            const allIds = new Set(applications.map((app) => app.externalId));
            this.setState({ selectedApplications: allIds });
        } else {
            this.setState({ selectedApplications: new Set() });
        }
    };

    /**
     * Handle next page navigation
     */
    handleNextPage = () => {
        const { currentOffset, limit } = this.state;
        const nextOffset = currentOffset + limit;
        this.loadApplications(null, nextOffset);
    };

    /**
     * Handle previous page navigation
     */
    handlePreviousPage = () => {
        const { currentOffset, limit } = this.state;
        const prevOffset = Math.max(0, currentOffset - limit);
        this.loadApplications(null, prevOffset);
    };

    /**
     * Handle import action (dummy implementation)
     */
    handleImport = () => {
        const { intl } = this.props;
        const { selectedApplications } = this.state;

        if (selectedApplications.size === 0) {
            Alert.warning(intl.formatMessage({
                defaultMessage: 'Please select at least one application to import',
                id: 'Applications.Listing.DiscoverDialog.import.no.selection',
            }));
            return;
        }

        Alert.info(intl.formatMessage({
            defaultMessage: 'Import functionality will be implemented',
            id: 'Applications.Listing.DiscoverDialog.import.dummy',
        }));
    };

    /**
     * Handle view details action
     */
    handleViewDetails = (externalId) => {
        const { selectedEnvironment } = this.state;
        const { history } = this.props;
        history.push(`/applications/discover/${selectedEnvironment}/${externalId}`);
    };

    render() {
        const { open, onClose, intl } = this.props;
        const {
            environments,
            selectedEnvironment,
            applications,
            selectedApplications,
            loading,
            loadingEnvironments,
            searchQuery,
            hasNextPage,
            hasPreviousPage,
        } = this.state;

        const allSelected = applications.length > 0
            && applications.every((app) => selectedApplications.has(app.externalId));
        const someSelected = applications.some((app) => selectedApplications.has(app.externalId));

        return (
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth='lg'
                aria-labelledby='discover-dialog-title'
            >
                <DialogTitle id='discover-dialog-title'>
                    <FormattedMessage
                        id='Applications.Listing.DiscoverDialog.title'
                        defaultMessage='Discover Applications'
                    />
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 3 }}>
                        <Grid container spacing={2} alignItems='center'>
                            <Grid item xs={12} sm={5}>
                                <TextField
                                    select
                                    fullWidth
                                    label={intl.formatMessage({
                                        defaultMessage: 'Gateway Environment',
                                        id: 'Applications.Listing.DiscoverDialog.environment.label',
                                    })}
                                    value={selectedEnvironment}
                                    onChange={this.handleEnvironmentChange}
                                    disabled={loadingEnvironments || environments.length === 0}
                                    variant='outlined'
                                    size='small'
                                    margin='normal'
                                >
                                    {environments.map((env) => (
                                        <MenuItem key={env.id} value={env.id}>
                                            {env.displayName || env.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <TextField
                                    fullWidth
                                    label={intl.formatMessage({
                                        defaultMessage: 'Search',
                                        id: 'Applications.Listing.DiscoverDialog.search.label',
                                    })}
                                    placeholder={intl.formatMessage({
                                        defaultMessage: 'Search by application name',
                                        id: 'Applications.Listing.DiscoverDialog.search.placeholder',
                                    })}
                                    value={searchQuery}
                                    onChange={this.handleSearchChange}
                                    onKeyPress={this.handleSearchKeyPress}
                                    variant='outlined'
                                    size='small'
                                    margin='normal'
                                />
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <Button
                                    variant='contained'
                                    color='primary'
                                    onClick={this.handleSearch}
                                    disabled={loading || !selectedEnvironment}
                                    startIcon={<SearchIcon />}
                                    fullWidth
                                >
                                    <FormattedMessage
                                        id='Applications.Listing.DiscoverDialog.search.button'
                                        defaultMessage='Search'
                                    />
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>

                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {!loading && selectedEnvironment && (
                        <Paper elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                            {applications.length > 0 ? (
                                <>
                                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                                        <Table stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell padding='checkbox'>
                                                        <Checkbox
                                                            indeterminate={someSelected && !allSelected}
                                                            checked={allSelected}
                                                            onChange={this.handleSelectAll}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormattedMessage
                                                            id='Applications.Listing.DiscoverDialog.table.name'
                                                            defaultMessage='Application Name'
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormattedMessage
                                                            id='Applications.Listing.DiscoverDialog.table.owner'
                                                            defaultMessage='Owner'
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormattedMessage
                                                            id='Applications.Listing.DiscoverDialog.table.policy'
                                                            defaultMessage='Throttling Policy'
                                                        />
                                                    </TableCell>
                                                    <TableCell align='right'>
                                                        <FormattedMessage
                                                            id='Applications.Listing.DiscoverDialog.table.actions'
                                                            defaultMessage='Actions'
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {applications.map((app) => (
                                                    <TableRow
                                                        key={app.externalId}
                                                        hover
                                                        onClick={() => this.handleSelectApplication(app.externalId)}
                                                        sx={{ cursor: 'pointer' }}
                                                    >
                                                        <TableCell padding='checkbox'>
                                                            <Checkbox
                                                                checked={selectedApplications.has(app.externalId)}
                                                                onChange={() => this.handleSelectApplication(app.externalId)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>{app.name}</TableCell>
                                                        <TableCell>{app.owner || '-'}</TableCell>
                                                        <TableCell>{app.throttlingPolicy || app.throttlingTier || '-'}</TableCell>
                                                        <TableCell align='right'>
                                                            <Button
                                                                size='small'
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    this.handleViewDetails(app.externalId);
                                                                }}
                                                            >
                                                                <FormattedMessage
                                                                    id='Applications.Listing.DiscoverDialog.view.details'
                                                                    defaultMessage='View Details'
                                                                />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        alignItems: 'center',
                                        p: 2,
                                        borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                                    }}
                                    >
                                        <Typography variant='body2' sx={{ mr: 2 }}>
                                            <FormattedMessage
                                                id='Applications.Listing.DiscoverDialog.selected.count'
                                                defaultMessage='{count} selected'
                                                values={{ count: selectedApplications.size }}
                                            />
                                        </Typography>
                                        <IconButton
                                            onClick={this.handlePreviousPage}
                                            disabled={!hasPreviousPage || loading}
                                            size='small'
                                        >
                                            <NavigateBeforeIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={this.handleNextPage}
                                            disabled={!hasNextPage || loading}
                                            size='small'
                                        >
                                            <NavigateNextIcon />
                                        </IconButton>
                                    </Box>
                                </>
                            ) : (
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column',
                                    p: 4,
                                }}
                                >
                                    <Typography variant='h6' gutterBottom>
                                        <FormattedMessage
                                            id='Applications.Listing.DiscoverDialog.no.applications.title'
                                            defaultMessage='No Applications Found'
                                        />
                                    </Typography>
                                    <Typography variant='body2'>
                                        <FormattedMessage
                                            id='Applications.Listing.DiscoverDialog.no.applications.description'
                                            defaultMessage='No applications discovered in the selected gateway environment'
                                        />
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    )}

                    {!loading && !selectedEnvironment && (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            p: 4,
                        }}
                        >
                            <Typography variant='body2'>
                                <FormattedMessage
                                    id='Applications.Listing.DiscoverDialog.no.environment.selected'
                                    defaultMessage='Please select a gateway environment to discover applications'
                                />
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color='grey'>
                        <FormattedMessage
                            id='Applications.Listing.DiscoverDialog.cancel'
                            defaultMessage='Cancel'
                        />
                    </Button>
                    <Button
                        onClick={this.handleImport}
                        color='primary'
                        variant='contained'
                        disabled={selectedApplications.size === 0 || loading}
                    >
                        <FormattedMessage
                            id='Applications.Listing.DiscoverDialog.import'
                            defaultMessage='Import Selected ({count})'
                            values={{ count: selectedApplications.size }}
                        />
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DiscoverDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    history: PropTypes.shape({
        push: PropTypes.func,
    }).isRequired,
    intl: PropTypes.shape({
        formatMessage: PropTypes.func,
    }).isRequired,
};

export default injectIntl(DiscoverDialog);
