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
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { FormattedMessage } from 'react-intl';
import KeyField from './KeyField';

export default function PrimarySecondaryKeyPairRenderer({
    body, masked, actionButtons, editable, value, onChange, headerName, onRetrieve, retrieving,
}) {
    const [selectedKey, setSelectedKey] = useState('primary');
    let parsed;
    try {
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        return <Typography color='error'>Failed to parse credential data</Typography>;
    }

    const { primaryKey, secondaryKey } = parsed;

    // In editable mode with external value, use it; otherwise use the selected key from parsed data
    const getDisplayValue = () => {
        if (editable && value !== undefined) {
            return value;
        }
        return selectedKey === 'primary' ? (primaryKey || '') : (secondaryKey || '');
    };

    const handleKeyToggle = (event, newKey) => {
        if (newKey !== null) {
            setSelectedKey(newKey);
            // Update the parent component with the newly selected key value
            if (onChange && editable) {
                const keyValue = newKey === 'primary' ? primaryKey : secondaryKey;
                // Create a synthetic event to maintain consistency with TextField onChange
                onChange({ target: { value: keyValue || '' } });
            }
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            {!editable && (
                <Typography variant='subtitle2' gutterBottom>
                    <FormattedMessage
                        id='Apis.Details.Credentials.federated.PrimarySecondaryKeyPair.title'
                        defaultMessage='API Keys'
                    />
                </Typography>
            )}
            {editable ? (
                // In editable mode, show toggle and single editable field
                <>
                    <Box sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1,
                    }}
                    >
                        <Typography variant='body2' color='textSecondary'>
                            Select Key:
                        </Typography>
                        <ToggleButtonGroup
                            value={selectedKey}
                            exclusive
                            onChange={handleKeyToggle}
                            size='small'
                            aria-label='key selection'
                        >
                            <ToggleButton value='primary' aria-label='primary key'>
                                Primary
                            </ToggleButton>
                            <ToggleButton value='secondary' aria-label='secondary key'>
                                Secondary
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    <KeyField
                        label={`Credential (${selectedKey === 'primary' ? 'Primary' : 'Secondary'} Key)`}
                        value={getDisplayValue()}
                        masked={masked}
                        editable
                        onChange={onChange}
                        headerName={headerName}
                        onRetrieve={onRetrieve}
                        retrieving={retrieving}
                    />
                </>
            ) : (
                // In read-only mode, show both keys.
                // Both share the same onRetrieve/retrieving since retrieval fetches both keys together.
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <KeyField
                            label='Primary Key'
                            value={primaryKey || ''}
                            masked={masked}
                            onRetrieve={onRetrieve}
                            retrieving={retrieving}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <KeyField
                            label='Secondary Key'
                            value={secondaryKey || ''}
                            masked={masked}
                            onRetrieve={onRetrieve}
                            retrieving={retrieving}
                        />
                    </Grid>
                </Grid>
            )}
            {actionButtons && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {actionButtons.regenerate}
                    {actionButtons.delete}
                </Box>
            )}
        </Box>
    );
}

PrimarySecondaryKeyPairRenderer.propTypes = {
    body: PropTypes.string.isRequired,
    masked: PropTypes.bool.isRequired,
    actionButtons: PropTypes.shape({
        regenerate: PropTypes.node,
        delete: PropTypes.node,
    }),
    editable: PropTypes.bool,
    value: PropTypes.string,
    onChange: PropTypes.func,
    headerName: PropTypes.string,
    onRetrieve: PropTypes.func,
    retrieving: PropTypes.bool,
};

PrimarySecondaryKeyPairRenderer.defaultProps = {
    actionButtons: null,
    editable: false,
    value: undefined,
    onChange: null,
    headerName: null,
    onRetrieve: null,
    retrieving: false,
};
