# Gemini API Timeout Fix

## Problem
The application was experiencing `ETIMEDOUT` errors when making requests to the Gemini API. This was causing the `/api/analyze-content` endpoint to fail with connection timeouts.

## Root Cause
- No timeout configuration on fetch requests to Gemini API
- No retry logic for failed requests
- Inconsistent SDK usage between different API routes

## Solution

### 1. Added Timeout Handling
- Implemented `fetchWithTimeout` function that wraps fetch requests with configurable timeouts
- Added `withTimeout` helper for promise-based operations
- Set appropriate timeout values (30s for main requests, 15s for categorization)

### 2. Implemented Retry Logic
- Added `retryWithBackoff` function with exponential backoff
- Configurable retry attempts (default: 3) with increasing delays
- Graceful fallback to SDK when direct fetch fails

### 3. Updated API Routes
- **`/api/analyze-content/route.ts`**: Added timeout and retry logic with fallback to SDK
- **`/api/tabs/route.ts`**: Updated categorization function to use timeout and retry
- **`src/lib/gemini.ts`**: Updated to use correct SDK and added timeout handling

### 4. Configuration Updates
- Updated `src/lib/config.ts` to include Gemini API configuration
- Ensured consistent SDK usage (`@google/generative-ai`)

## Files Modified

1. `src/app/api/analyze-content/route.ts`
   - Added timeout and retry logic
   - Implemented fallback to SDK
   - Enhanced error handling

2. `src/app/api/tabs/route.ts`
   - Added timeout and retry logic for categorization
   - Updated model configuration

3. `src/lib/gemini.ts`
   - Updated to use correct SDK
   - Added timeout and retry logic
   - Improved error handling

4. `src/lib/config.ts`
   - Added Gemini API configuration

5. `scripts/test-gemini-timeout.ts` (new)
   - Test script to verify timeout and retry logic

## Testing

### Run the Test Script
```bash
# Make sure GEMINI_API_KEY is set in your environment
export GEMINI_API_KEY="your-api-key-here"

# Run the test script
npx tsx scripts/test-gemini-timeout.ts
```

### Expected Output
```
🧪 Testing Gemini API timeout and retry logic...

🌐 Testing basic network connectivity...
✅ Network connectivity test successful!

🔑 API Key found, testing Gemini connection...
📡 Testing basic Gemini API call...
✅ Gemini API test successful!
📝 Response: Hello, world!

🎉 All tests completed successfully!
```

### Manual Testing
1. Start the development server: `npm run dev`
2. Navigate to the application
3. Try adding a new tab or analyzing content
4. Check the console logs for timeout and retry messages

## Environment Variables

Make sure you have the following environment variables set:

```bash
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
FIRECRAWL_API_KEY=your-firecrawl-api-key
```

## Timeout Configuration

- **Main API requests**: 30 seconds
- **Categorization requests**: 15 seconds
- **Network connectivity tests**: 5 seconds
- **Retry attempts**: 3 with exponential backoff (1s, 2s, 4s delays)

## Error Handling

The updated code includes:
- Graceful fallback from direct fetch to SDK
- Detailed error logging
- Default values for categorization when AI fails
- Network connectivity testing before API calls

## Performance Impact

- Slightly increased latency due to timeout checks
- Better reliability with retry logic
- Reduced failed requests due to network issues
- Improved user experience with graceful degradation 