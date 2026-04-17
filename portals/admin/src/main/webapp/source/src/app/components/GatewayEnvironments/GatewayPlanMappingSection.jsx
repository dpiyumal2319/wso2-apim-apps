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
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
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
        loadingRemotePlans,
        localTiersLength,
        onReloadRemotePlans,
        onTierMappingChange,
        remotePlans,
        remotePlansFetchError,
        tierMappings,
    } = props;

    if (!isPlanMappingSupported) {
        return null;
    }

    const renderTierMappingRow = (tier) => {
        const mappedPlanId = getMappedPlanId(tier.name);
        const mappedPlanName = tierMappings.find(
            (mapping) => mapping.localTierName === tier.name,
        )?.remotePlanReference?.name || mappedPlanId;
        const isMappedPlanMissing = mappedPlanId
            && !remotePlans.some((plan) => plan.id === mappedPlanId);

        return (
            <TableRow key={tier.name}>
                <TableCell>
                    <Typography variant='body2'>
                        {tier.displayName}
                    </Typography>
                </TableCell>
                <TableCell>
                    <FormControl
                        fullWidth
                        size='small'
                        disabled={isReadOnly}
                    >
                        <Select
                            value={mappedPlanId}
                            displayEmpty
                            onChange={(e) => {
                                const selectedPlanId = e.target.value;
                                const plan = remotePlans.find(
                                    (item) => item.id === selectedPlanId,
                                );
                                onTierMappingChange(tier.name, plan || null);
                            }}
                        >
                            <MenuItem value=''>
                                <em>
                                    <FormattedMessage
                                        id={NO_MAPPING_MESSAGE_ID}
                                        defaultMessage='No mapping'
                                    />
                                </em>
                            </MenuItem>
                            {remotePlans.map((plan) => (
                                <MenuItem
                                    key={plan.id}
                                    value={plan.id}
                                >
                                    {plan.name}
                                </MenuItem>
                            ))}
                            {isMappedPlanMissing && (
                                <MenuItem
                                    key={mappedPlanId}
                                    value={mappedPlanId}
                                >
                                    {mappedPlanName}
                                </MenuItem>
                            )}
                        </Select>
                    </FormControl>
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
                                    <Box display='flex' alignItems='center' mb={2}>
                                        <Button
                                            variant='outlined'
                                            size='small'
                                            onClick={onReloadRemotePlans}
                                            disabled={loadingRemotePlans}
                                            sx={{ mr: 1 }}
                                        >
                                            <FormattedMessage
                                                id='GatewayEnvironments.PlanMapping.reload'
                                                defaultMessage='Reload'
                                            />
                                        </Button>
                                        {loadingRemotePlans && (
                                            <CircularProgress size={14} sx={{ mr: 0.75 }} />
                                        )}
                                        {remotePlansFetchError && (
                                            <Typography variant='caption' color='error' sx={{ mr: 1 }}>
                                                {remotePlansFetchError}
                                            </Typography>
                                        )}
                                        {remotePlans.length > 0 && (
                                            <Typography variant='caption'>
                                                <FormattedMessage
                                                    id='GatewayEnvironments.PlanMapping.plansLoaded'
                                                    defaultMessage='{count} remote plans loaded'
                                                    values={{ count: remotePlans.length }}
                                                />
                                            </Typography>
                                        )}
                                    </Box>
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
                                                        <FormattedMessage
                                                            id='GatewayEnvironments.PlanMapping.remotePlan'
                                                            defaultMessage='Remote Plan'
                                                        />
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
    loadingRemotePlans: PropTypes.bool.isRequired,
    localTiersLength: PropTypes.number.isRequired,
    onReloadRemotePlans: PropTypes.func.isRequired,
    onTierMappingChange: PropTypes.func.isRequired,
    remotePlans: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
    })).isRequired,
    remotePlansFetchError: PropTypes.string.isRequired,
    tierMappings: PropTypes.arrayOf(PropTypes.shape({
        localTierName: PropTypes.string,
        remotePlanReference: PropTypes.shape({
            id: PropTypes.string,
            name: PropTypes.string,
        }),
    })).isRequired,
};
