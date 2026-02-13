const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const lambda = new AWS.Lambda();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'video-recipe-jobs';

exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
      },
      body: ''
    };
  }
  
  try {
    if (event.httpMethod === 'POST') {
      // Start async processing
      const { videoUrl, imageUrl, userText } = JSON.parse(event.body || '{}');
      const jobId = uuidv4();
      
      // Store job in DynamoDB
      await dynamodb.put({
        TableName: TABLE_NAME,
        Item: {
          jobId,
          status: 'processing',
          createdAt: new Date().toISOString(),
          videoUrl,
          imageUrl,
          userText
        }
      }).promise();
      
      // Invoke video processor asynchronously
      await lambda.invoke({
        FunctionName: 'video-recipe-processor',
        InvocationType: 'Event', // Async
        Payload: JSON.stringify({
          jobId,
          videoUrl,
          imageUrl,
          userText
        })
      }).promise();
      
      return {
        statusCode: 202, // Accepted
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
        },
        body: JSON.stringify({ 
          success: true,
          jobId,
          status: 'processing',
          message: 'Processing started. Use jobId to check status.'
        })
      };
      
    } else if (event.httpMethod === 'GET') {
      // Check job status
      const jobId = event.queryStringParameters?.jobId;
      
      if (!jobId) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
          },
          body: JSON.stringify({ error: 'jobId is required' })
        };
      }
      
      const result = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: { jobId }
      }).promise();
      
      if (!result.Item) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
          },
          body: JSON.stringify({ error: 'Job not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
        },
        body: JSON.stringify(result.Item)
      };
    }
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};