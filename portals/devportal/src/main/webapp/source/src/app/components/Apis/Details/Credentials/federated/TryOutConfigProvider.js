/**
 * Schema-based TryOut configuration extraction.
 *
 * Uses schemaName from DTO envelopes to select extractors (no body parsing).
 * This allows new gateways to reuse existing schemas without code changes.
 *
 * To add a new credential schema:
 *   1. Add extractor to credentialExtractors map
 *   2. New gateway connectors using this schema work automatically
 *
 * To add a new invocation schema:
 *   1. Add extractor to invocationExtractors map
 *   2. New gateway connectors using this schema work automatically
 */

// ============ CREDENTIAL EXTRACTORS (by schemaName) ============

/**
 * Extracts value from 'opaque-api-key' schema credentials.
 * Used by: AWS, Kong (key-auth), potentially others
 * Body format: { value: '...', headerName: '...' }
 */
const opaqueApiKeyExtractor = (credentialBody) => {
    try {
        const parsed = typeof credentialBody === 'string'
            ? JSON.parse(credentialBody) : credentialBody;
        return parsed.value || null;
    } catch { return null; }
};

/**
 * Extracts value from 'primary-secondary-key-pair' schema credentials.
 * Used by: Azure APIM
 * Body format: { primaryKey: '...', secondaryKey: '...' }
 */
const primarySecondaryKeyExtractor = (credentialBody) => {
    try {
        const parsed = typeof credentialBody === 'string'
            ? JSON.parse(credentialBody) : credentialBody;
        return parsed.primaryKey || null;
    } catch { return null; }
};

/**
 * Extracts value from 'jwt-bearer' schema credentials.
 * Used by: Future JWT-based gateways (Envoy with JWT, K8s Istio, etc.)
 * Body format: { token: '...', expiresAt: '...' }
 */
const jwtBearerExtractor = (credentialBody) => {
    try {
        const parsed = typeof credentialBody === 'string'
            ? JSON.parse(credentialBody) : credentialBody;
        return parsed.token || parsed.jwt || parsed.accessToken || null;
    } catch { return null; }
};

/**
 * Fallback extractor - tries common field names.
 * Used when schema is unknown or not registered.
 */
const fallbackCredentialExtractor = (credentialBody) => {
    try {
        const parsed = typeof credentialBody === 'string'
            ? JSON.parse(credentialBody) : credentialBody;
        // Try common field names in order of likelihood
        return parsed.value
        || parsed.primaryKey
        || parsed.token
        || parsed.apiKey
        || parsed.key
        || parsed.credential
        || null;
    } catch { return null; }
};

// Registry: credentialType → extractor function
const credentialExtractors = {
    'opaque-api-key': opaqueApiKeyExtractor,
    'primary-secondary-key-pair': primarySecondaryKeyExtractor,
    'jwt-bearer': jwtBearerExtractor,
    // Add new credential schemas here:
    // 'hmac-signature': hmacSignatureExtractor,
    // 'mtls-certificate': mtlsCertExtractor,
};

// ============ INVOCATION EXTRACTORS (by invocationSchema) ============

/**
 * Extracts config from 'header-based' invocation schema.
 * Used by: AWS (x-api-key header)
 * Body format: { invocationSchema: 'header-based', headerName: 'x-api-key', ... }
 */
const headerBasedExtractor = (invocationBody) => {
    try {
        const parsed = typeof invocationBody === 'string'
            ? JSON.parse(invocationBody) : invocationBody;
        return {
            headerName: parsed.headerName || 'Authorization',
            prefix: parsed.prefix || '', // No prefix for API keys
            supportsQueryParam: false,
        };
    } catch {
        return { headerName: 'Authorization', prefix: '', supportsQueryParam: false };
    }
};

/**
 * Extracts config from 'header-with-query-fallback' invocation schema.
 * Used by: Azure APIM (Ocp-Apim-Subscription-Key header or query param)
 * Body format: { invocationSchema: 'header-with-query-fallback', headerName: '...', queryParamName: '...' }
 */
const headerWithQueryFallbackExtractor = (invocationBody) => {
    try {
        const parsed = typeof invocationBody === 'string'
            ? JSON.parse(invocationBody) : invocationBody;
        return {
            headerName: parsed.headerName || 'Authorization',
            queryParamName: parsed.queryParamName || null,
            prefix: parsed.prefix || '',
            supportsQueryParam: true,
        };
    } catch {
        return { headerName: 'Authorization', prefix: '', supportsQueryParam: false };
    }
};

