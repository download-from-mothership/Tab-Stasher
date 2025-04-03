import { GoogleGenAI } from '@google/genai'
import { config } from './config'

const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey })

export interface GeminiResponse {
  text: string
  error?: string
}

async function listAvailableModels() {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.gemini.apiKey}`,
          'Content-Type': 'application/json',
        }
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to list models: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Available models:', JSON.stringify(data, null, 2))
    return data.models || []
  } catch (error) {
    console.error('Error listing models:', error)
    return []
  }
}

async function makeGeminiRequest(prompt: string): Promise<GeminiResponse> {
  try {
    if (!config.gemini.apiKey) {
      throw new Error('Gemini API key is not configured')
    }

    const response = await ai.models.generateContent({
      model: "gemini-pro",
      contents: prompt,
      config: {
        maxOutputTokens: 2048,
        temperature: 1,
        topP: 0.95,
        topK: 64,
      }
    })

    return { text: response.text }
  } catch (error) {
    console.error('Error making Gemini request:', error)
    return {
      text: '',
      error: error instanceof Error ? error.message : 'An error occurred while generating text'
    }
  }
}

export async function generateText(prompt: string): Promise<GeminiResponse> {
  return makeGeminiRequest(prompt)
}

export async function analyzeUrl(url: string): Promise<GeminiResponse> {
  const prompt = `Analyze this URL and provide a brief summary of what it contains: ${url}`
  return makeGeminiRequest(prompt)
}

export async function suggestTags(url: string): Promise<string[]> {
  try {
    const prompt = `Given this URL: ${url}, suggest 3-5 relevant tags or categories for organizing it. 
    Return only the tags separated by commas, without any additional text or explanation.`
    
    const { text } = await makeGeminiRequest(prompt)
    return text.split(',').map(tag => tag.trim()).filter(Boolean)
  } catch (error) {
    console.error('Error suggesting tags:', error)
    return []
  }
}

export async function extractTitle(markdown: string): Promise<GeminiResponse> {
  const prompt = `Given the following webpage content in markdown format, suggest a concise and descriptive title that best represents the main topic or purpose of the page. Return ONLY the title, nothing else.

Content:
${markdown}`

  return makeGeminiRequest(prompt)
} 