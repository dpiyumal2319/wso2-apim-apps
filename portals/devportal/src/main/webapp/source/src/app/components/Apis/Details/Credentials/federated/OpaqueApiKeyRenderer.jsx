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
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { FormattedMessage } from 'react-intl';
import Alert from 'AppComponents/Shared/Alert';

function KeyField({ label, value, masked }) {
    const [visible, setVisible] = useState(false);
    const displayValue = visible ? value : '••••••••••••••••••••';

    const handleCopy = () => {
        if (masked) return;
        navigator.clipboard.writeText(value);
        Alert.info('Copied to clipboard');
    };

    return (
        <TextField
            label={label}
            value={displayValue}
            fullWidth
            margin='normal'
            variant='outlined'
            InputProps={{
                readOnly: true,
                endAdornment: (
                    <InputAdornment position='end'>
                        <IconButton size='small' onClick={() => setVisible(!visible)}>
                            {visible ? <VisibilityOffIcon fontSize='small' /> : <VisibilityIcon fontSize='small' />}
                        </IconButton>
                        <IconButton size='small' onClick={handleCopy} disabled={masked}>
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
};

export default function OpaqueApiKeyRenderer({ body, masked, actionButtons }) {
    let parsed;
    try {
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        return <Typography color='error'>Failed to parse credential data</Typography>;
    }

    const { value } = parsed;

    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant='subtitle2' gutterBottom>
                <FormattedMessage
                    id='Apis.Details.Credentials.federated.OpaqueApiKey.title'
                    defaultMessage='API Key'
                />
            </Typography>
            <KeyField
                label='API Key'
                value={value || ''}
                masked={masked}
            />
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

OpaqueApiKeyRenderer.propTypes = {
    body: PropTypes.string.isRequired,
    masked: PropTypes.bool.isRequired,
    actionButtons: PropTypes.shape({
        retrieve: PropTypes.node,
        regenerate: PropTypes.node,
        delete: PropTypes.node,
    }),
};

OpaqueApiKeyRenderer.defaultProps = {
    actionButtons: null,
};
