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
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { FormattedMessage } from 'react-intl';

function formatQuota(quotaLimit, quotaPeriod) {
    if (!quotaLimit) return null;
    const period = quotaPeriod ? quotaPeriod.toLowerCase() : '';
    return `${quotaLimit.toLocaleString()} requests / ${period}`;
}

function formatRateLimit(rateLimit, burstLimit) {
    if (!rateLimit) return null;
    let text = `${rateLimit} req/s`;
    if (burstLimit) {
        text += ` (burst: ${burstLimit})`;
    }
    return text;
}

export default function TierSelectorRenderer({ body, selectedOption, onSelect }) {
    let parsed;
    try {
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        return (
            <Typography color='error'>
                <FormattedMessage
                    id='Apis.Details.Credentials.federated.TierSelector.parse.error'
                    defaultMessage='Failed to parse subscription options'
                />
            </Typography>
        );
    }

    const options = parsed.options || [];

    if (options.length === 0) {
        return null;
    }

    const selectedId = selectedOption ? (() => {
        try {
            const sel = typeof selectedOption === 'string' ? JSON.parse(selectedOption) : selectedOption;
            return sel.id;
        } catch {
            return null;
        }
    })() : null;

    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant='subtitle2' gutterBottom>
                <FormattedMessage
                    id='Apis.Details.Credentials.federated.TierSelector.title'
                    defaultMessage='Select a Subscription Plan'
                />
            </Typography>
            <Box
                sx={{
                    display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1,
                }}
            >
                {options.map((option) => {
                    const isSelected = selectedId === option.id;
                    return (
                        <Card
                            key={option.id}
                            variant='outlined'
                            sx={{
                                minWidth: 200,
                                maxWidth: 300,
                                flex: '1 1 200px',
                                border: isSelected ? '2px solid' : '1px solid',
                                borderColor: isSelected ? 'primary.main' : 'divider',
                                position: 'relative',
                            }}
                        >
                            <CardActionArea onClick={() => onSelect(JSON.stringify(option))}>
                                <CardContent>
                                    {isSelected && (
                                        <CheckCircleIcon
                                            color='primary'
                                            sx={{ position: 'absolute', top: 8, right: 8 }}
                                            fontSize='small'
                                        />
                                    )}
                                    <Typography variant='subtitle1' gutterBottom>
                                        {option.name}
                                    </Typography>
                                    {option.description && (
                                        <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                                            {option.description}
                                        </Typography>
                                    )}
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {option.rateLimit && (
                                            <Chip
                                                label={formatRateLimit(option.rateLimit, option.burstLimit)}
                                                size='small'
                                                variant='outlined'
                                            />
                                        )}
                                        {option.quotaLimit && (
                                            <Chip
                                                label={formatQuota(option.quotaLimit, option.quotaPeriod)}
                                                size='small'
                                                variant='outlined'
                                            />
                                        )}
                                    </Box>
                                </CardContent>
                            </CardActionArea>
                        </Card>
                    );
                })}
            </Box>
        </Box>
    );
}

TierSelectorRenderer.propTypes = {
    body: PropTypes.string.isRequired,
    selectedOption: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
};

TierSelectorRenderer.defaultProps = {
    selectedOption: null,
};
