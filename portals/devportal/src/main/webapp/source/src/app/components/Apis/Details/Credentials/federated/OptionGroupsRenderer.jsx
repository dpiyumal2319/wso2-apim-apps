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
import Divider from '@mui/material/Divider';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { FormattedMessage } from 'react-intl';

/**
 * DevPortal renderer for the "option-groups" subscription options schema.
 *
 * Renders each group as a labeled section with selectable item cards.
 * Required groups are marked with "(Required)"; optional groups with "(Optional)".
 *
 * selectedOption format: JSON map of groupId → selected item object
 * e.g. '{"acl-groups": {"id": "premium", "name": "Premium"}, "consumer-groups": {...}}'
 *
 * onSelect emits the full selections map as a JSON string on every item click.
 */
export default function OptionGroupsRenderer({ body, selectedOption, onSelect }) {
    let parsed;
    try {
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        return (
            <Typography color='error'>
                <FormattedMessage
                    id='Apis.Details.Credentials.federated.OptionGroupsRenderer.parseError'
                    defaultMessage='Failed to parse subscription options'
                />
            </Typography>
        );
    }

    const groups = parsed?.groups || [];

    if (groups.length === 0) {
        return null;
    }

    let currentSelections;
    try {
        if (selectedOption) {
            if (typeof selectedOption === 'string') {
                currentSelections = JSON.parse(selectedOption);
            } else {
                currentSelections = selectedOption;
            }
        } else {
            currentSelections = {};
        }
    } catch {
        currentSelections = {};
    }

    const handleItemClick = (groupId, item) => {
        const updated = { ...currentSelections, [groupId]: item };
        onSelect(JSON.stringify(updated));
    };

    return (
        <Box sx={{ mb: 2 }}>
            {groups.map((group, index) => {
                const selectedItem = currentSelections[group.groupId];
                const selectedId = selectedItem?.id;

                // prepare chip details to keep JSX clean
                const labelComponent = group.required ? (
                    <FormattedMessage
                        id='Apis.Details.Credentials.federated.OptionGroupsRenderer.required'
                        defaultMessage='Required'
                    />
                ) : (
                    <FormattedMessage
                        id='Apis.Details.Credentials.federated.OptionGroupsRenderer.optional'
                        defaultMessage='Optional'
                    />
                );
                const chipColor = group.required ? 'primary' : 'default';

                return (
                    <Box key={group.groupId} sx={{ mb: index < groups.length - 1 ? 3 : 0 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 1,
                            }}
                        >
                            <Typography variant='subtitle2'>
                                {group.groupName}
                            </Typography>
                            <Chip
                                label={labelComponent}
                                size='small'
                                color={chipColor}
                                variant='outlined'
                            />
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 2,
                                flexWrap: 'wrap',
                            }}
                        >
                            {group.items.map((item) => {
                                const isSelected = selectedId === item.id;
                                return (
                                    <Card
                                        key={item.id}
                                        variant='outlined'
                                        sx={{
                                            minWidth: 180,
                                            maxWidth: 280,
                                            flex: '1 1 180px',
                                            border: isSelected ? '2px solid' : '1px solid',
                                            borderColor: isSelected ? 'primary.main' : 'divider',
                                            position: 'relative',
                                        }}
                                    >
                                        <CardActionArea onClick={() => handleItemClick(group.groupId, item)}>
                                            <CardContent>
                                                {isSelected && (
                                                    <CheckCircleIcon
                                                        color='primary'
                                                        sx={{ position: 'absolute', top: 8, right: 8 }}
                                                        fontSize='small'
                                                    />
                                                )}
                                                <Typography variant='subtitle1' gutterBottom>
                                                    {item.name}
                                                </Typography>
                                                {item.description && (
                                                    <Typography
                                                        variant='body2'
                                                        color='text.secondary'
                                                        sx={{ mb: 1 }}
                                                    >
                                                        {item.description}
                                                    </Typography>
                                                )}
                                                {item.properties
                                                    && Object.keys(item.properties).length > 0 && (
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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
                                        </CardActionArea>
                                    </Card>
                                );
                            })}
                        </Box>
                        {index < groups.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                );
            })}
        </Box>
    );
}

OptionGroupsRenderer.propTypes = {
    body: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    selectedOption: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
};

OptionGroupsRenderer.defaultProps = {
    selectedOption: null,
};
