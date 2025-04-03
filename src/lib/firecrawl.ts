import { config } from './config'
import FireCrawlApp from '@mendable/firecrawl-js'

const app = new FireCrawlApp({ apiKey: config.firecrawl.apiKey })

export interface FirecrawlResponse {
  title?: string
  description?: string
  image?: string
  favicon?: string
  error?: string
  content?: string
}

export async function fetchUrlMetadata(url: string): Promise<FirecrawlResponse> {
  try {
    if (!config.firecrawl.apiKey) {
      throw new Error('Firecrawl API key is not configured')
    }

    const response = await fetch(`${config.firecrawl.baseUrl}/v1/metadata?url=${encodeURIComponent(url)}`, {
      headers: {
        'Authorization': `Bearer ${config.firecrawl.apiKey}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return {
      title: data.title,
      description: data.description,
      image: data.image,
      favicon: data.favicon,
    }
  } catch (error) {
    console.error('Error fetching URL metadata:', error)
    return {
      error: error instanceof Error ? error.message : 'An error occurred while fetching URL metadata'
    }
  }
}

export async function scrapeUrl(url: string): Promise<FirecrawlResponse> {
  try {
    if (!config.firecrawl.apiKey) {
      throw new Error('Firecrawl API key is not configured')
    }

    // First, try to get metadata
    const metadata = await fetchUrlMetadata(url)
    if (metadata.error) {
      return metadata
    }

    // Then scrape the content
    const response = await fetch(`${config.firecrawl.baseUrl}/v1/ant-set-deep-blue?url=${encodeURIComponent(url)}`, {
      headers: {
        'Authorization': `Bearer ${config.firecrawl.apiKey}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      ...metadata,
      content: data.markdown || data.content,
    }
  } catch (error) {
    console.error('Error scraping URL:', error)
    return {
      error: error instanceof Error ? error.message : 'An error occurred while scraping the URL'
    }
  }
} 