import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'


// Helper function to create a fetch with timeout
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

// Helper function for exponential backoff retry
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

export async function POST(request: Request) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY environment variable is not configured' },
      { status: 500 }
    )
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  try {
    const { url, markdownContent } = await request.json()

    if (!url || !markdownContent) {
      return NextResponse.json(
        { error: 'URL and Markdown content are required' },
        { status: 400 }
      )
    }

    const prompt = `Analyze the following Markdown content from the provided URL and categorize it into a hierarchical structure.

Extract a concise title (max 60 characters) that accurately represents the item described in the content.

Identify a relevant image URL (if present) that is the primary image representing the item. If no suitable image URL is found, indicate "null".

Categorize the content into a hierarchical structure:
1. Primary category: Choose from these main categories: "clothing", "shoes", "homegoods", "electronics", "books", "food", "beauty", "sports", "automotive", "pets", "garden", "office", "toys", "health", "jewelry", "art", "music", "tools", "outdoor", "kitchen"
2. Secondary category: Provide a specific subcategory (e.g., "dresses", "tops", "bottoms" for clothing; "heels", "flats", "sneakers" for shoes)
3. Confidence score: Rate your confidence in the categorization (0.0 to 1.0)

Generate 3-4 single-word tags that represent key attributes. These should be general categories or key features (e.g., "portable", "durable", "wireless"). All tags should be in lowercase.

Respond with a JSON object in the following format:

\`\`\`json
{
  "title": "extracted title",
  "image": "image URL or null",
  "tags": ["tag1", "tag2", "tag3"],
  "primaryCategory": "clothing",
  "secondaryCategory": "dresses",
  "confidence": 0.92
}
\`\`\`

Markdown Content:
${markdownContent}
URL: ${url}
`;

    console.log('Attempting to call Gemini API...')
    
    // Test basic network connectivity first
    try {
      const testResponse = await fetchWithTimeout('https://httpbin.org/get', {}, 5000)
      console.log('Basic network test successful:', testResponse.status)
    } catch (testError) {
      console.error('Basic network test failed:', testError)
    }
    
    // Try direct fetch with timeout and retry logic
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent`
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }
    
    console.log('Making direct fetch request to Gemini API with timeout...')
    let result;
    
    try {
      const response = await retryWithBackoff(async () => {
        return await fetchWithTimeout(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(requestBody)
        }, 30000) // 30 second timeout
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }
      
      const responseData = await response.json()
      console.log('Direct fetch successful')
      result = { response: { text: () => responseData.candidates[0].content.parts[0].text } }
    } catch (apiError: any) {
      console.error('Direct fetch failed after retries:', apiError)
      console.error('Error details:', {
        message: apiError.message,
        name: apiError.name,
        stack: apiError.stack
      })
      
      // Try using the SDK as fallback
      console.log('Attempting fallback with Gemini SDK...')
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" })
        const sdkResult = await retryWithBackoff(async () => {
          return await model.generateContent(prompt)
        })
        result = sdkResult
        console.log('SDK fallback successful')
      } catch (sdkError: any) {
        console.error('SDK fallback also failed:', sdkError)
        throw new Error(`Gemini API failed: ${apiError.message}. SDK fallback also failed: ${sdkError.message}`)
      }
    }

    let responseText = result.response?.text();

    if (!responseText) {
      return NextResponse.json({ error: 'Failed to get a response from Gemini' }, { status: 500 })
    }
    
    console.log('/api/analyze-content - Raw Gemini Response:', responseText);  //  Log the raw response

    try {
      let analysis;

      // 1. Trim whitespace and newlines
      responseText = responseText.trim();

      // 2. Remove any leading or trailing non-JSON characters (e.g., extra text, code blocks)
      responseText = responseText.replace(/^[^\{]*\{/, '{').replace(/\}[^}]*$/, '}');

      // 3. Replace single quotes with double quotes (if necessary) -  Be cautious with this, might break valid JSON
      // responseText = responseText.replace(/'/g, '"');

      try {
        analysis = JSON.parse(responseText); //  First try direct parsing
      } catch (e) {
        // If direct parsing fails, try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/); //  Find the first JSON-like block
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not extract valid JSON from Gemini response');
        }
      }

      console.log('/api/analyze-content - Parsed Analysis:', JSON.stringify(analysis, null, 2));  //  Log the parsed analysis

      if (!analysis.title || !Array.isArray(analysis.tags)) {
        throw new Error('Invalid response format from Gemini');
      }

      // Validate categorization fields
      if (!analysis.primaryCategory || !analysis.secondaryCategory || typeof analysis.confidence !== 'number') {
        console.warn('Missing categorization fields, using defaults');
        analysis.primaryCategory = analysis.primaryCategory || 'uncategorized';
        analysis.secondaryCategory = analysis.secondaryCategory || 'general';
        analysis.confidence = analysis.confidence || 0.5;
      }

      const responseData = {
        title: analysis.title,
        image: analysis.image,
        tags: analysis.tags,
        primaryCategory: analysis.primaryCategory,
        secondaryCategory: analysis.secondaryCategory,
        confidence: analysis.confidence
      };

      console.log('/api/analyze-content - Final response to frontend:', JSON.stringify(responseData, null, 2));  //  Log the final response

      return NextResponse.json(responseData);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      return NextResponse.json({ error: 'Failed to parse Gemini response' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error analyzing Markdown content:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze Markdown content' },
      { status: 500 }
    )
  }
} 