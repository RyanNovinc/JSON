const AWS = require('aws-sdk');
const OpenAI = require('openai');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Initialize AWS services
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Check if this is an async invocation (from async processor)
  const isAsync = event.jobId !== undefined;
  let videoUrl, imageUrl, userText, thumbnailUrl, jobId;
  
  try {
    if (isAsync) {
      // Direct Lambda invocation from async processor
      ({ videoUrl, imageUrl, userText, jobId } = event);
    } else {
      // API Gateway call (parse body)
      ({ videoUrl, imageUrl, userText, thumbnailUrl } = JSON.parse(event.body || '{}'));
    }
    
    if (!videoUrl && !imageUrl && !userText) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
        },
        body: JSON.stringify({ 
          error: 'At least one input (video URL, image URL, or user text) is required' 
        })
      };
    }

    let audioTranscript = '';
    let tempVideoPath = '';
    
    if (videoUrl) {
      console.log('Processing video:', videoUrl);
      
      // Download video file from S3
      const videoBuffer = await downloadFileFromS3(videoUrl);
      
      // Process video with OpenAI Whisper (MP4 videos are supported)
      tempVideoPath = `/tmp/video_${Date.now()}.mp4`;
      fs.writeFileSync(tempVideoPath, videoBuffer);
      
      console.log('Transcribing audio from video with Whisper...');
      audioTranscript = await transcribeAudio(tempVideoPath);
    }
    
    let imageText = '';
    if (imageUrl) {
      console.log('Processing image with Vision...');
      imageText = await extractTextFromImage(imageUrl);
    }
    
    console.log('Generating recipe with GPT-4...');
    const recipe = await generateRecipe(audioTranscript, imageText, userText || '');
    
    // Clean up temp files
    if (tempVideoPath && fs.existsSync(tempVideoPath)) {
      fs.unlinkSync(tempVideoPath);
    }
    
    const result = {
      success: true,
      recipe: recipe,
      processing_info: {
        audio_transcript: audioTranscript?.substring(0, 100) + '...',
        image_text: imageText?.substring(0, 100) + '...',
        user_text: userText?.substring(0, 100) + '...'
      }
    };
    
    // Handle async vs sync responses
    if (isAsync) {
      // Update DynamoDB job status
      await dynamodb.update({
        TableName: 'video-recipe-jobs',
        Key: { jobId },
        UpdateExpression: 'SET #status = :status, #result = :result, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#result': 'result',
          '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
          ':status': 'completed',
          ':result': result,
          ':updatedAt': new Date().toISOString()
        }
      }).promise();
      
      return { success: true }; // Lambda invocation response
    } else {
      // Return HTTP response for API Gateway
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
        },
        body: JSON.stringify(result)
      };
    }

  } catch (error) {
    console.error('Error processing recipe:', error);
    
    // Handle async vs sync error responses
    if (isAsync && jobId) {
      // Update DynamoDB job status to failed
      try {
        await dynamodb.update({
          TableName: 'video-recipe-jobs',
          Key: { jobId },
          UpdateExpression: 'SET #status = :status, #error = :error, #updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#error': 'error',
            '#updatedAt': 'updatedAt'
          },
          ExpressionAttributeValues: {
            ':status': 'failed',
            ':error': error.message,
            ':updatedAt': new Date().toISOString()
          }
        }).promise();
      } catch (dbError) {
        console.error('Failed to update job status:', dbError);
      }
      
      return { success: false, error: error.message }; // Lambda invocation response
    } else {
      // Return HTTP error response for API Gateway
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
        },
        body: JSON.stringify({ 
          error: 'Failed to process recipe',
          details: error.message 
        })
      };
    }
  }
};

async function downloadFileFromS3(s3Url) {
  // Parse S3 URL to get bucket and key
  // Format: https://bucket.s3.region.amazonaws.com/key
  const urlParts = s3Url.replace('https://', '').split('/');
  const bucket = urlParts[0].split('.s3.')[0]; // Get bucket name before .s3.
  const key = urlParts.slice(1).join('/');
  
  console.log(`Downloading from S3: bucket=${bucket}, key=${key}`);
  
  const params = {
    Bucket: bucket,
    Key: key
  };
  
  const data = await s3.getObject(params).promise();
  return data.Body;
}

