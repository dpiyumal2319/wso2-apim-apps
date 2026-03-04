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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import Api from 'AppData/api';
import { getBasePath } from 'AppUtils/utils';
import { SelectedOptionPreview } from 'AppComponents/Apis/Details/Credentials/federated/CredentialRendererRegistry';
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
    const [credentialSummaries, setCredentialSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);
    const [deletingCredential, setDeletingCredential] = useState(null);

    const fetchCredentialSummaries = async () => {
        setLoading(true);
        try {
            const client = new Api();
            const response = await client.getApplicationCredentialSummaries(application.applicationId);
            setCredentialSummaries(response?.body?.list || []);
        } catch (error) {
            console.error('Failed to fetch application credential summaries:', error);
            setCredentialSummaries([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (application?.applicationId) {
            fetchCredentialSummaries();
        }
    }, [application?.applicationId]);

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
                                defaultMessage='Federated API Credentials'
                            />
                        </Typography>
                    </Box>
                    <Typography variant='body2' className={classes.description}>
                        <FormattedMessage
                            id='Applications.Details.SubscriptionKeys.description'
                            defaultMessage='This page lists federated credentials issued for this application across subscribed APIs.'
                        />
                    </Typography>
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
                                                        defaultMessage={'No federated credentials have'
                                                            + ' been generated for this application yet.'}
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
