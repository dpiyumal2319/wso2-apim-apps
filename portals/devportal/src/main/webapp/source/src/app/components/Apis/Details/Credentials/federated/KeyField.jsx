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
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Alert from 'AppComponents/Shared/Alert';

/**
 * Shared credential key display component.
 *
 * State machine (applies to both read-only and editable modes):
 * - masked=true, onRetrieve provided, !retrieving → VisibilityIcon w/ "Fetch key" tooltip → triggers onRetrieve
 * - masked=true, retrieving=true                  → CircularProgress spinner
 * - masked=true, !onRetrieve                      → no eye icon
 * - masked=false, visible=false                   → VisibilityIcon w/ "Show key" tooltip → local toggle
 * - masked=false, visible=true                    → VisibilityOffIcon w/ "Hide key" tooltip → local toggle
 *
 * Editable mode: same state machine; the only difference is the field becomes editable in State B
 * (masked=false, visible=true). In State C (masked=false, visible=false) the field uses type=password
 * so the browser masks the value while it remains editable. Copy is hidden until retrieved (State A).
 *
 * After retrieval: masked flips false → useEffect auto-sets visible=true (one click to reveal).
 */
function KeyField({
    label, value, masked, editable, onChange, headerName, onRetrieve, retrieving,
}) {
    // Start visible when not masked (editable fields always start visible)
    const [visible, setVisible] = useState(!masked);

    // Auto-reveal immediately when masked transitions from true to false (retrieval complete)
    useEffect(() => {
        if (!masked) {
            setVisible(true);
        }
    }, [masked]);

    const displayValue = visible ? value : '***************';
    // When masked, show the backend-provided masked value directly (no local masking needed)
    const fieldValue = masked ? value : displayValue;

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        Alert.info('Copied to clipboard');
    };

    const renderEyeIcon = () => {
        if (masked) {
            if (retrieving) {
                return <CircularProgress size={16} sx={{ mx: 0.5 }} />;
            }
            if (onRetrieve) {
                return (
                    <Tooltip title='Fetch key from gateway'>
                        <IconButton size='small' onClick={onRetrieve}>
                            <VisibilityIcon fontSize='small' />
                        </IconButton>
                    </Tooltip>
                );
            }
            return null;
        }

        // masked=false (including editable): local show/hide toggle
        return (
            <Tooltip title={visible ? 'Hide key' : 'Show key'}>
                <IconButton size='small' onClick={() => setVisible(!visible)}>
                    {visible
                        ? <VisibilityOffIcon fontSize='small' />
                        : <VisibilityIcon fontSize='small' />}
                </IconButton>
            </Tooltip>
        );
    };

    return (
        <TextField
            label={label}
            // State A/Loading (masked=true): always text — show the backend-masked placeholder as-is.
            // State B (masked=false, visible=true): text — real value shown and editable.
            // State C (masked=false, visible=false): password — browser masks real value; still editable.
            type={editable && !masked && !visible ? 'password' : 'text'}
            value={editable ? value : fieldValue}
            // Only allow editing in State B (retrieved + revealed). In State A the value hasn't been
            // fetched yet; in State C the field is visually hidden but still editable via password type.
            onChange={editable && !masked ? onChange : undefined}
            fullWidth
            margin='normal'
            variant={editable ? 'outlined' : 'filled'}
            InputProps={{
                // Editable only after retrieval (masked=false), matching read-only state machine.
                readOnly: !editable || masked,
                startAdornment: editable && headerName ? (
                    <InputAdornment position='start'>
                        {`${headerName}:`}
                    </InputAdornment>
                ) : null,
                endAdornment: (
                    <InputAdornment position='end'>
                        {renderEyeIcon()}
                        {!masked && (
                            <IconButton size='small' onClick={handleCopy}>
                                <ContentCopyIcon fontSize='small' />
                            </IconButton>
                        )}
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
    onRetrieve: PropTypes.func,
    retrieving: PropTypes.bool,
};

KeyField.defaultProps = {
    editable: false,
    onChange: null,
    headerName: null,
    onRetrieve: null,
    retrieving: false,
};

export default KeyField;
