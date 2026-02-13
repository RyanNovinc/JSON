const AWS = require('aws-sdk');

// Initialize AWS services
const s3 = new AWS.S3();

const BUCKET_NAME = 'video-recipes-ryan-temp-2026';
const URL_EXPIRATION = 3600; // 1 hour

exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Handle OPTIONS requests for CORS
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
    // Parse the request body
    const { fileType, fileName, contentType } = JSON.parse(event.body || '{}');
    
    if (!fileType || !fileName) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
        },
        body: JSON.stringify({ 
          error: 'fileType and fileName are required' 
        })
      };
    }

    // Validate file type
    const allowedTypes = ['video', 'image'];
    if (!allowedTypes.includes(fileType)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
        },
        body: JSON.stringify({ 
          error: 'fileType must be "video" or "image"' 
        })
      };
    }

    // Generate unique key for the file
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = fileName.split('.').pop() || (fileType === 'video' ? 'mp4' : 'jpg');
    const key = `${fileType}s/${timestamp}_${randomString}.${fileExtension}`;
    
    console.log(`Generating presigned URL for: ${key}`);

    // Generate presigned URL for upload
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: URL_EXPIRATION,
      ContentType: contentType || (fileType === 'video' ? 'video/mp4' : 'image/jpeg'),
      ServerSideEncryption: 'AES256'
    };

    const uploadUrl = s3.getSignedUrl('putObject', uploadParams);
    
    // Generate the final S3 URL that will be accessible after upload
    const fileUrl = `https://${BUCKET_NAME}.s3.${AWS.config.region}.amazonaws.com/${key}`;

    console.log('Presigned URL generated successfully');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        uploadUrl: uploadUrl,
        fileUrl: fileUrl,
        key: key,
        expiresIn: URL_EXPIRATION,
        uploadInstructions: {
          method: 'PUT',
          headers: {
            'Content-Type': contentType || (fileType === 'video' ? 'video/mp4' : 'image/jpeg')
          }
        }
      })
    };

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Failed to generate upload URL',
        details: error.message 
      })
    };
  }
};