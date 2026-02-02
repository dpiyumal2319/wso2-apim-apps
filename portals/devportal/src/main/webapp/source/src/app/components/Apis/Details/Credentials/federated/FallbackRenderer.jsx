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
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Alert from 'AppComponents/Shared/Alert';

export default function FallbackRenderer({ body, actionButtons }) {
    let formatted;
    try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        formatted = JSON.stringify(parsed, null, 2);
    } catch {
        formatted = body;
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(formatted);
        Alert.info('Copied to clipboard');
    };

    return (
        <>
            <Box
                sx={{
                    mt: 1,
                    p: 1.5,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    position: 'relative',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                }}
            >
                <IconButton
                    size='small'
                    onClick={handleCopy}
                    sx={{ position: 'absolute', top: 4, right: 4 }}
                >
                    <ContentCopyIcon fontSize='small' />
                </IconButton>
                {formatted}
            </Box>
            {actionButtons && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    {actionButtons.retrieve}
                    {actionButtons.regenerate}
                    {actionButtons.delete}
                </Box>
            )}
        </>
    );
}

FallbackRenderer.propTypes = {
    body: PropTypes.string.isRequired,
    actionButtons: PropTypes.shape({
        retrieve: PropTypes.node,
        regenerate: PropTypes.node,
        delete: PropTypes.node,
    }),
};

FallbackRenderer.defaultProps = {
    actionButtons: null,
};