/**
 * Extracts config from 'bearer-token' invocation schema.
 * Used by: OAuth2/JWT gateways that require "Bearer " prefix
 * Body format: { invocationSchema: 'bearer-token', headerName: 'Authorization' }
 */
const bearerTokenExtractor = (invocationBody) => {
    try {
        const parsed = typeof invocationBody === 'string'
            ? JSON.parse(invocationBody) : invocationBody;
        return {
            headerName: parsed.headerName || 'Authorization',
            prefix: 'Bearer ', // Always add Bearer prefix
            supportsQueryParam: false,
        };
    } catch {
        return { headerName: 'Authorization', prefix: 'Bearer ', supportsQueryParam: false };
    }
};

/**
 * Fallback invocation extractor - extracts headerName from any body.
 */
const fallbackInvocationExtractor = (invocationBody) => {
    try {
        const parsed = typeof invocationBody === 'string'
            ? JSON.parse(invocationBody) : invocationBody;
        return {
            headerName: parsed.headerName || 'Authorization',
            prefix: parsed.prefix || '',
            queryParamName: parsed.queryParamName || null,
            supportsQueryParam: !!parsed.queryParamName,
        };
    } catch {
        return { headerName: 'Authorization', prefix: '', supportsQueryParam: false };
    }
};

// Registry: invocationSchema → extractor function
const invocationExtractors = {
    'header-based': headerBasedExtractor,
    'header-with-query-fallback': headerWithQueryFallbackExtractor,
    'bearer-token': bearerTokenExtractor,
    // Add new invocation schemas here:
    // 'aws-signature': awsSigV4Extractor,
    // 'mtls': mtlsInvocationExtractor,
};

// ============ PUBLIC API ============

/**
 * Get complete TryOut configuration from federated subscription info.
 *
 * @param {string} credentialBody - Opaque JSON credential body
 * @param {string} invocationBody - Opaque JSON invocation body
 * @param {string} credentialSchemaName - Schema name from DTO envelope
 * @param {string} invocationSchemaName - Schema name from DTO envelope
 * @returns {Object} TryOut configuration:
 *   - headerName: Header name to use (e.g., 'x-api-key', 'Ocp-Apim-Subscription-Key')
 *   - headerValue: Credential value to send
 *   - prefix: Prefix to add before value (e.g., 'Bearer ')
 *   - supportsQueryParam: Whether query param fallback is supported
 *   - queryParamName: Query param name if supported
 */
export function getTryOutConfig(credentialBody, invocationBody, credentialSchemaName, invocationSchemaName) {
    // 1. Select extractors based on schema names from DTO envelopes
    const credExtractor = credentialExtractors[credentialSchemaName] || fallbackCredentialExtractor;
    const invExtractor = invocationExtractors[invocationSchemaName] || fallbackInvocationExtractor;

    // 2. Extract values
    const credentialValue = credExtractor(credentialBody);
    const invocationConfig = invExtractor(invocationBody);

    return {
        headerName: invocationConfig.headerName,
        headerValue: credentialValue,
        prefix: invocationConfig.prefix || '',
        supportsQueryParam: invocationConfig.supportsQueryParam || false,
        queryParamName: invocationConfig.queryParamName || null,
    };
}

/**
 * Get just the header name from invocation body.
 * Useful when only header name is needed (e.g., for display).
 */
export function getHeaderName(invocationBody) {
    const config = getTryOutConfig(null, invocationBody);
    return config.headerName;
}

/**
 * Get just the credential value from credential body.
 * Useful when only value is needed.
 */
export function getCredentialValue(credentialBody) {
    const config = getTryOutConfig(credentialBody, null);
    return config.headerValue;
}

/**
 * Register a new credential extractor.
 * Allows gateway connectors to add custom schemas at runtime.
 *
 * @param {string} credentialType - The credentialType value in body
 * @param {Function} extractor - Function(body) => credentialValue
 */
export function registerCredentialExtractor(credentialType, extractor) {
    credentialExtractors[credentialType] = extractor;
}

/**
 * Register a new invocation extractor.
 * Allows gateway connectors to add custom schemas at runtime.
 *
 * @param {string} invocationSchema - The invocationSchema value in body
 * @param {Function} extractor - Function(body) => { headerName, prefix, ... }
 */
export function registerInvocationExtractor(invocationSchema, extractor) {
    invocationExtractors[invocationSchema] = extractor;
}
