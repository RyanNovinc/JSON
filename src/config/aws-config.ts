// AWS Configuration for Video Recipe Processing
export const AWS_CONFIG = {
  region: 'ap-southeast-2',
  // Add your AWS credentials here
  // For production, use environment variables or secure credential storage
  accessKeyId: 'YOUR_AWS_ACCESS_KEY_ID',
  secretAccessKey: 'YOUR_AWS_SECRET_ACCESS_KEY',
  bucketName: 'video-recipes-ryan-temp-2026',
  apiEndpoint: 'https://rlebs0tr34.execute-api.ap-southeast-2.amazonaws.com/prod/process'
};

// Note: In production, you should:
// 1. Use environment variables
// 2. Use AWS Cognito for user authentication
// 3. Use temporary credentials with STS
// 4. Never commit credentials to version control