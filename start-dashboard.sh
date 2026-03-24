#!/bin/bash

# JSON.fit Feedback Dashboard Startup Script
echo "🚀 Starting JSON.fit Feedback Dashboard..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install and configure AWS CLI first."
    exit 1
fi

# Test AWS connection
echo "🔍 Testing AWS connection..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured properly. Run 'aws configure' first."
    exit 1
fi

echo "✅ AWS connection verified"

# Install required dependencies
echo "📦 Installing dependencies..."
npm install express

# Check if port 3000 is available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 is already in use. Stopping existing process..."
    pkill -f "node.*aws-dashboard-backend.js" 2>/dev/null || true
    sleep 2
fi

echo "🌟 Starting dashboard server..."
echo ""
echo "📊 Dashboard will be available at: http://localhost:3000"
echo "🔧 API endpoints:"
echo "   • GET /api/tables - List all DynamoDB tables"
echo "   • GET /api/dynamodb/:tableName - Get data from table"
echo "   • GET /api/test-aws - Test AWS connection"
echo ""
echo "Press Ctrl+C to stop the server"
echo "======================================"

# Start the server
node aws-dashboard-backend.js