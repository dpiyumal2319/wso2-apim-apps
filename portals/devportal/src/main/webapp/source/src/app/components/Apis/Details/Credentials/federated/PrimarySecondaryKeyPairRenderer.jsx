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
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { FormattedMessage } from 'react-intl';
import Alert from 'AppComponents/Shared/Alert';

function KeyField({
    label, value, masked, editable, onChange, headerName,
}) {
    const [visible, setVisible] = useState(false);
    const displayValue = visible ? value : '••••••••••••••••••••';

    const handleCopy = () => {
        if (masked && !editable) return;
        navigator.clipboard.writeText(value);
        Alert.info('Copied to clipboard');
    };

    return (
        <TextField
            label={label}
            value={editable ? value : displayValue}
            onChange={editable ? onChange : undefined}
            fullWidth
            margin='normal'
            variant={editable ? 'outlined' : 'filled'}
            InputProps={{
                readOnly: !editable,
                startAdornment: editable && headerName ? (
                    <InputAdornment position='start'>
                        {`${headerName}:`}
                    </InputAdornment>
                ) : null,
                endAdornment: (
                    <InputAdornment position='end'>
                        {!editable && (
                            <IconButton size='small' onClick={() => setVisible(!visible)}>
                                {visible ? <VisibilityOffIcon fontSize='small' /> : <VisibilityIcon fontSize='small' />}
                            </IconButton>
                        )}
                        <IconButton size='small' onClick={handleCopy} disabled={masked && !editable}>
                            <ContentCopyIcon fontSize='small' />
                        </IconButton>
                    </InputAdornment>
                ),
            }}
        />
    );
}

KeyField.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    masked: PropTypes.bool.isRequired,
    editable: PropTypes.bool,
    onChange: PropTypes.func,
    headerName: PropTypes.string,
};

KeyField.defaultProps = {
    editable: false,
    onChange: null,
    headerName: null,
};

export default function PrimarySecondaryKeyPairRenderer({
    body, masked, actionButtons, editable, value, onChange, headerName,
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
                    />
                </>
            ) : (
                // In read-only mode, show both keys
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <KeyField
                            label='Primary Key'
                            value={primaryKey || ''}
                            masked={masked}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <KeyField
                            label='Secondary Key'
                            value={secondaryKey || ''}
                            masked={masked}
                        />
                    </Grid>
                </Grid>
            )}
            {actionButtons && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {actionButtons.retrieve}
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
        retrieve: PropTypes.node,
        regenerate: PropTypes.node,
        delete: PropTypes.node,
    }),
    editable: PropTypes.bool,
    value: PropTypes.string,
    onChange: PropTypes.func,
    headerName: PropTypes.string,
};

PrimarySecondaryKeyPairRenderer.defaultProps = {
    actionButtons: null,
    editable: false,
    value: undefined,
    onChange: null,
    headerName: null,
};
