import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
    
    const result = await model.generateContent(prompt)

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