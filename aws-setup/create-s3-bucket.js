const AWS = require('aws-sdk');

// Configure AWS SDK for Sydney region
AWS.config.update({
  region: 'ap-southeast-2'
});

const s3 = new AWS.S3();
const iam = new AWS.IAM();

// Bucket configuration
const BUCKET_NAME = 'workout-app-testimonial-images';
const REGION = 'ap-southeast-2';

async function createS3Bucket() {
  try {
    console.log('Creating S3 bucket for testimonial images...');
    
    // Create the bucket
    const bucketParams = {
      Bucket: BUCKET_NAME,
      CreateBucketConfiguration: {
        LocationConstraint: REGION
      }
    };
    
    await s3.createBucket(bucketParams).promise();
    console.log(`✅ Bucket ${BUCKET_NAME} created successfully`);
    
    // Configure bucket versioning
    await s3.putBucketVersioning({
      Bucket: BUCKET_NAME,
      VersioningConfiguration: {
        Status: 'Enabled'
      }
    }).promise();
    console.log('✅ Bucket versioning enabled');
    
    // Configure lifecycle policy to delete old versions after 30 days
    const lifecycleParams = {
      Bucket: BUCKET_NAME,
      LifecycleConfiguration: {
        Rules: [{
          ID: 'DeleteOldVersions',
          Status: 'Enabled',
          NoncurrentVersionExpiration: {
            NoncurrentDays: 30
          }
        }]
      }
    };
    
    await s3.putBucketLifecycleConfiguration(lifecycleParams).promise();
    console.log('✅ Lifecycle policy configured');
    
    // Configure CORS for React Native uploads
    const corsParams = {
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [{
          AllowedHeaders: ['*'],
          AllowedMethods: ['PUT', 'POST', 'DELETE', 'GET'],
          AllowedOrigins: ['*'],
          MaxAgeSeconds: 3000
        }]
      }
    };
    
    await s3.putBucketCors(corsParams).promise();
    console.log('✅ CORS configuration applied');
    
    // Configure bucket policy for presigned URL access
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowPresignedUploads',
          Effect: 'Allow',
          Principal: {
            AWS: `arn:aws:iam::${await getAccountId()}:role/workout-app-lambda-role`
          },
          Action: [
            's3:PutObject',
            's3:GetObject',
            's3:DeleteObject'
          ],
          Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
        }
      ]
    };
    
    await s3.putBucketPolicy({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(bucketPolicy)
    }).promise();
    console.log('✅ Bucket policy configured');
    
    // Configure server-side encryption
    await s3.putBucketEncryption({
      Bucket: BUCKET_NAME,
      ServerSideEncryptionConfiguration: {
        Rules: [{
          ApplyServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256'
          }
        }]
      }
    }).promise();
    console.log('✅ Server-side encryption enabled');
    
    console.log('\n🎉 S3 bucket setup complete!');
    console.log(`Bucket Name: ${BUCKET_NAME}`);
    console.log(`Region: ${REGION}`);
    console.log(`Bucket URL: https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com`);
    
    return BUCKET_NAME;
    
  } catch (error) {
    if (error.code === 'BucketAlreadyExists') {
      console.log('⚠️  Bucket already exists, configuring existing bucket...');
      return configureBucketSettings();
    } else if (error.code === 'BucketAlreadyOwnedByYou') {
      console.log('ℹ️  Bucket already owned by you, updating configuration...');
      return configureBucketSettings();
    } else {
      console.error('❌ Error creating S3 bucket:', error);
      throw error;
    }
  }
}

async function configureBucketSettings() {
  try {
    console.log('Configuring existing bucket settings...');
    
    // Update CORS
    const corsParams = {
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [{
          AllowedHeaders: ['*'],
          AllowedMethods: ['PUT', 'POST', 'DELETE', 'GET'],
          AllowedOrigins: ['*'],
          MaxAgeSeconds: 3000
        }]
      }
    };
    
    await s3.putBucketCors(corsParams).promise();
    console.log('✅ CORS configuration updated');
    
    return BUCKET_NAME;
  } catch (error) {
    console.error('❌ Error configuring bucket:', error);
    throw error;
  }
}

async function getAccountId() {
  try {
    const identity = await new AWS.STS().getCallerIdentity().promise();
    return identity.Account;
  } catch (error) {
    console.warn('Could not get account ID, using wildcard in policy');
    return '*';
  }
}

// Run the setup
if (require.main === module) {
  createS3Bucket()
    .then(() => {
      console.log('\n📝 Next steps:');
      console.log('1. Update your Lambda function with the presigned URL code');
      console.log('2. Add the S3 bucket name to your environment variables');
      console.log('3. Test image uploads from your React Native app');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createS3Bucket, BUCKET_NAME, REGION };