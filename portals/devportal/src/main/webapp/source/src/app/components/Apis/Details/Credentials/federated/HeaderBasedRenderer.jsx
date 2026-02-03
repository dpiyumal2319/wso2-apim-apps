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
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { FormattedMessage } from 'react-intl';
import Alert from 'AppComponents/Shared/Alert';

export default function HeaderBasedRenderer({ body }) {
    let parsed;
    try {
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        return <Typography color='error'>Failed to parse invocation instructions</Typography>;
    }

    const {
        headerName,
        baseUrl,
        basePath,
        curlExampleHeader,
    } = parsed;

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        Alert.info('Copied to clipboard');
    };

    return (
        <Box sx={{ mt: 1, width: '100%' }}>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>
                <FormattedMessage
                    id='Apis.Details.Credentials.federated.HeaderBased.title'
                    defaultMessage='Invocation Instructions'
                />
            </Typography>

            {baseUrl && (
                <Typography variant='body2' sx={{ mb: 1.5 }}>
                    <strong>
                        <FormattedMessage
                            id='Apis.Details.Credentials.federated.HeaderBased.baseUrl'
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

            {headerName && (
                <Typography variant='body2' sx={{ mb: 1.5 }}>
                    <strong>
                        <FormattedMessage
                            id='Apis.Details.Credentials.federated.HeaderBased.headerName'
                            defaultMessage='Header Name:'
                        />
                    </strong>
                    {' '}
                    <code>{headerName}</code>
                </Typography>
            )}

            <Typography variant='body2' sx={{ mb: 1, fontWeight: 500 }}>
                <FormattedMessage
                    id='Apis.Details.Credentials.federated.HeaderBased.curlExample'
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
                    onClick={() => handleCopy(curlExampleHeader)}
                    sx={{ position: 'absolute', top: 4, right: 4 }}
                >
                    <ContentCopyIcon fontSize='small' />
                </IconButton>
                {curlExampleHeader}
            </Box>
        </Box>
    );
}

HeaderBasedRenderer.propTypes = {
    body: PropTypes.string.isRequired,
};
