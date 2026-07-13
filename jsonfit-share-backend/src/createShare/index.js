const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { gzipSync, gunzipSync } = require('zlib');

const {
    MAX_STORED_COMPRESSED_BYTES,
    MAX_UNCOMPRESSED_BYTES,
    ENCODING_GZIP_B64,
} = require('../shared/shareLimits');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Configuration
const EXPIRY_DAYS = 7;

// How many times to retry on a shareId collision before giving up.
const MAX_ID_ATTEMPTS = 3;

// Generate URL-safe 8-character ID (avoiding ambiguous characters)
const generateShareId = () => {
    // Exclude: 0, O, 1, l, I for clarity
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Recover the raw share JSON text from a request body.
 *
 * Two shapes are accepted, and which one we got is decided purely by the
 * presence of the `enc` marker:
 *
 *   new client: {"enc":"gzip+b64","payload":"<base64 of gzip of the JSON>"}
 *   old client: the bare share object, e.g. {"workoutData":{...},...}
 *
 * Old clients are still in the wild and will be forever — they must keep
 * working, so an unmarked body is simply used as-is.
 *
 * Returns the decompressed JSON *text*, or a validation error.
 */
const decodeBody = (body) => {
    if (!body) {
        return { valid: false, error: 'Request body is required', statusCode: 400 };
    }

    let envelope;
    try {
        envelope = JSON.parse(body);
    } catch (error) {
        return { valid: false, error: `Invalid JSON: ${error.message}`, statusCode: 400 };
    }

    if (typeof envelope !== 'object' || envelope === null || Array.isArray(envelope)) {
        return { valid: false, error: 'Request body must be a valid JSON object', statusCode: 400 };
    }

    // Old, uncompressed sender: the envelope IS the payload.
    if (envelope.enc === undefined) {
        return { valid: true, json: body };
    }

    if (envelope.enc !== ENCODING_GZIP_B64) {
        return {
            valid: false,
            error: `Unsupported encoding: ${String(envelope.enc)}`,
            statusCode: 400,
        };
    }

    if (typeof envelope.payload !== 'string') {
        return {
            valid: false,
            error: 'Encoded body must carry a base64 "payload" string',
            statusCode: 400,
        };
    }

    let json;
    try {
        // maxOutputLength is the zip-bomb guard. This endpoint is unauthenticated,
        // so a hostile 1 KB body could otherwise inflate to gigabytes and OOM the
        // function. zlib aborts the inflate itself rather than us checking after
        // the fact — by then the memory is already gone.
        json = gunzipSync(Buffer.from(envelope.payload, 'base64'), {
            maxOutputLength: MAX_UNCOMPRESSED_BYTES,
        }).toString('utf8');
    } catch (error) {
        // A payload that blows the output bound is oversized, not malformed.
        if (error.code === 'ERR_BUFFER_TOO_LARGE' || /maxOutputLength/i.test(error.message || '')) {
            return {
                valid: false,
                error: `Payload exceeds the maximum decompressed size of ${Math.round(MAX_UNCOMPRESSED_BYTES / 1024)}KB`,
                statusCode: 413,
            };
        }
        return { valid: false, error: 'Payload is not valid gzip data', statusCode: 400 };
    }

    return { valid: true, json };
};

/**
 * Validate the recovered JSON and produce the exact item we will store.
 *
 * `canonicalJson` (JSON.stringify of the parsed object) is what we gzip and
 * store. getShare re-parses it and re-serialises it through the same builder it
 * always has, which is what keeps its response byte-identical for old clients.
 */
const buildRecord = (json) => {
    const uncompressedBytes = Buffer.byteLength(json, 'utf8');
    if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
        return {
            valid: false,
            error: `Request body too large: ${Math.round(uncompressedBytes / 1024)}KB. Maximum allowed: ${Math.round(MAX_UNCOMPRESSED_BYTES / 1024)}KB`,
            statusCode: 413,
        };
    }

    let parsed;
    try {
        parsed = JSON.parse(json);
    } catch (error) {
        return { valid: false, error: `Invalid JSON: ${error.message}`, statusCode: 400 };
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { valid: false, error: 'Share payload must be a valid JSON object', statusCode: 400 };
    }

    const blob = gzipSync(Buffer.from(JSON.stringify(parsed), 'utf8'), { level: 9 });

    // The guard that actually protects DynamoDB's 400KB item cap. Compression is
    // measured, never assumed: if this payload happened to compress badly, we
    // reject it here rather than failing the Put with a ValidationException.
    if (blob.length > MAX_STORED_COMPRESSED_BYTES) {
        return {
            valid: false,
            error: `Payload does not compress small enough to store: ${Math.round(blob.length / 1024)}KB compressed. Maximum allowed: ${Math.round(MAX_STORED_COMPRESSED_BYTES / 1024)}KB`,
            statusCode: 413,
        };
    }

    return { valid: true, blob, uncompressedBytes };
};

const errorResponse = (statusCode, error) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error }),
});

exports.handler = async (event) => {
    try {
        const decoded = decodeBody(event.body);
        if (!decoded.valid) {
            return errorResponse(decoded.statusCode, decoded.error);
        }

        const record = buildRecord(decoded.json);
        if (!record.valid) {
            return errorResponse(record.statusCode, record.error);
        }

        console.log(
            `CreateShare: ${record.uncompressedBytes}B raw -> ${record.blob.length}B stored ` +
            `(${(record.uncompressedBytes / record.blob.length).toFixed(1)}x)`
        );

        const expiresAt = Math.floor(Date.now() / 1000) + (EXPIRY_DAYS * 24 * 60 * 60);

        // Retry on the (very unlikely) event of an ID collision. ConditionExpression
        // is what makes the collision detectable at all — without it a Put would
        // silently overwrite someone else's share.
        for (let attempt = 1; attempt <= MAX_ID_ATTEMPTS; attempt++) {
            const shareId = generateShareId();
            try {
                await docClient.send(new PutCommand({
                    TableName: process.env.TABLE_NAME,
                    Item: {
                        shareId,
                        // `blob` (gzipped) replaces the old plaintext `data` map.
                        // getShare reads whichever of the two an item carries, so
                        // shares written by the previous version still resolve.
                        enc: 'gzip',
                        blob: record.blob,
                        createdAt: Math.floor(Date.now() / 1000),
                        expiresAt,
                    },
                    ConditionExpression: 'attribute_not_exists(shareId)',
                }));

                console.log(`Share created successfully: ${shareId}`);

                return {
                    statusCode: 201,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({ shareId, expiresAt }),
                };
            } catch (error) {
                if (error.name !== 'ConditionalCheckFailedException') {
                    throw error;
                }
                console.log(`Share ID collision on ${shareId} (attempt ${attempt}/${MAX_ID_ATTEMPTS})`);
            }
        }

        console.error(`Failed to find a free share ID in ${MAX_ID_ATTEMPTS} attempts`);
        return errorResponse(500, 'Failed to generate unique share ID');

    } catch (error) {
        console.error('Error creating share:', error);
        return errorResponse(500, 'Internal server error');
    }
};
