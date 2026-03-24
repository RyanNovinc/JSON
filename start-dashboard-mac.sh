#!/bin/bash

# JSON.fit Feedback Dashboard - Mac Launcher
echo "🚀 Starting JSON.fit Feedback Dashboard..."

# Navigate to the correct directory
cd "$(dirname "$0")"

# Kill any existing processes
pkill -f "enhanced-dashboard-backend.js" 2>/dev/null || true
sleep 1

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install and configure AWS CLI first."
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

echo "✅ Starting dashboard server..."

# Start the server in background
node enhanced-dashboard-backend.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Open in browser
echo "🌐 Opening dashboard in browser..."
open "http://localhost:3000"

echo ""
echo "✅ Dashboard is running!"
echo "📊 URL: http://localhost:3000"
echo "🔧 Server PID: $SERVER_PID"
echo ""
echo "📋 Dashboard Features:"
echo "   • Real-time AWS DynamoDB data"
echo "   • Status tracking & management"
echo "   • Priority levels & filtering"
echo "   • Archive functionality"
echo "   • Bulk operations"
echo ""
echo "To stop the dashboard:"
echo "   • Close this terminal window, or"
echo "   • Press Ctrl+C"
echo ""
echo "==============================================="

# Keep the terminal open and wait for user to stop
wait $SERVER_PID