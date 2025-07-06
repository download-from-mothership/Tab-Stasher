import { Storage } from '@google-cloud/storage';
import { config } from '../src/lib/config';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testGCSBucket() {
  console.log('Testing Google Cloud Storage bucket integration...');
  console.log('Bucket name:', config.gcs.bucket);
  
  try {
    // Initialize Google Cloud Storage
    const storage = new Storage();
    const bucket = storage.bucket(config.gcs.bucket);
    
    // Test if we can access the bucket
    const [exists] = await bucket.exists();
    
    if (exists) {
      console.log('✅ Successfully connected to bucket:', config.gcs.bucket);
      
      // List a few files to verify access
      const [files] = await bucket.getFiles({ maxResults: 5 });
      console.log(`📁 Found ${files.length} files in bucket`);
      
      if (files.length > 0) {
        console.log('Sample files:');
        files.forEach(file => {
          console.log(`  - ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
        });
      }
    } else {
      console.log('❌ Bucket does not exist or access denied:', config.gcs.bucket);
    }
    
  } catch (error) {
    console.error('❌ Error testing GCS bucket:', error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure GCS_BUCKET is set in your .env.local file');
    console.log('2. Ensure you have proper authentication set up');
    console.log('3. Check that the bucket exists and you have access to it');
  }
}

// Run the test
testGCSBucket().catch(console.error); 