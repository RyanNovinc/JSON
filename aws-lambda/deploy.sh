#!/bin/bash

# Configuration
FUNCTION_NAME="json-app-feedback-handler"
REGION="us-east-1"  # Change this to your preferred region
RUNTIME="nodejs18.x"
HANDLER="feedback-handler.handler"
TABLE_NAME="JsonAppFeedback"

echo "🚀 Deploying JSON App Feedback Handler to AWS Lambda..."

# Step 1: Create DynamoDB table if it doesn't exist
echo "📊 Creating DynamoDB table..."
aws dynamodb create-table \
    --table-name $TABLE_NAME \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ DynamoDB table created"
else
    echo "ℹ️  DynamoDB table already exists or error occurred"
fi

# Step 2: Create IAM role for Lambda
echo "🔐 Creating IAM role..."
ROLE_NAME="json-app-feedback-lambda-role"
TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document "$TRUST_POLICY" \
    --region $REGION 2>/dev/null

# Attach policies
aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    --region $REGION 2>/dev/null

# Create DynamoDB policy
DYNAMODB_POLICY='{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:'$REGION':*:table/'$TABLE_NAME'"
        }
    ]
}'

aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name DynamoDBAccess \
    --policy-document "$DYNAMODB_POLICY" \
    --region $REGION 2>/dev/null

echo "✅ IAM role configured"

# Step 3: Package Lambda function
echo "📦 Packaging Lambda function..."
cd aws-lambda
npm install --production
zip -r ../lambda-deployment.zip .
cd ..

# Step 4: Get the role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text --region $REGION)

# Wait for role to propagate
echo "⏳ Waiting for IAM role to propagate..."
sleep 10

# Step 5: Create or update Lambda function
echo "🔧 Deploying Lambda function..."
aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime $RUNTIME \
    --role $ROLE_ARN \
    --handler $HANDLER \
    --zip-file fileb://lambda-deployment.zip \
    --timeout 30 \
    --memory-size 256 \
    --region $REGION 2>/dev/null

if [ $? -ne 0 ]; then
    echo "ℹ️  Function exists, updating code..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://lambda-deployment.zip \
        --region $REGION
fi

# Step 6: Create API Gateway
echo "🌐 Setting up API Gateway..."
API_NAME="json-app-feedback-api"

# Create REST API
API_ID=$(aws apigateway create-rest-api \
    --name $API_NAME \
    --description "API for JSON App Feedback" \
    --region $REGION \
    --query 'id' \
    --output text 2>/dev/null)

if [ -z "$API_ID" ]; then
    # Get existing API
    API_ID=$(aws apigateway get-rest-apis \
        --region $REGION \
        --query "items[?name=='$API_NAME'].id" \
        --output text)
fi

echo "API ID: $API_ID"

# Get root resource
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query 'items[0].id' \
    --output text)

# Create /feedback resource
RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part feedback \
    --region $REGION \
    --query 'id' \
    --output text 2>/dev/null)

if [ -z "$RESOURCE_ID" ]; then
    # Get existing resource
    RESOURCE_ID=$(aws apigateway get-resources \
        --rest-api-id $API_ID \
        --region $REGION \
        --query "items[?path=='/feedback'].id" \
        --output text)
fi

# Create POST method
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --region $REGION 2>/dev/null

# Create OPTIONS method for CORS
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION 2>/dev/null

# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --query 'Configuration.FunctionArn' \
    --output text)

# Set up Lambda integration for POST
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $REGION 2>/dev/null

# Set up Lambda integration for OPTIONS
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $REGION 2>/dev/null

# Add Lambda permission for API Gateway
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
SOURCE_ARN="arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/POST/feedback"

aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id apigateway-post \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn $SOURCE_ARN \
    --region $REGION 2>/dev/null

aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id apigateway-options \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/OPTIONS/feedback" \
    --region $REGION 2>/dev/null

# Deploy API
echo "🚀 Deploying API..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --region $REGION

# Clean up
rm lambda-deployment.zip

# Output the API endpoint
API_ENDPOINT="https://$API_ID.execute-api.$REGION.amazonaws.com/prod/feedback"
echo ""
echo "✅ Deployment complete!"
echo "📍 API Endpoint: $API_ENDPOINT"
echo ""
echo "Add this to your app's environment config:"
echo "FEEDBACK_API_ENDPOINT='$API_ENDPOINT'"