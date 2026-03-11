# AWS S3 Setup for Testimonial Image Storage

This guide walks you through setting up AWS S3 for storing testimonial images with your React Native app.

## Prerequisites

1. AWS CLI installed and configured
2. Node.js and npm installed
3. AWS account with appropriate permissions

## Setup Instructions

### 1. Install Dependencies

```bash
npm install aws-sdk uuid
```

### 2. Set Up AWS Credentials

Make sure your AWS CLI is configured with credentials that have permissions for:
- S3 (CreateBucket, PutObject, GetObject, DeleteObject)
- IAM (for bucket policies)
- Lambda (for updating your function)

```bash
aws configure
```

### 3. Create S3 Bucket

Run the setup script to create your S3 bucket:

```bash
node aws-setup/create-s3-bucket.js
```

This will:
- ✅ Create S3 bucket `workout-app-testimonial-images` in Sydney region
- ✅ Configure CORS for React Native uploads
- ✅ Set up bucket versioning and lifecycle policies
- ✅ Enable server-side encryption
- ✅ Configure bucket policies for Lambda access

### 4. Update Lambda Function

1. Update your existing Lambda function with the new code from `lambda-function-updated.js`
2. Add the following environment variables to your Lambda:
   - `BUCKET_NAME`: `workout-app-testimonial-images`
   - `REGION`: `ap-southeast-2`

3. Ensure your Lambda execution role has these permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::workout-app-testimonial-images/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:UpdateItem"
            ],
            "Resource": "arn:aws:dynamodb:ap-southeast-2:*:table/workout-app-feedback"
        }
    ]
}
```

### 5. Create DynamoDB Table (Optional)

If you want to store feedback in DynamoDB instead of just logging:

```bash
aws dynamodb create-table \
  --table-name workout-app-feedback \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-2
```

### 6. Test the Setup

Your React Native app is now configured to:
1. 📸 Upload before/after photos to S3 when submitting testimonials
2. 🔄 Fall back to text-only testimonials if photo upload fails
3. ☁️ Store image references in your feedback system

## How It Works

1. **Photo Selection**: User selects before photos from weight history and captures after photos
2. **Presigned URLs**: App requests upload URLs from your Lambda function
3. **S3 Upload**: Photos are uploaded directly to S3 using presigned URLs
4. **Testimonial Submission**: Testimonial text + S3 image keys are sent to your feedback API
5. **Storage**: Everything is stored with device info and metadata

## File Structure

```
aws-setup/
├── create-s3-bucket.js      # S3 bucket creation script
├── lambda-function-updated.js # Updated Lambda function code
└── README.md               # This file

src/services/
├── s3ImageUpload.ts        # S3 upload utilities
└── feedbackApi.ts          # Updated feedback API with photo support
```

## Security Features

- ✅ Presigned URLs with 5-minute expiration
- ✅ CORS configured for React Native
- ✅ Server-side encryption enabled
- ✅ Private bucket with controlled access
- ✅ Lifecycle policies for storage optimization

## Troubleshooting

### Common Issues:

1. **CORS errors**: Make sure bucket CORS is properly configured
2. **Permission errors**: Check Lambda execution role permissions
3. **Upload failures**: Verify presigned URL expiration (5 minutes)
4. **Region mismatch**: Ensure all resources are in ap-southeast-2

### Testing Commands:

```bash
# Test bucket creation
node aws-setup/create-s3-bucket.js

# Test Lambda function locally
# (You'll need to deploy the updated function first)

# Check bucket configuration
aws s3api get-bucket-cors --bucket workout-app-testimonial-images
```

## Next Steps

1. Deploy the updated Lambda function
2. Test testimonial submission with photos in your app
3. Monitor S3 usage in AWS console
4. Set up CloudWatch logs for debugging

Your testimonial system now supports beautiful before/after photos stored securely in AWS S3! 🎉