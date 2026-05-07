#!/bin/bash

# JSON.fit Share API Test Script
API_URL="https://eb6x42gp3h.execute-api.ap-southeast-2.amazonaws.com"

echo "🧪 Testing JSON.fit Share API"
echo "API URL: $API_URL"
echo ""

# Test 1: Create a share
echo "📤 Test 1: Creating a share..."
RESPONSE=$(curl -s -X POST \
  "$API_URL/shares" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sample Workout Plan",
    "exercises": [
      {"name": "Push-ups", "sets": 3, "reps": 10},
      {"name": "Squats", "sets": 3, "reps": 15},
      {"name": "Lunges", "sets": 2, "reps": 12}
    ],
    "metadata": {
      "duration": 45,
      "difficulty": "beginner",
      "equipment": "bodyweight"
    }
  }')

echo "Response: $RESPONSE"
SHARE_ID=$(echo $RESPONSE | jq -r '.shareId')
echo "Share ID: $SHARE_ID"
echo ""

# Test 2: Retrieve the share
echo "📥 Test 2: Retrieving the share..."
curl -s -X GET "$API_URL/shares/$SHARE_ID" | jq '.'
echo ""

# Test 3: Test invalid share ID
echo "❌ Test 3: Testing invalid share ID..."
curl -s -X GET "$API_URL/shares/invalid123" | jq '.'
echo ""

# Test 4: Test invalid JSON
echo "🚫 Test 4: Testing invalid JSON..."
curl -s -X POST \
  "$API_URL/shares" \
  -H "Content-Type: application/json" \
  -d 'invalid json' | jq '.'
echo ""

# Test 5: Test large payload
echo "📊 Test 5: Testing large payload (should succeed)..."
LARGE_PAYLOAD=$(cat << 'EOF'
{
  "name": "Complex Workout Plan",
  "exercises": [
EOF

# Add 100 exercises to test size limits
for i in {1..100}; do
    LARGE_PAYLOAD="$LARGE_PAYLOAD{\"name\": \"Exercise $i\", \"sets\": 3, \"reps\": 10},"
done
# Remove trailing comma and close
LARGE_PAYLOAD="${LARGE_PAYLOAD%,}]}"

curl -s -X POST \
  "$API_URL/shares" \
  -H "Content-Type: application/json" \
  -d "$LARGE_PAYLOAD" | jq '.'

echo ""
echo "✅ API tests completed!"