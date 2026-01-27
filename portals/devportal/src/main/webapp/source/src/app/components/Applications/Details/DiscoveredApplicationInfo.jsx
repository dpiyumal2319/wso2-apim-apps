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
import { withRouter } from 'react-router-dom';
import { injectIntl, FormattedMessage } from 'react-intl';
import {
    Paper,
    Typography,
    Box,
    Grid,
    Divider,
    Button,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import Alert from 'AppComponents/Shared/Alert';
import DiscoveredApplication from 'AppData/DiscoveredApplication';

/**
 * Component to display detailed information about a discovered application
 */
class DiscoveredApplicationInfo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            application: null,
            loading: true,
            importing: false,
        };
    }

    componentDidMount() {
        this.loadApplicationDetails();
    }

    /**
     * Load discovered application details
     */
    loadApplicationDetails = () => {
        const { match } = this.props;
        const { environmentId, applicationId } = match.params;

        this.setState({ loading: true });

        DiscoveredApplication.getDiscoveredApplication(environmentId, applicationId)
            .then((response) => {
                this.setState({
                    application: response,
                    loading: false,
                });
            })
            .catch((error) => {
                console.error('Error loading application details:', error);
                const { intl } = this.props;
                Alert.error(intl.formatMessage({
                    defaultMessage: 'Error loading application details',
                    id: 'Applications.Details.DiscoveredApplicationInfo.load.error',
                }));
                this.setState({ loading: false });
            });
    };

    /**
     * Handle import action
     */
    handleImport = () => {
        const { application } = this.state;
        const { history, match, intl } = this.props;
        const { environmentId } = match.params;

        this.setState({ importing: true });

        const payload = {
            environmentId,
            referenceArtifact: application.referenceArtifact || JSON.stringify({
                externalId: application.externalId,
                name: application.name,
            }),
        };

        DiscoveredApplication.importDiscoveredApplication(payload)
            .then(() => {
                Alert.info(intl.formatMessage({
                    defaultMessage: 'Application imported successfully',
                    id: 'Applications.Details.DiscoveredApplicationInfo.import.success',
                }));
                this.setState({ importing: false });
                history.push('/applications');
            })
            .catch((error) => {
                console.error('Error importing application:', error);
                if (error.status === 409) {
                    Alert.error(intl.formatMessage({
                        defaultMessage: 'Application already exists',
                        id: 'Applications.Details.DiscoveredApplicationInfo.import.conflict',
                    }));
                } else {
                    Alert.error(intl.formatMessage({
                        defaultMessage: 'Error importing application',
                        id: 'Applications.Details.DiscoveredApplicationInfo.import.error',
                    }));
                }
                this.setState({ importing: false });
            });
    };

    /**
     * Handle back navigation
     */
    handleBack = () => {
        const { history } = this.props;
        history.goBack();
    };

    render() {
        const { application, loading, importing } = this.state;
        const { intl } = this.props;

        if (loading) {
            return (
                <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
                    <CircularProgress />
                </Box>
            );
        }

        if (!application) {
            return (
                <Box p={3}>
                    <Typography variant='h6' color='error'>
                        <FormattedMessage
                            id='Applications.Details.DiscoveredApplicationInfo.not.found'
                            defaultMessage='Application not found'
                        />
                    </Typography>
                </Box>
            );
        }

        return (
            <Box sx={{ flexGrow: 1 }}>
                {/* Header Section */}
                <Box sx={(theme) => ({
                    minHeight: 80,
                    background: theme.custom.infoBar.background,
                    color: theme.palette.getContrastText(theme.custom.infoBar.background),
                    borderBottom: `solid 1px ${theme.palette.grey.A200}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 3,
                    py: 2,
                })}
                >
                    <Box display='flex' alignItems='center'>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={this.handleBack}
                            sx={{ mr: 2 }}
                            color='inherit'
                        >
                            <FormattedMessage
                                id='Applications.Details.DiscoveredApplicationInfo.back'
                                defaultMessage='Back'
                            />
                        </Button>
                        <Box>
                            <Typography variant='h4' component='h1'>
                                {application.name}
                            </Typography>
                            <Typography variant='caption'>
                                <FormattedMessage
                                    id='Applications.Details.DiscoveredApplicationInfo.subtitle'
                                    defaultMessage='Discovered Application'
                                />
                            </Typography>
                        </Box>
                    </Box>
                    <Button
                        variant='contained'
                        color='primary'
                        startIcon={<CloudDownloadIcon />}
                        onClick={this.handleImport}
                        disabled={importing || application.alreadyImported}
                    >
                        {importing && <CircularProgress size={20} color='inherit' />}
                        {!importing && application.alreadyImported && (
                            <FormattedMessage
                                id='Applications.Details.DiscoveredApplicationInfo.already.imported'
                                defaultMessage='Already Imported'
                            />
                        )}
                        {!importing && !application.alreadyImported && (
                            <FormattedMessage
                                id='Applications.Details.DiscoveredApplicationInfo.import'
                                defaultMessage='Import Application'
                            />
                        )}
                    </Button>
                </Box>

                {/* Content Section */}
                <Box p={4}>
                    <Grid container spacing={3}>
                        {/* Basic Information Card */}
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, height: '100%' }}>
                                <Typography variant='h6' gutterBottom>
                                    <FormattedMessage
                                        id='Applications.Details.DiscoveredApplicationInfo.basic.info'
                                        defaultMessage='Basic Information'
                                    />
                                </Typography>
                                <Divider sx={{ mb: 2 }} />

                                <Box mb={2}>
                                    <Typography variant='subtitle2' color='textSecondary'>
                                        <FormattedMessage
                                            id='Applications.Details.DiscoveredApplicationInfo.external.id'
                                            defaultMessage='External ID'
                                        />
                                    </Typography>
                                    <Typography variant='body1'>
                                        {application.externalId}
                                    </Typography>
                                </Box>

                                <Box mb={2}>
                                    <Typography variant='subtitle2' color='textSecondary'>
                                        <FormattedMessage
                                            id='Applications.Details.DiscoveredApplicationInfo.name'
                                            defaultMessage='Application Name'
                                        />
                                    </Typography>
                                    <Typography variant='body1'>
                                        {application.name}
                                    </Typography>
                                </Box>

                                <Box mb={2}>
                                    <Typography variant='subtitle2' color='textSecondary'>
                                        <FormattedMessage
                                            id='Applications.Details.DiscoveredApplicationInfo.owner'
                                            defaultMessage='Owner'
                                        />
                                    </Typography>
                                    <Typography variant='body1'>
                                        {application.owner || '-'}
                                    </Typography>
                                </Box>

                                <Box mb={2}>
                                    <Typography variant='subtitle2' color='textSecondary'>
                                        <FormattedMessage
                                            id='Applications.Details.DiscoveredApplicationInfo.tier'
                                            defaultMessage='Throttling Tier'
                                        />
                                    </Typography>
                                    <Typography variant='body1'>
                                        {application.tier || 'Unlimited'}
                                    </Typography>
                                </Box>

                                {application.description && (
                                    <Box mb={2}>
                                        <Typography variant='subtitle2' color='textSecondary'>
                                            <FormattedMessage
                                                id='Applications.Details.DiscoveredApplicationInfo.description'
                                                defaultMessage='Description'
                                            />
                                        </Typography>
                                        <Typography variant='body1'>
                                            {application.description}
                                        </Typography>
                                    </Box>
                                )}

                                {application.createdTime && (
                                    <Box>
                                        <Typography variant='subtitle2' color='textSecondary'>
                                            <FormattedMessage
                                                id='Applications.Details.DiscoveredApplicationInfo.created.time'
                                                defaultMessage='Created Time'
                                            />
                                        </Typography>
                                        <Typography variant='body1'>
                                            {new Date(application.createdTime).toLocaleString()}
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>

                        {/* Import Status Card */}
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, height: '100%' }}>
                                <Typography variant='h6' gutterBottom>
                                    <FormattedMessage
                                        id='Applications.Details.DiscoveredApplicationInfo.import.status'
                                        defaultMessage='Import Status'
                                    />
                                </Typography>
                                <Divider sx={{ mb: 2 }} />

                                <Box mb={2}>
                                    <Typography variant='subtitle2' color='textSecondary'>
                                        <FormattedMessage
                                            id='Applications.Details.DiscoveredApplicationInfo.status'
                                            defaultMessage='Status'
                                        />
                                    </Typography>
                                    <Box mt={1}>
                                        {application.alreadyImported ? (
                                            <Chip
                                                label={intl.formatMessage({
                                                    defaultMessage: 'Already Imported',
                                                    id: 'Applications.Details.DiscoveredApplicationInfo.status.imported',
                                                })}
                                                color='success'
                                            />
                                        ) : (
                                            <Chip
                                                label={intl.formatMessage({
                                                    defaultMessage: 'Not Imported',
                                                    id: 'Applications.Details.DiscoveredApplicationInfo.status.not.imported',
                                                })}
                                                color='default'
                                            />
                                        )}
                                    </Box>
                                </Box>

                                {application.alreadyImported && application.importedApplicationId && (
                                    <Box mb={2}>
                                        <Typography variant='subtitle2' color='textSecondary'>
                                            <FormattedMessage
                                                id='Applications.Details.DiscoveredApplicationInfo.imported.app.id'
                                                defaultMessage='Imported Application ID'
                                            />
                                        </Typography>
                                        <Typography variant='body1'>
                                            {application.importedApplicationId}
                                        </Typography>
                                    </Box>
                                )}

                                {application.attributes && Object.keys(application.attributes).length > 0 && (
                                    <Box>
                                        <Typography variant='subtitle2' color='textSecondary' gutterBottom>
                                            <FormattedMessage
                                                id='Applications.Details.DiscoveredApplicationInfo.attributes'
                                                defaultMessage='Additional Attributes'
                                            />
                                        </Typography>
                                        {Object.entries(application.attributes).map(([key, value]) => (
                                            <Box key={key} mb={1}>
                                                <Typography variant='caption' color='textSecondary'>
                                                    {key}
                                                    :
                                                </Typography>
                                                <Typography variant='body2'>
                                                    {value}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Paper>
                        </Grid>

                        {/* Application Keys Card */}
                        {application.keyInfoList && application.keyInfoList.length > 0 && (
                            <Grid item xs={12}>
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant='h6' gutterBottom>
                                        <FormattedMessage
                                            id='Applications.Details.DiscoveredApplicationInfo.keys'
                                            defaultMessage='Application Keys'
                                        />
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />

                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.key.type'
                                                        defaultMessage='Key Type'
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.key.name'
                                                        defaultMessage='Key Name'
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.key.value'
                                                        defaultMessage='Masked Key'
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.key.state'
                                                        defaultMessage='State'
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {application.keyInfoList.map((key) => (
                                                <TableRow key={`${key.keyType}-${key.keyName || 'default'}`}>
                                                    <TableCell>{key.keyType}</TableCell>
                                                    <TableCell>{key.keyName || '-'}</TableCell>
                                                    <TableCell>
                                                        <code>{key.maskedKeyValue || '***'}</code>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={key.state || 'ACTIVE'}
                                                            size='small'
                                                            color={key.state === 'ACTIVE' ? 'success' : 'default'}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Paper>
                            </Grid>
                        )}

                        {/* Subscriptions Card */}
                        {application.subscribedApis && application.subscribedApis.length > 0 && (
                            <Grid item xs={12}>
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant='h6' gutterBottom>
                                        <FormattedMessage
                                            id='Applications.Details.DiscoveredApplicationInfo.subscriptions'
                                            defaultMessage='API Subscriptions'
                                        />
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />

                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.api.name'
                                                        defaultMessage='API Name'
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.api.version'
                                                        defaultMessage='Version'
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.api.context'
                                                        defaultMessage='Context'
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.subscription.tier'
                                                        defaultMessage='Tier'
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.subscription.status'
                                                        defaultMessage='Status'
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {application.subscribedApis.map((subscription) => {
                                                const {
                                                    apiName,
                                                    apiVersion,
                                                    apiContext,
                                                    subscriptionTier,
                                                    subscriptionStatus,
                                                } = subscription;

                                                return (
                                                    <TableRow key={`${apiName}-${apiVersion}-${apiContext}`}>
                                                        <TableCell>{apiName}</TableCell>
                                                        <TableCell>{apiVersion}</TableCell>
                                                        <TableCell>{apiContext}</TableCell>
                                                        <TableCell>{subscriptionTier || 'Unlimited'}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={subscriptionStatus || 'ACTIVE'}
                                                                size='small'
                                                                color={subscriptionStatus === 'ACTIVE' ? 'success' : 'warning'}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            </Box>
        );
    }
}

DiscoveredApplicationInfo.propTypes = {
    match: PropTypes.shape({
        params: PropTypes.shape({
            environmentId: PropTypes.string.isRequired,
            applicationId: PropTypes.string.isRequired,
        }).isRequired,
    }).isRequired,
    history: PropTypes.shape({
        push: PropTypes.func.isRequired,
        goBack: PropTypes.func.isRequired,
    }).isRequired,
    intl: PropTypes.shape({
        formatMessage: PropTypes.func,
    }).isRequired,
};

export default withRouter(injectIntl(DiscoveredApplicationInfo));
