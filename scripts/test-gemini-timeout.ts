#!/usr/bin/env tsx

import { GoogleGenerativeAI } from '@google/generative-ai'

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

async function testDirectFetch() {
  console.log('🔍 Testing direct fetch to Gemini API...')
  
  const apiKey = process.env.GEMINI_API_KEY
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent'
  
  try {
    const response = await withTimeout(
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey!
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Say "Hello, world!" in one sentence.'
            }]
          }]
        })
      }),
      15000
    )
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Direct fetch successful!')
      console.log('📝 Response:', data.candidates[0].content.parts[0].text)
      return true
    } else {
      const errorText = await response.text()
      console.error('❌ Direct fetch failed:', response.status, errorText)
      return false
    }
  } catch (error) {
    console.error('❌ Direct fetch error:', error)
    return false
  }
}

async function testGeminiConnection() {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY environment variable is not set')
    process.exit(1)
  }

  console.log('🔑 API Key found, testing Gemini connection...')
  
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-001',
    generationConfig: {
      maxOutputTokens: 100,
      temperature: 0.7,
    }
  })

  const testPrompt = 'Say "Hello, world!" in one sentence.'

  try {
    console.log('📡 Testing basic Gemini API call...')
    
    const result = await retryWithBackoff(async () => {
      return await withTimeout(
        model.generateContent(testPrompt),
        10000 // 10 second timeout
      )
    })
    
    const responseText = result.response?.text()
    console.log('✅ Gemini API test successful!')
    console.log('📝 Response:', responseText)
    return true
    
  } catch (error) {
    console.error('❌ Gemini API test failed:', error)
    return false
  }
}

async function testNetworkConnectivity() {
  console.log('🌐 Testing basic network connectivity...')
  
  const testUrls = [
    'https://httpbin.org/get',
    'https://www.google.com',
    'https://generativelanguage.googleapis.com'
  ]
  
  for (const url of testUrls) {
    try {
      const response = await withTimeout(
        fetch(url),
        5000 // 5 second timeout
      )
      
      if (response.ok) {
        console.log(`✅ ${url} - OK`)
      } else {
        console.log(`⚠️  ${url} - Status: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ ${url} - Failed: ${error}`)
    }
  }
}

async function testDNSResolution() {
  console.log('🔍 Testing DNS resolution...')
  
  const domains = [
    'generativelanguage.googleapis.com',
    'googleapis.com',
    'google.com'
  ]
  
  for (const domain of domains) {
    try {
      const { execSync } = require('child_process')
      const result = execSync(`nslookup ${domain}`, { encoding: 'utf8' })
      console.log(`✅ ${domain} - Resolved`)
    } catch (error) {
      console.log(`❌ ${domain} - DNS resolution failed`)
    }
  }
}

async function main() {
  console.log('🧪 Testing Gemini API timeout and retry logic...\n')
  
  await testNetworkConnectivity()
  console.log('')
  
  await testDNSResolution()
  console.log('')
  
  const directFetchSuccess = await testDirectFetch()
  console.log('')
  
  const sdkSuccess = await testGeminiConnection()
  console.log('')
  
  if (directFetchSuccess || sdkSuccess) {
    console.log('🎉 At least one method succeeded!')
  } else {
    console.log('❌ All methods failed. This might indicate:')
    console.log('   - Network connectivity issues')
    console.log('   - API key restrictions')
    console.log('   - Regional API access problems')
    console.log('   - Firewall/proxy blocking requests')
  }
}

main().catch(console.error) 