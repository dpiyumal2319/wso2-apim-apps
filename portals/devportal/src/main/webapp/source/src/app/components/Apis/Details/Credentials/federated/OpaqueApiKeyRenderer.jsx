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
            variant='outlined'
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

export default function OpaqueApiKeyRenderer({
    body, masked, actionButtons, editable, value, onChange, headerName,
}) {
    let parsed;
    try {
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        return <Typography color='error'>Failed to parse credential data</Typography>;
    }

    // Use external value if provided (editable mode), otherwise use parsed value
    const displayValue = editable && value !== undefined ? value : (parsed.value || '');

    return (
        <Box sx={{ width: '100%' }}>
            {!editable && (
                <Typography variant='subtitle2' gutterBottom>
                    <FormattedMessage
                        id='Apis.Details.Credentials.federated.OpaqueApiKey.title'
                        defaultMessage='API Key'
                    />
                </Typography>
            )}
            <KeyField
                label={editable ? 'Credential' : 'API Key'}
                value={displayValue}
                masked={masked}
                editable={editable}
                onChange={onChange}
                headerName={headerName}
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
    editable: PropTypes.bool,
    value: PropTypes.string,
    onChange: PropTypes.func,
    headerName: PropTypes.string,
};

OpaqueApiKeyRenderer.defaultProps = {
    actionButtons: null,
    editable: false,
    value: undefined,
    onChange: null,
    headerName: null,
};
