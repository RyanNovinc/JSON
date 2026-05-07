const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

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

        // Return the data along with metadata
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            },
            body: JSON.stringify({
                shareId: result.Item.shareId,
                data: result.Item.data,
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