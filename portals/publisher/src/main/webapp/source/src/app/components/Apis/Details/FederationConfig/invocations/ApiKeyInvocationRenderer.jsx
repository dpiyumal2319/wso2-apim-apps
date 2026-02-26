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
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import { FormattedMessage } from 'react-intl';
import AppAlert from 'AppComponents/Shared/Alert';

export default function ApiKeyInvocationRenderer({ body }) {
    let parsed;
    try {
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        return <Typography color='error'>Failed to parse invocation instructions</Typography>;
    }

    const {
        headerEnabled,
        queryParamEnabled,
        bodyEnabled,
        headerName,
        queryParamName,
        bodyParamName,
        baseUrl,
        basePath,
        curlExampleHeader,
        curlExampleQuery,
        notes,
    } = parsed;

    const hasAnyMethod = headerEnabled || queryParamEnabled || bodyEnabled;

    const getInitialMethod = () => {
        if (headerEnabled) return 'header';
        if (queryParamEnabled) return 'query';
        if (bodyEnabled) return 'body';
        return 'none';
    };

    const [invocationMethod, setInvocationMethod] = useState(getInitialMethod);

    if (!hasAnyMethod) {
        return (
            <Box sx={{ mt: 1, width: '100%' }}>
                <Alert severity='error'>
                    <FormattedMessage
                        id='Apis.Details.FederationConfig.ApiKeyInvocation.noMethod'
                        defaultMessage='No invocation method is configured for this API. Contact your administrator.'
                    />
                </Alert>
            </Box>
        );
    }

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        AppAlert.info('Copied to clipboard');
    };

    const enabledCount = [headerEnabled, queryParamEnabled, bodyEnabled].filter(Boolean).length;

    const getCurlExample = () => {
        if (invocationMethod === 'header') return curlExampleHeader;
        if (invocationMethod === 'query') return curlExampleQuery;
        return null;
    };

    return (
        <Box sx={{ mt: 1, width: '100%' }}>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>
                <FormattedMessage
                    id='Apis.Details.FederationConfig.ApiKeyInvocation.title'
                    defaultMessage='Invocation Instructions'
                />
            </Typography>

            {notes && (
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    {notes}
                </Typography>
            )}

            {enabledCount > 1 && (
                <FormControl component='fieldset' sx={{ mb: 2 }}>
                    <Typography variant='body2' sx={{ mb: 1, fontWeight: 500 }}>
                        <FormattedMessage
                            id='Apis.Details.FederationConfig.ApiKeyInvocation.method'
                            defaultMessage='Invocation Method'
                        />
                    </Typography>
                    <RadioGroup
                        row
                        value={invocationMethod}
                        onChange={(e) => setInvocationMethod(e.target.value)}
                    >
                        {headerEnabled && (
                            <FormControlLabel
                                value='header'
                                control={<Radio />}
                                label={(
                                    <FormattedMessage
                                        id='Apis.Details.FederationConfig.ApiKeyInvocation.header.method'
                                        defaultMessage='Header ({headerName})'
                                        values={{ headerName }}
                                    />
                                )}
                            />
                        )}
                        {queryParamEnabled && (
                            <FormControlLabel
                                value='query'
                                control={<Radio />}
                                label={(
                                    <FormattedMessage
                                        id='Apis.Details.FederationConfig.ApiKeyInvocation.query.method'
                                        defaultMessage='Query Parameter ({queryParamName})'
                                        values={{ queryParamName }}
                                    />
                                )}
                            />
                        )}
                        {bodyEnabled && (
                            <FormControlLabel
                                value='body'
                                control={<Radio />}
                                label={(
                                    <FormattedMessage
                                        id='Apis.Details.FederationConfig.ApiKeyInvocation.body.method'
                                        defaultMessage='Request Body ({bodyParamName})'
                                        values={{ bodyParamName }}
                                    />
                                )}
                            />
                        )}
                    </RadioGroup>
                </FormControl>
            )}

            {baseUrl && (
                <Typography variant='body2' sx={{ mb: 1.5 }}>
                    <strong>
                        <FormattedMessage
                            id='Apis.Details.FederationConfig.ApiKeyInvocation.baseUrl'
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
                            id='Apis.Details.FederationConfig.ApiKeyInvocation.header.name'
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
                            id='Apis.Details.FederationConfig.ApiKeyInvocation.query.name'
                            defaultMessage='Query Parameter Name:'
                        />
                    </strong>
                    {' '}
                    <code>{queryParamName}</code>
                </Typography>
            )}

            {invocationMethod === 'body' && bodyParamName && (
                <Typography variant='body2' sx={{ mb: 1.5 }}>
                    <strong>
                        <FormattedMessage
                            id='Apis.Details.FederationConfig.ApiKeyInvocation.body.name'
                            defaultMessage='Body Parameter Name:'
                        />
                    </strong>
                    {' '}
                    <code>{bodyParamName}</code>
                </Typography>
            )}

            {getCurlExample() && (
                <>
                    <Typography variant='body2' sx={{ mb: 1, fontWeight: 500 }}>
                        <FormattedMessage
                            id='Apis.Details.FederationConfig.ApiKeyInvocation.curl.example'
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
                            onClick={() => handleCopy(getCurlExample())}
                            sx={{ position: 'absolute', top: 4, right: 4 }}
                        >
                            <ContentCopyIcon fontSize='small' />
                        </IconButton>
                        {getCurlExample()}
                    </Box>
                </>
            )}
        </Box>
    );
}

ApiKeyInvocationRenderer.propTypes = {
    body: PropTypes.string.isRequired,
};
