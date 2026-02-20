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
import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { FormattedMessage } from 'react-intl';

function formatLimitLabel(key, value) {
    const label = key.replace(/([A-Z])/g, ' $1').trim();
    return `${label}: ${value}`;
}

/**
 * Publisher-side editor for subscription plans.
 * Renders plans as cards with enable/disable checkboxes.
 */
export default function SubscriptionPlansEditor({ body, onChange, disabled }) {
    let parsed;
    try {
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        return (
            <Typography color='error'>
                <FormattedMessage
                    id='Apis.Details.FederationConfig.editors.SubscriptionPlansEditor.parseError'
                    defaultMessage='Failed to parse subscription options'
                />
            </Typography>
        );
    }

    const plans = parsed?.plans || [];
    const optionName = parsed?.optionName || 'Plan';

    if (plans.length === 0) {
        return (
            <Typography variant='body2' color='textSecondary'>
                <FormattedMessage
                    id='Apis.Details.FederationConfig.editors.SubscriptionPlansEditor.noPlans'
                    defaultMessage='No subscription plans available from the gateway.'
                />
            </Typography>
        );
    }

    return (
        <Box>
            <Typography variant='body2' color='textSecondary' gutterBottom>
                <FormattedMessage
                    id='Apis.Details.FederationConfig.editors.SubscriptionPlansEditor.help'
                    defaultMessage='Toggle which {optionName}s are available to developers.'
                    values={{ optionName: optionName.toLowerCase() }}
                />
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                {plans.map((plan) => {
                    const isEnabled = plan.enabled !== false;
                    return (
                        <Card
                            key={plan.id}
                            variant='outlined'
                            sx={{
                                minWidth: 220,
                                maxWidth: 320,
                                flex: '1 1 220px',
                                opacity: isEnabled ? 1 : 0.6,
                                border: '1px solid',
                                borderColor: isEnabled ? 'primary.light' : 'divider',
                            }}
                        >
                            <CardContent sx={{ pb: '12px !important' }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={isEnabled}
                                            onChange={() => onChange(plan.id, !isEnabled)}
                                            disabled={disabled}
                                            size='small'
                                        />
                                    }
                                    label={
                                        <Typography variant='subtitle2'>
                                            {plan.name || plan.id}
                                        </Typography>
                                    }
                                    sx={{ mb: 0 }}
                                />
                                {plan.description && (
                                    <Typography
                                        variant='body2'
                                        color='text.secondary'
                                        sx={{ ml: 4, mb: 1 }}
                                    >
                                        {plan.description}
                                    </Typography>
                                )}
                                {plan.limits && Object.keys(plan.limits).length > 0 && (
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ml: 4 }}>
                                        {Object.entries(plan.limits).map(([key, value]) => (
                                            <Chip
                                                key={key}
                                                label={formatLimitLabel(key, value)}
                                                size='small'
                                                variant='outlined'
                                            />
                                        ))}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </Box>
        </Box>
    );
}

SubscriptionPlansEditor.propTypes = {
    body: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
};

SubscriptionPlansEditor.defaultProps = {
    disabled: false,
};
