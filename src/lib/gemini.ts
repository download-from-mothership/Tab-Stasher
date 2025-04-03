import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from './config'

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(config.gemini.apiKey)
const model = genAI.getGenerativeModel({ model: config.gemini.model })

export interface GeminiResponse {
  text: string
  error?: string
}

export async function generateText(prompt: string): Promise<GeminiResponse> {
  try {
    if (!config.gemini.apiKey) {
      throw new Error('Gemini API key is not configured')
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    return { text }
  } catch (error) {
    console.error('Error generating text with Gemini:', error)
    return {
      text: '',
      error: error instanceof Error ? error.message : 'An error occurred while generating text'
    }
  }
}

export async function analyzeUrl(url: string): Promise<GeminiResponse> {
  const prompt = `Analyze this URL and provide a brief summary of what it contains: ${url}`
  return generateText(prompt)
}

export async function suggestTags(url: string): Promise<string[]> {
  try {
    const prompt = `Given this URL: ${url}, suggest 3-5 relevant tags or categories for organizing it. 
    Return only the tags separated by commas, without any additional text or explanation.`
    
    const { text } = await generateText(prompt)
    return text.split(',').map(tag => tag.trim()).filter(Boolean)
  } catch (error) {
    console.error('Error suggesting tags:', error)
    return []
  }
}

export async function extractTitle(markdown: string): Promise<GeminiResponse> {
  try {
    if (!config.gemini.apiKey) {
      throw new Error('Gemini API key is not configured')
    }

    const prompt = `Given the following webpage content in markdown format, suggest a concise and descriptive title that best represents the main topic or purpose of the page. Return ONLY the title, nothing else.

Content:
${markdown}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    return { text }
  } catch (error) {
    console.error('Error extracting title with Gemini:', error)
    return {
      text: '',
      error: error instanceof Error ? error.message : 'An error occurred while extracting title'
    }
  }
} 