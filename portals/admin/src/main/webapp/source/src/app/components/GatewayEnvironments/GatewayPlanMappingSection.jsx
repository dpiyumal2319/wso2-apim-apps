/*
 * Copyright (c) 2021, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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

import React from 'react';
import PropTypes from 'prop-types';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FormattedMessage } from 'react-intl';

const NO_MAPPING_MESSAGE_ID = 'GatewayEnvironments.PlanMapping.noMapping';

export default function GatewayPlanMappingSection(props) {
    const {
        getLocalApiTypeLabel,
        getMappedPlanId,
        groupedLocalTiers,
        isPlanMappingSupported,
        isReadOnly,
        localTiersLength,
        onTierMappingChange,
        planMappingIdentifierLabel,
    } = props;

    if (!isPlanMappingSupported) {
        return null;
    }

    const renderTierMappingRow = (tier) => {
        const mappedPlanId = getMappedPlanId(tier.name);

        return (
            <TableRow key={tier.name}>
                <TableCell>
                    <Typography variant='body2'>
                        {tier.displayName}
                    </Typography>
                </TableCell>
                <TableCell>
                    <TextField
                        fullWidth
                        size='small'
                        disabled={isReadOnly}
                        value={mappedPlanId}
                        onChange={(e) => {
                            const value = e.target.value;
                            onTierMappingChange(tier.name, value || null);
                        }}
                        placeholder={planMappingIdentifierLabel}
                        helperText={(
                            <FormattedMessage
                                id={NO_MAPPING_MESSAGE_ID}
                                defaultMessage='No mapping'
                            />
                        )}
                    />
                </TableCell>
            </TableRow>
        );
    };

    return (
        <>
            <Grid item xs={12}>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls='gateway-plan-mapping-content'
                        id='gateway-plan-mapping-header'
                    >
                        <Typography>
                            <FormattedMessage
                                id='GatewayEnvironments.AddEditVhost.host.gateway.advanced.settings'
                                defaultMessage='Advanced Settings'
                            />
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={0}>
                            <Grid item xs={12} md={12} lg={3}>
                                <Box
                                    display='flex'
                                    flexDirection='row'
                                    alignItems='center'
                                >
                                    <Box flex='1'>
                                        <Typography
                                            color='inherit'
                                            variant='subtitle2'
                                            component='div'
                                        >
                                            <FormattedMessage
                                                id='GatewayEnvironments.PlanMapping.title'
                                                defaultMessage='Plan Mapping'
                                            />
                                        </Typography>
                                        <Typography
                                            color='inherit'
                                            variant='caption'
                                            component='p'
                                        >
                                            <FormattedMessage
                                                id='GatewayEnvironments.PlanMapping.description'
                                                defaultMessage={'Map local WSO2 subscription'
                                                    + 'tiers to remote gateway plans.'}
                                            />
                                        </Typography>
                                        <Typography
                                            color='inherit'
                                            variant='caption'
                                            component='p'
                                        >
                                            <FormattedMessage
                                                id='GatewayEnvironments.PlanMapping.subscribableOnly.description'
                                                defaultMessage={
                                                    'Only plans applicable to supported'
                                                    + ' api types are showing'
                                                }
                                            />
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={12} lg={9}>
                                <Box component='div' m={1}>
                                    {groupedLocalTiers.length > 0 && (
                                        <Table size='small'>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>
                                                        <FormattedMessage
                                                            id='GatewayEnvironments.PlanMapping.localTier'
                                                            defaultMessage='Local Tier'
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {planMappingIdentifierLabel}
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {groupedLocalTiers.map((group) => (
                                                    <React.Fragment key={group.apiType}>
                                                        <TableRow>
                                                            <TableCell colSpan={2}>
                                                                <Typography variant='subtitle2'>
                                                                    {getLocalApiTypeLabel(group.apiType)}
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                        {group.tiers.map(renderTierMappingRow)}
                                                    </React.Fragment>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                    {localTiersLength > 0 && groupedLocalTiers.length === 0 && (
                                        <Typography variant='caption'>
                                            <FormattedMessage
                                                id='GatewayEnvironments.PlanMapping.noCompatibleLocalPlans'
                                                defaultMessage={
                                                    'No local subscription plans match the'
                                                    + ' supported API types of this gateway.'
                                                }
                                            />
                                        </Typography>
                                    )}
                                </Box>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            </Grid>
        </>
    );
}

GatewayPlanMappingSection.propTypes = {
    getLocalApiTypeLabel: PropTypes.func.isRequired,
    getMappedPlanId: PropTypes.func.isRequired,
    groupedLocalTiers: PropTypes.arrayOf(PropTypes.shape({
        apiType: PropTypes.string.isRequired,
        tiers: PropTypes.arrayOf(PropTypes.shape({
            apiType: PropTypes.string,
            displayName: PropTypes.string,
            name: PropTypes.string,
        })).isRequired,
    })).isRequired,
    isPlanMappingSupported: PropTypes.bool.isRequired,
    isReadOnly: PropTypes.bool.isRequired,
    localTiersLength: PropTypes.number.isRequired,
    onTierMappingChange: PropTypes.func.isRequired,
    planMappingIdentifierLabel: PropTypes.string,
};

GatewayPlanMappingSection.defaultProps = {
    planMappingIdentifierLabel: 'Remote Plan Identifier',
};
