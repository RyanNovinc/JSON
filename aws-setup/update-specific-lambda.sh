#!/bin/bash

# Update the correct Lambda function: json-app-feedback-handler
echo "🎯 Updating json-app-feedback-handler function..."

FUNCTION_NAME="json-app-feedback-handler"
REGION="ap-southeast-2"

# Package the Lambda function
echo "📦 Packaging Lambda function..."
mkdir -p aws-setup/lambda-package
cp aws-setup/lambda-function-updated.js aws-setup/lambda-package/index.js

cd aws-setup/lambda-package

# Create package.json
cat > package.json << EOF
{
  "name": "json-app-feedback-handler",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "aws-sdk": "^2.1000.0",
    "uuid": "^9.0.0"
  }
}
EOF

npm install --production
zip -r ../lambda-function.zip .
cd ../..

# Update the function
echo "⚡ Updating Lambda function code..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://aws-setup/lambda-function.zip \
    --region $REGION

echo "✅ Lambda function updated successfully!"
echo "🔧 Note: You may need to add S3 permissions to the function's execution role"