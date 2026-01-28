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
import { withRouter, Link } from 'react-router-dom';
import { injectIntl, FormattedMessage } from 'react-intl';
import { styled } from '@mui/material/styles';
import {
    Typography,
    Box,
    Grid,
    Button,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Chip,
    Icon,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import Alert from 'AppComponents/Shared/Alert';
import VerticalDivider from 'AppComponents/Shared/VerticalDivider';
import CustomIcon from 'AppComponents/Shared/CustomIcon';
import DiscoveredApplication from 'AppData/DiscoveredApplication';

const PREFIX = 'DiscoveredApplicationInfo';

const classes = {
    root: `${PREFIX}-root`,
    table: `${PREFIX}-table`,
    leftCol: `${PREFIX}-leftCol`,
    iconAligner: `${PREFIX}-iconAligner`,
    iconTextWrapper: `${PREFIX}-iconTextWrapper`,
    iconEven: `${PREFIX}-iconEven`,
    iconOdd: `${PREFIX}-iconOdd`,
    heading: `${PREFIX}-heading`,
    Paper: `${PREFIX}-Paper`,
};

const Root = styled('div')(({ theme }) => ({
    width: '100%',
    [`& .${classes.root}`]: {
        padding: theme.spacing(3, 2),
        '& td, & th': {
            color: theme.palette.getContrastText(theme.custom.infoBar.background),
        },
        background: theme.custom.infoBar.background,
    },
    [`& .${classes.table}`]: {
        minWidth: '100%',
    },
    [`& .${classes.leftCol}`]: {
        width: 200,
    },
    [`& .${classes.iconAligner}`]: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    [`& .${classes.iconTextWrapper}`]: {
        display: 'inline-block',
        paddingLeft: 20,
    },
    [`& .${classes.iconEven}`]: {
        color: theme.custom.infoBar.iconOddColor,
        width: theme.spacing(3),
    },
    [`& .${classes.iconOdd}`]: {
        color: theme.custom.infoBar.iconOddColor,
        width: theme.spacing(3),
    },
    [`& .${classes.heading}`]: {
        color: theme.palette.getContrastText(theme.palette.background.paper),
        paddingLeft: theme.spacing(1),
    },
    [`& .${classes.Paper}`]: {
        marginTop: theme.spacing(2),
        padding: theme.spacing(2),
    },
}));

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
            referenceDialogOpen: false,
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

    /**
     * Toggle reference artifact dialog
     */
    toggleReferenceDialog = () => {
        this.setState((prevState) => ({
            referenceDialogOpen: !prevState.referenceDialogOpen,
        }));
    };

    /**
     * Parse reference artifact for display
     */
    parseReferenceArtifact = () => {
        const { application } = this.state;
        if (!application || !application.referenceArtifact) {
            return null;
        }
        try {
            return JSON.parse(application.referenceArtifact);
        } catch (e) {
            return { rawData: application.referenceArtifact };
        }
    };

    /**
     * Render the reference artifact dialog
     */
    renderReferenceDialog = () => {
        const { referenceDialogOpen } = this.state;
        const referenceData = this.parseReferenceArtifact();

        if (!referenceData) return null;

        return (
            <Dialog
                open={referenceDialogOpen}
                onClose={this.toggleReferenceDialog}
                maxWidth='md'
                fullWidth
            >
                <DialogTitle>
                    <Box display='flex' justifyContent='space-between' alignItems='center'>
                        <FormattedMessage
                            id='Applications.Details.DiscoveredApplicationInfo.reference.artifact'
                            defaultMessage='Gateway-Specific Details'
                        />
                        <IconButton onClick={this.toggleReferenceDialog} size='small'>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Table size='small'>
                        <TableBody>
                            {Object.entries(referenceData).map(([key, value]) => (
                                <TableRow key={key}>
                                    <TableCell
                                        component='th'
                                        scope='row'
                                        sx={{ fontWeight: 'bold', width: '30%' }}
                                    >
                                        {key}
                                    </TableCell>
                                    <TableCell>
                                        {typeof value === 'object'
                                            ? JSON.stringify(value, null, 2)
                                            : String(value)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.toggleReferenceDialog}>
                        <FormattedMessage
                            id='Applications.Details.DiscoveredApplicationInfo.close'
                            defaultMessage='Close'
                        />
                    </Button>
                </DialogActions>
            </Dialog>
        );
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

        const hasReferenceArtifact = application.referenceArtifact
            && application.referenceArtifact.length > 0;

        return (
            <Root>
                {/* Info Bar - matches existing application InfoBar */}
                <Box sx={{ width: '100%' }}>
                    <Box sx={(theme) => ({
                        height: theme.custom.infoBar.height || 70,
                        background: theme.custom.infoBar.background || '#ffffff',
                        color: theme.palette.getContrastText(theme.custom.infoBar.background || '#ffffff'),
                        borderBottom: `solid 1px ${theme.palette.grey.A200}`,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: theme.spacing(2),
                    })}
                    >
                        <Grid container alignItems='center'>
                            <Grid item xs={8}>
                                <Box display='flex' alignItems='center'>
                                    <Link to='/applications'>
                                        <CustomIcon width={42} height={42} icon='applications' />
                                    </Link>
                                    <Box sx={(theme) => ({ marginLeft: theme.spacing(1) })}>
                                        <Typography
                                            id='itest-info-bar-application-name'
                                            variant='h4'
                                            noWrap
                                        >
                                            {application.name}
                                        </Typography>
                                        <Typography variant='caption' gutterBottom align='left' noWrap>
                                            <FormattedMessage
                                                id='Applications.Details.DiscoveredApplicationInfo.discovered.app'
                                                defaultMessage='Discovered Application'
                                            />
                                            {application.alreadyImported && (
                                                <Chip
                                                    label={intl.formatMessage({
                                                        defaultMessage: 'Imported',
                                                        id: 'Applications.Details.DiscoveredApplicationInfo.imported.chip',
                                                    })}
                                                    size='small'
                                                    color='success'
                                                    sx={{ ml: 1 }}
                                                />
                                            )}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid item xs={4}>
                                <Grid container justifyContent='flex-end' alignItems='center'>
                                    <VerticalDivider height={70} />
                                    <Grid item sx={{ mx: 1 }}>
                                        <Button
                                            onClick={this.handleBack}
                                            color='grey'
                                            sx={{
                                                padding: '4px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <ArrowBackIcon />
                                            <Typography variant='caption' sx={{ mt: '2px' }}>
                                                <FormattedMessage
                                                    id='Applications.Details.DiscoveredApplicationInfo.back'
                                                    defaultMessage='Back'
                                                />
                                            </Typography>
                                        </Button>
                                    </Grid>
                                    <VerticalDivider height={70} />
                                    <Grid item sx={{ mx: 1 }}>
                                        <Button
                                            onClick={this.handleImport}
                                            disabled={importing || application.alreadyImported}
                                            color='grey'
                                            sx={{
                                                padding: '4px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                opacity: application.alreadyImported ? 0.5 : 1,
                                            }}
                                        >
                                            {importing ? (
                                                <CircularProgress size={20} />
                                            ) : (
                                                <CloudDownloadIcon />
                                            )}
                                            <Typography variant='caption' sx={{ mt: '2px' }}>
                                                {application.alreadyImported ? (
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.already.imported'
                                                        defaultMessage='Imported'
                                                    />
                                                ) : (
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.import'
                                                        defaultMessage='Import'
                                                    />
                                                )}
                                            </Typography>
                                        </Button>
                                    </Grid>
                                    {hasReferenceArtifact && (
                                        <>
                                            <VerticalDivider height={70} />
                                            <Grid item sx={{ mx: 1, mr: 2 }}>
                                                <Button
                                                    onClick={this.toggleReferenceDialog}
                                                    color='grey'
                                                    sx={{
                                                        padding: '4px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                    }}
                                                >
                                                    <InfoIcon />
                                                    <Typography variant='caption' sx={{ mt: '2px' }}>
                                                        <FormattedMessage
                                                            id='Applications.Details.DiscoveredApplicationInfo.more.info'
                                                            defaultMessage='More Info'
                                                        />
                                                    </Typography>
                                                </Button>
                                            </Grid>
                                        </>
                                    )}
                                </Grid>
                            </Grid>
                        </Grid>
                    </Box>
                </Box>

                {/* Overview Section - matches existing Overview component style */}
                <div className={classes.root}>
                    <Table className={classes.table}>
                        <TableBody>
                            {application.description && (
                                <TableRow>
                                    <TableCell component='th' scope='row' className={classes.leftCol}>
                                        <div className={classes.iconAligner}>
                                            <Icon className={classes.iconEven}>description</Icon>
                                            <span className={classes.iconTextWrapper}>
                                                <Typography variant='caption' gutterBottom align='left'>
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.description'
                                                        defaultMessage='Description'
                                                    />
                                                </Typography>
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{application.description}</TableCell>
                                </TableRow>
                            )}
                            <TableRow>
                                <TableCell component='th' scope='row' className={classes.leftCol}>
                                    <div className={classes.iconAligner}>
                                        <Icon className={classes.iconOdd}>settings_input_component</Icon>
                                        <span className={classes.iconTextWrapper}>
                                            <Typography variant='caption' gutterBottom align='left'>
                                                <FormattedMessage
                                                    id='Applications.Details.DiscoveredApplicationInfo.tier'
                                                    defaultMessage='Throttling Tier'
                                                />
                                            </Typography>
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>{application.tier || 'Unlimited'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell component='th' scope='row' className={classes.leftCol}>
                                    <div className={classes.iconAligner}>
                                        <Icon className={classes.iconEven}>person</Icon>
                                        <span className={classes.iconTextWrapper}>
                                            <Typography variant='caption' gutterBottom align='left'>
                                                <FormattedMessage
                                                    id='Applications.Details.DiscoveredApplicationInfo.owner'
                                                    defaultMessage='Owner'
                                                />
                                            </Typography>
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>{application.owner || '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell component='th' scope='row' className={classes.leftCol}>
                                    <div className={classes.iconAligner}>
                                        <Icon className={classes.iconOdd}>fingerprint</Icon>
                                        <span className={classes.iconTextWrapper}>
                                            <Typography variant='caption' gutterBottom align='left'>
                                                <FormattedMessage
                                                    id='Applications.Details.DiscoveredApplicationInfo.external.id'
                                                    defaultMessage='External ID'
                                                />
                                            </Typography>
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <code>{application.externalId}</code>
                                </TableCell>
                            </TableRow>
                            {application.createdTime && (
                                <TableRow>
                                    <TableCell component='th' scope='row' className={classes.leftCol}>
                                        <div className={classes.iconAligner}>
                                            <Icon className={classes.iconEven}>schedule</Icon>
                                            <span className={classes.iconTextWrapper}>
                                                <Typography variant='caption' gutterBottom align='left'>
                                                    <FormattedMessage
                                                        id='Applications.Details.DiscoveredApplicationInfo.created.time'
                                                        defaultMessage='Created Time'
                                                    />
                                                </Typography>
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(application.createdTime).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Application Keys Section */}
                {application.keyInfoList && application.keyInfoList.length > 0 && (
                    <Paper className={classes.Paper} sx={{ mx: 2 }}>
                        <Typography variant='h6' className={classes.heading} gutterBottom>
                            <FormattedMessage
                                id='Applications.Details.DiscoveredApplicationInfo.keys'
                                defaultMessage='Application Keys'
                            />
                        </Typography>
                        <Table size='small'>
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
                )}

                {/* API Subscriptions Section */}
                {application.subscribedApis && application.subscribedApis.length > 0 && (
                    <Paper className={classes.Paper} sx={{ mx: 2 }}>
                        <Typography variant='h6' className={classes.heading} gutterBottom>
                            <FormattedMessage
                                id='Applications.Details.DiscoveredApplicationInfo.subscriptions'
                                defaultMessage='API Subscriptions'
                            />
                        </Typography>
                        <Table size='small'>
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
                )}

                {/* Reference Artifact Dialog */}
                {this.renderReferenceDialog()}
            </Root>
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
