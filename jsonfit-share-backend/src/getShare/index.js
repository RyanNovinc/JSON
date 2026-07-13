const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { gunzipSync } = require('zlib');

const { MAX_UNCOMPRESSED_BYTES } = require('../shared/shareLimits');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Recover the share payload from a stored item.
 *
 * Items come in two shapes and BOTH must resolve:
 *
 *   new: { shareId, enc: 'gzip', blob: <Binary>, ... }  — written by createShare now
 *   old: { shareId, data: <Map>, ... }                  — written before compression
 *
 * Old items live in the table for up to the full TTL after this deploys, so the
 * `data` branch cannot be dropped until every pre-existing share has expired.
 *
 * Critically, both branches return a plain JS object, and the caller serialises
 * it with the same JSON.stringify it always has. Compression is therefore
 * invisible on the wire: an installed client sees exactly the response it saw
 * before. That is deliberate — there is no version negotiation on this endpoint,
 * so changing the response shape would strand every app already on a phone.
 */
const readPayload = (item) => {
    if (item.blob) {
        // Bound the inflate even though we wrote this blob ourselves — a corrupt
        // or tampered item should fail cleanly, not exhaust the function's memory.
        const json = gunzipSync(Buffer.from(item.blob), {
            maxOutputLength: MAX_UNCOMPRESSED_BYTES,
        }).toString('utf8');
        return JSON.parse(json);
    }
    return item.data;
};

exports.handler = async (event) => {
    try {
        console.log('GetShare request:', JSON.stringify(event, null, 2));

        // Extract shareId from path parameters
        const shareId = event.pathParameters?.shareId;

        if (!shareId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Share ID is required'
                })
            };
        }

        // Validate shareId format (8 characters, alphanumeric)
        if (!/^[A-Za-z0-9]{8}$/.test(shareId)) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Share not found'
                })
            };
        }

        // Get item from DynamoDB
        const result = await docClient.send(new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
                shareId: shareId
            }
        }));

        // Check if item exists
        if (!result.Item) {
            console.log(`Share not found: ${shareId}`);
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Share not found'
                })
            };
        }

        // Check if item has expired (additional check, TTL should handle this automatically)
        const currentTime = Math.floor(Date.now() / 1000);
        if (result.Item.expiresAt && result.Item.expiresAt < currentTime) {
            console.log(`Share expired: ${shareId}, expiry: ${result.Item.expiresAt}, current: ${currentTime}`);
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Share not found'
                })
            };
        }

        console.log(`Share retrieved successfully: ${shareId}`);

        // Return the data along with metadata.
        // Response shape is unchanged from before compression — see readPayload.
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            },
            body: JSON.stringify({
                shareId: result.Item.shareId,
                data: readPayload(result.Item),
                createdAt: result.Item.createdAt,
                expiresAt: result.Item.expiresAt
            })
        };

    } catch (error) {
        console.error('Error retrieving share:', error);

        // Handle specific DynamoDB errors
        if (error.name === 'ResourceNotFoundException') {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Service configuration error'
                })
            };
        }

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal server error'
            })
        };
    }
};