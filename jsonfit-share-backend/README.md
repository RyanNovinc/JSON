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

### ⛔ DO NOT RUN THE CLOUDFORMATION DEPLOY

This README used to document `aws cloudformation deploy --template-file
cloudformation-template.yaml`. **Running that command today breaks production.**

`cloudformation-template.yaml` carries the Lambda source *inline*, as CloudFormation
parameters (`Code: ZipFile: !Ref FunctionCode1`). The live stack still holds the ORIGINAL
inline code in those parameters. The live Lambdas do not run that code any more — they
were updated out of band by zip upload.

Re-running the CloudFormation deploy re-applies those stale parameters and silently
reverts `createShare` to the **30-day TTL, 200KB limit, no compression** version, undoing
the large-program share fix. It reverts `getShare` to the pre-decompression version, which
cannot read any share written after the compression change.

`sam deploy` is also **not** the deploy path. `template.yaml` has never been deployed; see
the header comment in that file.

**The deploy mechanism is zip upload.** See below.

### Deploy (zip upload — the real procedure)

Both Lambdas are configured with `Handler: index.handler`, so the zip must expose a
`handler` export from `index.js` at the **root** of the archive.

The zips are **slim** (~8 KB): `node_modules` is not shipped. The AWS SDK comes from the
Lambda runtime, which is how the live functions already run today. See `scripts/package.sh`.

**Deploy `getShare` FIRST.** Order is not optional. The new `getShare` reads both the old
plaintext `data` items and the new gzip `blob` items; the new `createShare` writes `blob`.
If `createShare` goes first it immediately starts writing blobs the live `getShare` cannot
read, and every new share link fails to import until `getShare` catches up.

```bash
cd jsonfit-share-backend
sam build                # -> .aws-sam/build/{CreateShareFunction,GetShareFunction}
./scripts/package.sh     # -> dist/*.zip  (slim, with the root index.js shim)

# 1. getShare FIRST — backward compatible, reads old AND new items
aws lambda update-function-code \
  --function-name jsonfit-getShare \
  --zip-file fileb://dist/jsonfit-getShare.zip \
  --region ap-southeast-2

# 2. then createShare — starts writing compressed blobs
aws lambda update-function-code \
  --function-name jsonfit-createShare \
  --zip-file fileb://dist/jsonfit-createShare.zip \
  --region ap-southeast-2
```

Then ship the app. Both Lambda steps are safe against the currently-released app, which
still POSTs uncompressed JSON — the new `createShare` accepts unmarked bodies. Do **not**
ship the app before step 2: the old `createShare` would store the `{enc, payload}` envelope
verbatim as the share data and corrupt every share.

No function *configuration* change is required — the shim keeps `Handler: index.handler`
valid, so a single `update-function-code` call swaps each function atomically and there is
never a window where the handler and the code disagree.

> **Runtime note:** both functions run `nodejs20.x`, which AWS deprecated on 2026-04-30 and
> blocked for updates from 2026-07-01. `update-function-code` may be rejected outright. It
> fails cleanly (nothing is applied), so it is safe to try. If it is rejected, bump the
> runtime first — and re-confirm the target runtime still provides the AWS SDK before
> deploying a slim zip.

After deploying, CloudFormation drifts further from reality. That is already true today and
is tracked in `deployed/README.md`. Reconciling the stack is a separate piece of work and
must not be bundled with a behaviour change.

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