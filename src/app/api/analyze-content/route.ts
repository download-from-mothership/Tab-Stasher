import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { url, title, content } = await request.json()

    if (!url || !content) {
      return NextResponse.json(
        { error: 'URL and content are required' },
        { status: 400 }
      )
    }

    const prompt = `Analyze this webpage content and generate:
1. A clear, concise title (max 60 chars)
2. 3-4 relevant category tags that best describe this content

Content URL: ${url}
Current title: ${title || 'Untitled'}
Content: ${content?.slice(0, 1500)}

You must respond in this exact JSON format:
{
  "title": "clear concise title",
  "tags": ["tag1", "tag2", "tag3"]
}

The tags should be single words or short phrases (max 2 words) that categorize the content. Focus on general categories like "technology", "business", "education", etc.

Remember to only respond with valid JSON, nothing else.`

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    const result = await model.generateContent(prompt)
    const response = result.response
    
    try {
      // First try to parse the response text directly
      const analysis = JSON.parse(response.text())
      
      // Validate the response structure
      if (!analysis.title || !Array.isArray(analysis.tags)) {
        throw new Error('Invalid response structure')
      }
      
      return NextResponse.json({
        title: analysis.title.slice(0, 60), // Enforce max length
        tags: analysis.tags.slice(0, 4).map(tag => tag.toLowerCase()) // Ensure consistent format
      })
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      console.log('Raw response:', response.text())
      
      // Attempt to extract JSON from the response if direct parsing fails
      const text = response.text()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      
      if (!jsonMatch) {
        throw new Error('Could not extract valid JSON from response')
      }
      
      const extractedAnalysis = JSON.parse(jsonMatch[0])
      
      return NextResponse.json({
        title: extractedAnalysis.title.slice(0, 60),
        tags: extractedAnalysis.tags.slice(0, 4).map(tag => tag.toLowerCase())
      })
    }
  } catch (error) {
    console.error('Error analyzing content:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze content' },
      { status: 500 }
    )
  }
} 