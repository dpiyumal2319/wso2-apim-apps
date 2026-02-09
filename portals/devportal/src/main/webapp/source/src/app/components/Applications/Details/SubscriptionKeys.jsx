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
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import { FormattedMessage } from 'react-intl';
import Subscription from 'AppData/Subscription';
import { app } from 'Settings';
import InlineMessage from 'AppComponents/Shared/InlineMessage';
import SubscriptionKeyRow from './SubscriptionKeyRow';

const PREFIX = 'SubscriptionKeys';

const classes = {
    root: `${PREFIX}-root`,
    firstCell: `${PREFIX}-firstCell`,
    cardContent: `${PREFIX}-cardContent`,
    titleWrapper: `${PREFIX}-titleWrapper`,
    genericMessageWrapper: `${PREFIX}-genericMessageWrapper`,
    subsTable: `${PREFIX}-subsTable`,
    sectionContainer: `${PREFIX}-sectionContainer`,
    description: `${PREFIX}-description`,
};

const Root = styled('div')((
    {
        theme,
    },
) => ({
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

    [`& .${classes.firstCell}`]: {
        paddingLeft: 0,
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

    [`& .${classes.genericMessageWrapper}`]: {
        margin: theme.spacing(2),
    },

    [`& .${classes.description}`]: {
        marginBottom: theme.spacing(2),
        color: theme.palette.text.secondary,
    },

    [`& .${classes.subsTable}`]: {
        '& td': {
            padding: '4px 8px',
        },
        '& th': {
            padding: '8px',
        },
        '& th:nth-of-type(1)': {
            width: '50px',
        },
        '& th:nth-of-type(2)': {
            width: '50%',
            minWidth: '200px',
        },
        '& th:nth-of-type(3)': {
            width: '25%',
            minWidth: '120px',
        },
        '& th:nth-of-type(4)': {
            width: '25%',
            minWidth: '100px',
        },
        tableLayout: 'fixed',
        width: '100%',
    },
}));

/**
 * SubscriptionKeys component displays federated API subscription credentials
 * @param {Object} props Component props
 * @returns {JSX.Element} The subscription keys component
 */
const SubscriptionKeys = ({ application }) => {
    const [federatedSubscriptions, setFederatedSubscriptions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedSubscriptionId, setExpandedSubscriptionId] = useState(null);

    useEffect(() => {
        const fetchSubscriptions = async () => {
            setLoading(true);
            try {
                const client = new Subscription();
                const subscriptionLimit = app.subscriptionLimit || 1000;
                const response = await client.getSubscriptions(null, application.applicationId, subscriptionLimit);
                const allSubscriptions = response.body.list;

                // Filter federated subscriptions (gatewayVendor exists and is not 'wso2')
                const federated = allSubscriptions.filter((sub) => sub.apiInfo
                    && sub.apiInfo.gatewayVendor
                    && sub.apiInfo.gatewayVendor.toLowerCase() !== 'wso2');

                setFederatedSubscriptions(federated);
            } catch (error) {
                console.error('Failed to fetch subscriptions:', error);
                setFederatedSubscriptions([]);
            } finally {
                setLoading(false);
            }
        };

        if (application?.applicationId) {
            fetchSubscriptions();
        }
    }, [application?.applicationId]);

    const handleToggle = (subscriptionId) => {
        setExpandedSubscriptionId(
            expandedSubscriptionId === subscriptionId ? null : subscriptionId,
        );
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
                                defaultMessage='Federated API Subscriptions'
                            />
                        </Typography>
                    </Box>
                    <Typography variant='body2' className={classes.description}>
                        <FormattedMessage
                            id='Applications.Details.SubscriptionKeys.description'
                            defaultMessage='Federated APIs require per-subscription credentials. Unlike standard APIs
                                that use application-level OAuth tokens, each federated API subscription has its own
                                unique credentials that must be managed individually.'
                        />
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            {(!federatedSubscriptions || federatedSubscriptions.length === 0) ? (
                                <Box className={classes.genericMessageWrapper}>
                                    <InlineMessage
                                        type='info'
                                        sx={(theme) => ({
                                            width: '100%',
                                            padding: theme.spacing(2),
                                        })}
                                    >
                                        <Typography variant='h5' component='h3'>
                                            <FormattedMessage
                                                id='Applications.Details.SubscriptionKeys.empty'
                                                defaultMessage='No Federated Subscriptions'
                                            />
                                        </Typography>
                                        <Typography component='p'>
                                            <FormattedMessage
                                                id='Applications.Details.SubscriptionKeys.empty.content'
                                                defaultMessage='This application does not have subscriptions to
                                                    federated APIs. Subscribe to a federated API from the API details
                                                    page to manage its credentials here.'
                                            />
                                        </Typography>
                                    </InlineMessage>
                                </Box>
                            ) : (
                                <Box className={classes.cardContent}>
                                    <Table className={classes.subsTable}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell className={classes.firstCell} />
                                                <TableCell>
                                                    <FormattedMessage
                                                        id='Applications.Details.SubscriptionKeys.column.api'
                                                        defaultMessage='API'
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormattedMessage
                                                        id='Applications.Details.SubscriptionKeys.column.status'
                                                        defaultMessage='Status'
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
                                            {federatedSubscriptions.map((subscription) => (
                                                <SubscriptionKeyRow
                                                    key={subscription.subscriptionId}
                                                    subscription={subscription}
                                                    expanded={expandedSubscriptionId === subscription.subscriptionId}
                                                    onToggle={handleToggle}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            )}
                        </Grid>
                    </Grid>
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
