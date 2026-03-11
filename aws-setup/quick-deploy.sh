#!/bin/bash

# Quick deployment - just run this one command!
echo "🚀 Quick AWS deployment starting..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Run 'aws configure' first"
    exit 1
fi

# Install dependencies and create bucket
npm install aws-sdk uuid
node aws-setup/create-s3-bucket.js

echo "✅ S3 bucket created! Now update your Lambda function name and run:"
echo "bash aws-setup/deploy.sh"