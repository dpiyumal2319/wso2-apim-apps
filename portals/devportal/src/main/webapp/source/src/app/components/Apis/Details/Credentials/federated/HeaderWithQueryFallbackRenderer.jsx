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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import { FormattedMessage } from 'react-intl';
import Alert from 'AppComponents/Shared/Alert';

export default function HeaderWithQueryFallbackRenderer({ body }) {
    const [invocationMethod, setInvocationMethod] = useState('header');

    let parsed;
    try {
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        return <Typography color='error'>Failed to parse invocation instructions</Typography>;
    }

    const {
        headerName,
        queryParamName,
        baseUrl,
        basePath,
        curlExampleHeader,
        curlExampleQuery,
        notes,
    } = parsed;

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        Alert.info('Copied to clipboard');
    };

    return (
        <Box sx={{ mt: 1, width: '100%' }}>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>
                <FormattedMessage
                    id='Apis.Details.Credentials.federated.HeaderWithQueryFallback.title'
                    defaultMessage='Invocation Instructions'
                />
            </Typography>

            {notes && (
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    {notes}
                </Typography>
            )}

            <FormControl component='fieldset' sx={{ mb: 2 }}>
                <Typography variant='body2' sx={{ mb: 1, fontWeight: 500 }}>
                    <FormattedMessage
                        id='Apis.Details.Credentials.federated.HeaderWithQueryFallback.method'
                        defaultMessage='Invocation Method'
                    />
                </Typography>
                <RadioGroup
                    row
                    value={invocationMethod}
                    onChange={(e) => setInvocationMethod(e.target.value)}
                >
                    {headerName && (
                        <FormControlLabel
                            value='header'
                            control={<Radio />}
                            label={(
                                <FormattedMessage
                                    id='Apis.Details.Credentials.federated.HeaderWithQueryFallback.header.method'
                                    defaultMessage='Header ({headerName})'
                                    values={{ headerName }}
                                />
                            )}
                        />
                    )}
                    {queryParamName && (
                        <FormControlLabel
                            value='query'
                            control={<Radio />}
                            label={(
                                <FormattedMessage
                                    id='Apis.Details.Credentials.federated.HeaderWithQueryFallback.query.method'
                                    defaultMessage='Query Parameter ({queryParamName})'
                                    values={{ queryParamName }}
                                />
                            )}
                        />
                    )}
                </RadioGroup>
            </FormControl>

            {baseUrl && (
                <Typography variant='body2' sx={{ mb: 1.5 }}>
                    <strong>
                        <FormattedMessage
                            id='Apis.Details.Credentials.federated.HeaderWithQueryFallback.baseUrl'
                            defaultMessage='Base URL:'
                        />
                    </strong>
                    {' '}
                    <code>
                        {baseUrl}
                        {basePath || ''}
                    </code>
                </Typography>
            )}

            {invocationMethod === 'header' && headerName && (
                <Typography variant='body2' sx={{ mb: 1.5 }}>
                    <strong>
                        <FormattedMessage
                            id='Apis.Details.Credentials.federated.HeaderWithQueryFallback.header.name'
                            defaultMessage='Header Name:'
                        />
                    </strong>
                    {' '}
                    <code>{headerName}</code>
                </Typography>
            )}

            {invocationMethod === 'query' && queryParamName && (
                <Typography variant='body2' sx={{ mb: 1.5 }}>
                    <strong>
                        <FormattedMessage
                            id='Apis.Details.Credentials.federated.HeaderWithQueryFallback.query.name'
                            defaultMessage='Query Parameter Name:'
                        />
                    </strong>
                    {' '}
                    <code>{queryParamName}</code>
                </Typography>
            )}

            <Typography variant='body2' sx={{ mb: 1, fontWeight: 500 }}>
                <FormattedMessage
                    id='Apis.Details.Credentials.federated.HeaderWithQueryFallback.curl.example'
                    defaultMessage='cURL Example'
                />
            </Typography>
            <Box
                sx={{
                    p: 1.5,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    position: 'relative',
                    overflowX: 'auto',
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                }}
            >
                <IconButton
                    size='small'
                    onClick={() => handleCopy(invocationMethod === 'header' ? curlExampleHeader : curlExampleQuery)}
                    sx={{ position: 'absolute', top: 4, right: 4 }}
                >
                    <ContentCopyIcon fontSize='small' />
                </IconButton>
                {invocationMethod === 'header' ? curlExampleHeader : curlExampleQuery}
            </Box>
        </Box>
    );
}

HeaderWithQueryFallbackRenderer.propTypes = {
    body: PropTypes.string.isRequired,
};
