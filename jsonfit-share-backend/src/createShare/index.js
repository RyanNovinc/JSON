const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Configuration
const EXPIRY_DAYS = 7;

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

// Validate JSON payload size and structure
const validatePayload = (body) => {
    if (!body) {
        return { valid: false, error: 'Request body is required', statusCode: 400 };
    }

    // Check size (200KB limit)
    const bodySize = Buffer.byteLength(body, 'utf8');
    if (bodySize > 200 * 1024) {
        return { 
            valid: false, 
            error: `Request body too large: ${Math.round(bodySize/1024)}KB. Maximum allowed: 200KB`, 
            statusCode: 413 
        };
    }

    // Validate JSON structure
    try {
        const parsed = JSON.parse(body);
        
        // Basic validation - ensure it's an object
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return { 
                valid: false, 
                error: 'Request body must be a valid JSON object', 
                statusCode: 400 
            };
        }

        return { valid: true, data: parsed };
    } catch (error) {
        return { 
            valid: false, 
            error: `Invalid JSON: ${error.message}`, 
            statusCode: 400 
        };
    }
};

exports.handler = async (event) => {
    try {
        console.log('CreateShare request:', JSON.stringify(event, null, 2));

        // Validate payload
        const validation = validatePayload(event.body);
        if (!validation.valid) {
            return {
                statusCode: validation.statusCode,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: validation.error
                })
            };
        }

        // Generate unique share ID
        const shareId = generateShareId();
        
        // Calculate expiration (7 days from now)
        const expiresAt = Math.floor(Date.now() / 1000) + (EXPIRY_DAYS * 24 * 60 * 60);

        // Store in DynamoDB
        const item = {
            shareId,
            data: validation.data,
            createdAt: Math.floor(Date.now() / 1000),
            expiresAt
        };

        await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: item,
            // Prevent overwriting existing items with same ID (very unlikely but good practice)
            ConditionExpression: 'attribute_not_exists(shareId)'
        }));

        console.log(`Share created successfully: ${shareId}`);

        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                shareId,
                expiresAt
            })
        };

    } catch (error) {
        console.error('Error creating share:', error);

        // Handle DynamoDB conditional check failure (ID collision)
        if (error.name === 'ConditionalCheckFailedException') {
            // This is extremely unlikely with our ID generation, but retry once
            console.log('Share ID collision detected, retrying...');
            try {
                const newShareId = generateShareId();
                const expiresAt = Math.floor(Date.now() / 1000) + (EXPIRY_DAYS * 24 * 60 * 60);
                
                const validation = validatePayload(event.body);
                const item = {
                    shareId: newShareId,
                    data: validation.data,
                    createdAt: Math.floor(Date.now() / 1000),
                    expiresAt
                };

                await docClient.send(new PutCommand({
                    TableName: process.env.TABLE_NAME,
                    Item: item,
                    ConditionExpression: 'attribute_not_exists(shareId)'
                }));

                return {
                    statusCode: 201,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        shareId: newShareId,
                        expiresAt
                    })
                };
            } catch (retryError) {
                console.error('Retry failed:', retryError);
                return {
                    statusCode: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'Failed to generate unique share ID'
                    })
                };
            }
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