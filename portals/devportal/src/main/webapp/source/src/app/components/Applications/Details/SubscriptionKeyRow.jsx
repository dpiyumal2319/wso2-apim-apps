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

import React from 'react';
import PropTypes from 'prop-types';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import FederatedCredentialPanel from 'AppComponents/Apis/Details/Credentials/FederatedCredentialPanel';

/**
 * Row component for displaying a single federated subscription with expandable credential panel
 * @param {Object} props Component props
 * @returns {JSX.Element} The subscription key row component
 */
const SubscriptionKeyRow = ({
    subscription,
    expanded,
    onToggle,
}) => {
    const { subscriptionId, apiInfo } = subscription;
    const {
        name: apiName,
        version: apiVersion,
        lifeCycleStatus,
        gatewayVendor,
        id: apiId,
    } = apiInfo;

    return (
        <>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <IconButton
                        aria-label='expand row'
                        size='small'
                        onClick={() => onToggle(subscriptionId)}
                    >
                        {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell>
                    <Link to={`/apis/${apiId}/overview`}>
                        {apiName}
                        -
                        {apiVersion}
                    </Link>
                </TableCell>
                <TableCell>{lifeCycleStatus}</TableCell>
                <TableCell>
                    <Button
                        component={Link}
                        to={`/apis/${apiId}/api-console`}
                        variant='outlined'
                        size='small'
                        startIcon={<PlayArrowIcon />}
                    >
                        <FormattedMessage
                            id='Applications.Details.SubscriptionKeyRow.try.api'
                            defaultMessage='Try API'
                        />
                    </Button>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
                    <Collapse in={expanded} timeout='auto' unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <FederatedCredentialPanel
                                subscriptionId={subscriptionId}
                                apiId={apiId}
                                gatewayType={gatewayVendor}
                            />
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

SubscriptionKeyRow.propTypes = {
    subscription: PropTypes.shape({
        subscriptionId: PropTypes.string.isRequired,
        apiInfo: PropTypes.shape({
            name: PropTypes.string.isRequired,
            version: PropTypes.string.isRequired,
            lifeCycleStatus: PropTypes.string,
            gatewayVendor: PropTypes.string,
            id: PropTypes.string.isRequired,
        }).isRequired,
    }).isRequired,
    expanded: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
};

export default SubscriptionKeyRow;