async function transcribeAudio(videoFilePath) {
  try {
    console.log('File stats:', fs.statSync(videoFilePath));
    const fileStats = fs.statSync(videoFilePath);
    console.log('File size:', fileStats.size, 'bytes');
    
    // Check file size limit (25MB)
    if (fileStats.size > 25 * 1024 * 1024) {
      throw new Error('Video file exceeds 25MB limit for Whisper API');
    }
    
    console.log('Using fs.createReadStream with OpenAI SDK...');
    
    // Debug the file by reading first few bytes to check format
    const fileBuffer = fs.readFileSync(videoFilePath);
    const firstBytes = fileBuffer.slice(0, 20);
    console.log('First 20 bytes:', firstBytes);
    console.log('File magic bytes (hex):', firstBytes.toString('hex'));
    console.log('File magic bytes (ascii):', firstBytes.toString('ascii', 4, 8)); // MP4 should show 'ftyp'
    
    // Based on research - MP4/AAC codec issues with Whisper API are common
    // Try renaming to MP3 which often works better
    console.log('Attempting MP3 format workaround for codec issues...');
    
    const mp3Path = videoFilePath.replace('.mp4', '.mp3');
    fs.copyFileSync(videoFilePath, mp3Path);
    
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(mp3Path),
      model: 'whisper-1',
      language: 'en'
    });
    
    console.log('MP3 format workaround successful!');
    
    // Clean up
    if (fs.existsSync(mp3Path)) {
      fs.unlinkSync(mp3Path);
    }
    
    console.log('Whisper transcription completed. Length:', response.text?.length || 0);
    console.log('Transcription preview:', response.text?.substring(0, 200) || 'No text extracted');
    return response.text || 'No audio content detected';
    
  } catch (error) {
    console.error('Whisper transcription error:', error);
    return 'Unable to transcribe audio';
  }
}

async function extractTextFromImage(imageUrl) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Extract all text from this image, especially any recipe information, ingredients, or cooking instructions. Return only the extracted text." 
            },
            { 
              type: "image_url", 
              image_url: { url: imageUrl } 
            }
          ]
        }
      ],
      max_tokens: 500
    });
    
    console.log('Vision text extraction completed');
    return response.choices[0].message.content;
    
  } catch (error) {
    console.error('Vision text extraction error:', error);
    return '';
  }
}

async function generateRecipe(audioTranscript, imageText, userText) {
  try {
    const combinedContent = [
      audioTranscript && `AUDIO TRANSCRIPT: ${audioTranscript}`,
      imageText && `IMAGE TEXT: ${imageText}`,
      userText && `USER NOTES: ${userText}`
    ].filter(Boolean).join('\n\n');
    
    console.log('Combined content for recipe generation:', combinedContent.substring(0, 500));
    
    const prompt = `
Extract a recipe from the following content. ONLY use information that is explicitly provided in the content below. DO NOT make up or invent any details. If information is missing, use null values.

Return the recipe in this exact JSON format:

{
  "name": "Recipe Name",
  "description": "Brief description of the recipe",
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "difficulty": "easy|medium|hard",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": "2",
      "unit": "cups",
      "category": "protein|dairy|grains|vegetables|fruits|pantry|spices|frozen|other"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "instruction": "Detailed instruction step",
      "duration": 5
    }
  ],
  "nutritionInfo": {
    "calories": 350,
    "protein": 25,
    "carbs": 30,
    "fat": 15,
    "fiber": 5,
    "sugar": 8,
    "sodium": 400
  },
  "tags": ["tag1", "tag2"]
}

Content to analyze:
${combinedContent}

Extract the recipe information and respond with ONLY the JSON object, no additional text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });
    
    const recipeText = response.choices[0].message.content;
    console.log('Recipe generation completed');
    
    // Try to parse the JSON response
    try {
      const recipe = JSON.parse(recipeText);
      
      // Add required fields for your app
      recipe.id = Date.now().toString();
      recipe.type = 'dinner';
      recipe.time = new Date().toISOString();
      recipe.isFavorite = true;
      recipe.rating = null;
      recipe.youtubeSearchQuery = '';
      recipe.youtubeVideoId = '';
      
      // Format ingredients for your app structure
      recipe.ingredients = recipe.ingredients.map((ing, index) => ({
        id: `${Date.now()}_${index}`,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        category: ing.category || 'other',
        estimatedCost: 0,
        isOptional: false
      }));
      
      // Format instructions for your app structure
      recipe.instructions = recipe.instructions.map((inst, index) => ({
        step: inst.step,
        instruction: inst.instruction,
        duration: inst.duration || 0,
        temperature: null
      }));
      
      return recipe;
      
    } catch (parseError) {
      console.error('Failed to parse recipe JSON:', parseError);
      
      // Return a fallback recipe with the raw text
      return {
        id: Date.now().toString(),
        name: 'AI Extracted Recipe',
        description: 'Recipe extracted from video content',
        type: 'dinner',
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 'medium',
        nutritionInfo: {
          calories: 350,
          protein: 20,
          carbs: 30,
          fat: 15,
          fiber: 5,
          sugar: 8,
          sodium: 400
        },
        ingredients: [
          {
            id: '1',
            name: 'Ingredients extracted from content',
            amount: 'See',
            unit: 'description',
            category: 'other',
            estimatedCost: 0,
            isOptional: false
          }
        ],
        instructions: [
          {
            step: 1,
            instruction: `Recipe content: ${recipeText.substring(0, 500)}...`,
            duration: 0,
            temperature: null
          }
        ],
        tags: ['ai-extracted'],
        time: new Date().toISOString(),
        isFavorite: true,
        rating: null,
        youtubeSearchQuery: '',
        youtubeVideoId: ''
      };
    }
    
  } catch (error) {
    console.error('Recipe generation error:', error);
    throw error;
  }
}