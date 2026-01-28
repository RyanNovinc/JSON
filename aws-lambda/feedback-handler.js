const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'JsonAppFeedback';

exports.handler = async (event) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    };
    
    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'OK' })
        };
    }
    
    try {
        const body = JSON.parse(event.body);
        const timestamp = new Date().toISOString();
        
        // Validate required fields
        if (!body.type) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Feedback type is required' })
            };
        }
        
        let feedbackItem = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp,
            type: body.type, // 'import_negative', 'rating', 'bug', 'feature'
            userAgent: event.headers['User-Agent'] || 'Unknown',
            platform: body.platform || 'Unknown',
            appVersion: body.appVersion || 'Unknown'
        };
        
        // Handle different feedback types
        switch (body.type) {
            case 'import_negative':
                feedbackItem.details = body.details || '';
                feedbackItem.programId = body.programId || null;
                break;
                
            case 'rating':
                if (!body.stars || body.stars < 1 || body.stars > 5) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Valid star rating (1-5) required' })
                    };
                }
                feedbackItem.stars = body.stars;
                feedbackItem.comment = body.comment || '';
                break;
                
            case 'bug':
                if (!body.description) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Bug description required' })
                    };
                }
                feedbackItem.description = body.description;
                feedbackItem.severity = body.severity || 'medium';
                feedbackItem.steps = body.steps || '';
                break;
                
            case 'feature':
                if (!body.description) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Feature description required' })
                    };
                }
                feedbackItem.description = body.description;
                feedbackItem.priority = body.priority || 'medium';
                break;
                
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid feedback type' })
                };
        }
        
        // Add optional user identifier (anonymous by default)
        if (body.userId) {
            feedbackItem.userId = body.userId;
        }
        
        // Add device info if provided
        if (body.deviceInfo) {
            feedbackItem.deviceInfo = body.deviceInfo;
        }
        
        // Save to DynamoDB
        await dynamodb.put({
            TableName: TABLE_NAME,
            Item: feedbackItem
        }).promise();
        
        // Log to CloudWatch for monitoring
        console.log('Feedback received:', JSON.stringify(feedbackItem));
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Feedback received successfully',
                feedbackId: feedbackItem.id
            })
        };
        
    } catch (error) {
        console.error('Error processing feedback:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to process feedback',
                message: error.message
            })
        };
    }
};