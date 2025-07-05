import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from './config'

// Initialize with timeout configuration
const genAI = new GoogleGenerativeAI(config.gemini.apiKey)

export interface GeminiResponse {
  text: string
  error?: string
}

// Helper function for timeout handling
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
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
      console.log(`Gemini API attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

async function listAvailableModels() {
  try {
    const response = await withTimeout(
      fetch(
        'https://generativelanguage.googleapis.com/v1beta/models',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.gemini.apiKey}`,
            'Content-Type': 'application/json',
          }
        }
      ),
      10000 // 10 second timeout for model listing
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

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-001",
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 1,
        topP: 0.95,
        topK: 64,
      }
    })

    const result = await retryWithBackoff(async () => {
      return await withTimeout(
        model.generateContent(prompt),
        30000 // 30 second timeout
      )
    })

    return { text: result.response.text() }
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