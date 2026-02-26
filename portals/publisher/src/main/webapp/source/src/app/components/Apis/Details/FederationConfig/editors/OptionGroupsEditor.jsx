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
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import { FormattedMessage } from 'react-intl';

/**
 * Publisher-side editor for the "option-groups" subscription options schema.
 *
 * Renders each group as a section with:
 *   - Group name + "Required" toggle switch (publisher curation)
 *   - Items as cards with enable/disable checkboxes (publisher curation)
 *
 * onChange signature: (type, groupId, data)
 *   - type='required': data = { required: boolean }
 *   - type='item':     data = { itemId: string, enabled: boolean }
 */
export default function OptionGroupsEditor({ body, onChange, disabled }) {
    let parsed;
    try {
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        return (
            <Typography color='error'>
                <FormattedMessage
                    id='Apis.Details.FederationConfig.editors.OptionGroupsEditor.parseError'
                    defaultMessage='Failed to parse subscription options'
                />
            </Typography>
        );
    }

    const groups = parsed?.groups || [];

    if (groups.length === 0) {
        return (
            <Typography variant='body2' color='textSecondary'>
                <FormattedMessage
                    id='Apis.Details.FederationConfig.editors.OptionGroupsEditor.noGroups'
                    defaultMessage='No subscription option groups available from the gateway.'
                />
            </Typography>
        );
    }

    return (
        <Box>
            <Typography variant='body2' color='textSecondary' gutterBottom>
                <FormattedMessage
                    id='Apis.Details.FederationConfig.editors.OptionGroupsEditor.help'
                    defaultMessage={
                        'Toggle which option groups are required and which items are ' +
                        'available to developers.'
                    }
                />
            </Typography>

            {groups.map((group, index) => {
                const isRequired = group.required !== false;
                return (
                    <Box key={group.groupId} sx={{ mt: 2 }}>
                        {index > 0 && <Divider sx={{ mb: 2 }} />}

                        {/* Group header with Required toggle */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                        }}
                        >
                            <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                                {group.groupName}
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={isRequired}
                                        onChange={(e) => onChange('required', group.groupId, {
                                            required: e.target.checked,
                                        })}
                                        disabled={disabled}
                                        size='small'
                                        color='primary'
                                    />
                                }
                                label={
                                    <Typography variant='body2' color='textSecondary'>
                                        <FormattedMessage
                                            id='Apis.Details.FederationConfig.editors.OptionGroupsEditor.requiredLabel'
                                            defaultMessage='Required'
                                        />
                                    </Typography>
                                }
                                labelPlacement='start'
                            />
                        </Box>

                        {/* Items */}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {group.items.map((item) => {
                                const isEnabled = item.enabled !== false;
                                return (
                                    <Card
                                        key={item.id}
                                        variant='outlined'
                                        sx={{
                                            minWidth: 200,
                                            maxWidth: 300,
                                            flex: '1 1 200px',
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
                                                        onChange={() => onChange('item', group.groupId, {
                                                            itemId: item.id,
                                                            enabled: !isEnabled,
                                                        })}
                                                        disabled={disabled}
                                                        size='small'
                                                    />
                                                }
                                                label={
                                                    <Typography variant='subtitle2'>
                                                        {item.name || item.id}
                                                    </Typography>
                                                }
                                                sx={{ mb: 0 }}
                                            />
                                            {item.description && (
                                                <Typography
                                                    variant='body2'
                                                    color='text.secondary'
                                                    sx={{ ml: 4, mb: 1 }}
                                                >
                                                    {item.description}
                                                </Typography>
                                            )}
                                            {item.properties
                                                && Object.keys(item.properties).length > 0 && (
                                                <Box sx={{
                                                    display: 'flex', gap: 0.5, flexWrap: 'wrap', ml: 4,
                                                }}
                                                >
                                                    {Object.entries(item.properties).map(([key, value]) => (
                                                        <Chip
                                                            key={key}
                                                            label={`${key.replace(/([A-Z])/g, ' $1').trim()}: ${value}`}
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
            })}
        </Box>
    );
}

OptionGroupsEditor.propTypes = {
    body: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
};

OptionGroupsEditor.defaultProps = {
    disabled: false,
};
