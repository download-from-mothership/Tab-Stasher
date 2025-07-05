import fs from 'fs';
import path from 'path';

async function testVisualSearch() {
  console.log('Testing visual search functionality...');
  
  // Create a simple test image (1x1 pixel PNG)
  const testImagePath = path.join(__dirname, 'test-image.png');
  const testImageBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, etc.
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  fs.writeFileSync(testImagePath, testImageBuffer);
  console.log('Created test image:', testImagePath);
  
  try {
    // Test the visual search API
    const formData = new FormData();
    const imageFile = new File([testImageBuffer], 'test-image.png', { type: 'image/png' });
    formData.append('image', imageFile);
    
    console.log('Sending request to visual search API...');
    const response = await fetch('http://localhost:3000/api/v1/visual-search', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Visual search API error: ${response.status} ${errorText}`);
    }
    
    const { jobId } = await response.json();
    console.log('Received job ID:', jobId);
    
    // Poll for results
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
      const statusResponse = await fetch(`http://localhost:3000/api/v1/visual-search/${jobId}`);
      
      if (!statusResponse.ok) {
        throw new Error(`Status API error: ${statusResponse.status}`);
      }
      
      const statusData = await statusResponse.json();
      console.log('Status response:', statusData);
      
      if (statusData.status === 'completed') {
        console.log('✅ Visual search completed successfully!');
        console.log('Result:', statusData);
        break;
      } else if (statusData.status === 'failed') {
        throw new Error(`Visual search failed: ${statusData.error}`);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('⚠️  Visual search timed out');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test file
    try {
      fs.unlinkSync(testImagePath);
      console.log('Cleaned up test image');
    } catch (cleanupError) {
      console.warn('Failed to cleanup test image:', cleanupError);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testVisualSearch().catch(console.error);
}

export { testVisualSearch }; 