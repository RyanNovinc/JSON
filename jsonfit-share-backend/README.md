# JSON.fit Share Backend

Backend API for sharing workouts and meal plans via QR codes and universal links.

## Architecture

- **API Gateway HTTP API**: Cost-effective REST API for share endpoints
- **Lambda Functions**: Serverless handlers for create/get operations
- **DynamoDB**: NoSQL storage with TTL for automatic cleanup
- **Region**: ap-southeast-2 (Sydney)

## API Endpoints

**Base URL**: `https://eb6x42gp3h.execute-api.ap-southeast-2.amazonaws.com`

### POST /shares

Create a new shareable link for workout/meal plan data.

**Request**:
```bash
curl -X POST \
  https://eb6x42gp3h.execute-api.ap-southeast-2.amazonaws.com/shares \
  -H "Content-Type: application/json" \
  -d '{"name": "My Workout", "exercises": [{"name": "Push-ups", "sets": 3}]}'
```

**Response**:
```json
{
  "shareId": "MGiw8SLz",
  "expiresAt": 1780482015
}
```

**Validation**:
- Request body must be valid JSON object
- Maximum size: 200KB
- Returns 400 for invalid JSON, 413 for too large

### GET /shares/{shareId}

Retrieve shared data by ID.

**Request**:
```bash
curl -X GET \
  https://eb6x42gp3h.execute-api.ap-southeast-2.amazonaws.com/shares/MGiw8SLz
```

**Response**:
```json
{
  "shareId": "MGiw8SLz",
  "data": {"name": "My Workout", "exercises": [{"name": "Push-ups", "sets": 3}]},
  "createdAt": 1777890015,
  "expiresAt": 1780482015
}
```

**Error cases**:
- Returns 404 for non-existent or expired shares
- Returns 400 for invalid shareId format

## Share ID Format

- 8 characters, alphanumeric
- URL-safe, no ambiguous characters (excludes 0, O, 1, l, I)
- Example: `MGiw8SLz`, `3kN7jQpX`

## Data Retention

- Shares automatically expire after 30 days
- DynamoDB TTL handles cleanup automatically
- No manual deletion required

## Infrastructure

### DynamoDB Table: `jsonfit-shares`
- **Primary Key**: `shareId` (String)
- **TTL Attribute**: `expiresAt` (Number, Unix timestamp)
- **Billing**: Pay-per-request (no provisioned capacity)

### Lambda Functions
- **Runtime**: Node.js 20
- **Memory**: 256MB
- **Timeout**: 10 seconds
- **IAM**: Minimal permissions (DynamoDB read/write only)

### API Gateway
- **Type**: HTTP API (cheaper than REST API)
- **CORS**: Enabled for all origins (can be tightened later)
- **Stage**: `$default` with auto-deploy

## Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- Region: ap-southeast-2

### Deploy
```bash
cd jsonfit-share-backend
aws cloudformation deploy \
  --template-file cloudformation-template.yaml \
  --stack-name jsonfit-shares \
  --capabilities CAPABILITY_IAM \
  --region ap-southeast-2
```

### Get API URL
```bash
aws cloudformation describe-stacks \
  --stack-name jsonfit-shares \
  --region ap-southeast-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`ShareApiUrl`].OutputValue' \
  --output text
```

### Cleanup
```bash
aws cloudformation delete-stack \
  --stack-name jsonfit-shares \
  --region ap-southeast-2
```

## Testing

### Create Share
```bash
curl -X POST \
  https://eb6x42gp3h.execute-api.ap-southeast-2.amazonaws.com/shares \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Workout", "exercises": [{"name": "Push-ups", "sets": 3, "reps": 10}], "metadata": {"duration": 30}}'
```

### Retrieve Share
```bash
# Replace MGiw8SLz with actual shareId from create response
curl -X GET \
  https://eb6x42gp3h.execute-api.ap-southeast-2.amazonaws.com/shares/MGiw8SLz
```

### Test Error Cases
```bash
# Invalid shareId (returns 404)
curl -X GET \
  https://eb6x42gp3h.execute-api.ap-southeast-2.amazonaws.com/shares/invalid123

# Invalid JSON (returns 400)
curl -X POST \
  https://eb6x42gp3h.execute-api.ap-southeast-2.amazonaws.com/shares \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```

## Security

- HTTPS enforced for all API calls
- No authentication required (public sharing by design)
- Rate limiting can be added via API Gateway throttling
- Input validation prevents malformed data
- TTL ensures automatic cleanup of old shares

## Cost Optimization

- HTTP API Gateway (cheaper than REST API)
- Pay-per-request DynamoDB (no fixed costs)
- Lambda with minimal memory allocation
- Automatic cleanup via TTL (no storage bloat)

## Future Enhancements

1. **Custom Domain**: Add custom domain for branded URLs
2. **Rate Limiting**: Implement per-IP throttling
3. **Analytics**: Add CloudWatch metrics and logging
4. **Compression**: Add gzip compression for large payloads
5. **CDN**: Add CloudFront for global distribution