#!/bin/bash

# AWS S3 and Lambda Deployment Script
# Run this script to deploy your testimonial image storage system

set -e  # Exit on any error

echo "🚀 Starting AWS deployment for testimonial image storage..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REGION="ap-southeast-2"
BUCKET_NAME="workout-app-testimonial-images"
FUNCTION_NAME="workout-app-feedback"  # Update this to match your existing function name
TABLE_NAME="workout-app-feedback"

echo -e "${BLUE}📍 Region: $REGION${NC}"
echo -e "${BLUE}🪣 S3 Bucket: $BUCKET_NAME${NC}"
echo -e "${BLUE}⚡ Lambda Function: $FUNCTION_NAME${NC}"

# Step 1: Install AWS dependencies
echo -e "\n${YELLOW}📦 Step 1: Installing AWS dependencies...${NC}"
npm install aws-sdk uuid

# Step 2: Create S3 bucket
echo -e "\n${YELLOW}🪣 Step 2: Creating S3 bucket...${NC}"
node aws-setup/create-s3-bucket.js

# Step 3: Create DynamoDB table (optional)
echo -e "\n${YELLOW}💾 Step 3: Creating DynamoDB table...${NC}"
aws dynamodb create-table \
    --table-name $TABLE_NAME \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --no-cli-pager || echo "Table might already exist"

# Step 4: Package Lambda function
echo -e "\n${YELLOW}📦 Step 4: Packaging Lambda function...${NC}"
cd aws-setup
mkdir -p lambda-package
cp lambda-function-updated.js lambda-package/index.js

# Create package.json for Lambda
cat > lambda-package/package.json << EOF
{
  "name": "workout-app-feedback",
  "version": "1.0.0",
  "description": "Feedback API with S3 image support",
  "main": "index.js",
  "dependencies": {
    "aws-sdk": "^2.1000.0",
    "uuid": "^9.0.0"
  }
}
EOF

cd lambda-package
npm install --production
zip -r ../lambda-function.zip .
cd ..

# Step 5: Update Lambda function
echo -e "\n${YELLOW}⚡ Step 5: Updating Lambda function...${NC}"
echo "Please update your Lambda function name in the script if different from 'workout-app-feedback'"
echo "Attempting to update function: $FUNCTION_NAME"

aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://lambda-function.zip \
    --region $REGION \
    --no-cli-pager

# Step 6: Update Lambda environment variables
echo -e "\n${YELLOW}🔧 Step 6: Setting environment variables...${NC}"
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables="{BUCKET_NAME=$BUCKET_NAME,REGION=$REGION,TABLE_NAME=$TABLE_NAME}" \
    --region $REGION \
    --no-cli-pager

# Step 7: Update Lambda execution role (create policy if needed)
echo -e "\n${YELLOW}🔐 Step 7: Creating IAM policy for Lambda...${NC}"

# Create IAM policy for S3 and DynamoDB access
cat > lambda-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:UpdateItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:$REGION:*:table/$TABLE_NAME"
        }
    ]
}
EOF

# Create policy (ignore if exists)
aws iam create-policy \
    --policy-name WorkoutAppS3DynamoDBPolicy \
    --policy-document file://lambda-policy.json \
    --region $REGION \
    --no-cli-pager || echo "Policy might already exist"

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "\n${BLUE}📋 Summary:${NC}"
echo -e "• S3 Bucket: $BUCKET_NAME"
echo -e "• DynamoDB Table: $TABLE_NAME" 
echo -e "• Lambda Function: $FUNCTION_NAME"
echo -e "• Region: $REGION"

echo -e "\n${YELLOW}🔧 Manual Steps Remaining:${NC}"
echo -e "1. Attach 'WorkoutAppS3DynamoDBPolicy' to your Lambda execution role in AWS Console"
echo -e "2. Test testimonial submission in your app"
echo -e "3. Check CloudWatch logs for any issues"

echo -e "\n${GREEN}🎉 Your app now supports testimonial photos with AWS S3!${NC}"

cd ..