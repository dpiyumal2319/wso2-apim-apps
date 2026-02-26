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
import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { FormattedMessage } from 'react-intl';
import KeyField from './KeyField';

export default function OpaqueApiKeyRenderer({
    body, masked, actionButtons, editable, value, onChange, headerName, onRetrieve, retrieving,
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
                onRetrieve={onRetrieve}
                retrieving={retrieving}
            />
            {actionButtons && (
                <Box sx={{ display: 'flex', gap: 1 }}>
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

OpaqueApiKeyRenderer.defaultProps = {
    actionButtons: null,
    editable: false,
    value: undefined,
    onChange: null,
    headerName: null,
    onRetrieve: null,
    retrieving: false,
};
