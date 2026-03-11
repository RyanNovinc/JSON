const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS
AWS.config.update({ region: 'ap-southeast-2' });
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const BUCKET_NAME = 'workout-app-testimonial-images';
const TABLE_NAME = 'workout-app-feedback'; // Create this DynamoDB table

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { type } = body;

        // Handle presigned URL requests for image uploads
        if (type === 'get_upload_urls') {
            return await handlePresignedUrlRequest(body, headers);
        }

        // Handle testimonial submission with image URLs
        if (type === 'testimonial') {
            return await handleTestimonialSubmission(body, headers);
        }

        // Handle other feedback types (existing functionality)
        return await handleGeneralFeedback(body, headers);

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

async function handlePresignedUrlRequest(body, headers) {
    const { photoCount = 1, testimonialId } = body;
    const uploadUrls = [];
    const imageKeys = [];

    try {
        for (let i = 0; i < photoCount; i++) {
            const imageKey = `testimonials/${testimonialId || uuidv4()}/image-${i + 1}-${Date.now()}.jpg`;
            imageKeys.push(imageKey);

            const presignedUrl = await s3.getSignedUrlPromise('putObject', {
                Bucket: BUCKET_NAME,
                Key: imageKey,
                ContentType: 'image/jpeg',
                Expires: 300, // 5 minutes
                ACL: 'private'
            });

            uploadUrls.push({
                uploadUrl: presignedUrl,
                imageKey: imageKey,
                viewUrl: `https://${BUCKET_NAME}.s3.ap-southeast-2.amazonaws.com/${imageKey}`
            });
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                uploadUrls,
                bucketName: BUCKET_NAME
            })
        };

    } catch (error) {
        console.error('Error generating presigned URLs:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to generate upload URLs'
            })
        };
    }
}

async function handleTestimonialSubmission(body, headers) {
    const feedbackId = uuidv4();
    
    const testimonialData = {
        id: feedbackId,
        type: 'testimonial',
        testimonialText: body.testimonialText,
        startWeight: body.startWeight,
        currentWeight: body.currentWeight,
        weightUnit: body.weightUnit,
        weightLoss: body.weightLoss,
        transformationDays: body.transformationDays,
        consentForMarketing: body.consentForMarketing,
        beforePhotos: body.beforePhotos || [], // Array of S3 image keys
        afterPhotos: body.afterPhotos || [],   // Array of S3 image keys
        platform: body.platform,
        appVersion: body.appVersion,
        deviceInfo: body.deviceInfo,
        timestamp: new Date().toISOString(),
        createdAt: Date.now()
    };

    try {
        // Save to DynamoDB
        await dynamodb.put({
            TableName: TABLE_NAME,
            Item: testimonialData
        }).promise();

        console.log('Testimonial saved successfully:', feedbackId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                feedbackId,
                message: 'Testimonial submitted successfully'
            })
        };

    } catch (error) {
        console.error('Error saving testimonial:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to save testimonial'
            })
        };
    }
}

async function handleGeneralFeedback(body, headers) {
    const feedbackId = uuidv4();
    
    const feedbackData = {
        id: feedbackId,
        type: body.type,
        details: body.details,
        programId: body.programId,
        stars: body.stars,
        comment: body.comment,
        description: body.description,
        severity: body.severity,
        priority: body.priority,
        steps: body.steps,
        platform: body.platform,
        appVersion: body.appVersion,
        deviceInfo: body.deviceInfo,
        timestamp: new Date().toISOString(),
        createdAt: Date.now()
    };

    try {
        // Save to DynamoDB
        await dynamodb.put({
            TableName: TABLE_NAME,
            Item: feedbackData
        }).promise();

        console.log('Feedback saved successfully:', feedbackId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                feedbackId,
                message: 'Feedback submitted successfully'
            })
        };

    } catch (error) {
        console.error('Error saving feedback:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to save feedback'
            })
        };
    }
}