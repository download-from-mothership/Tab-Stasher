import { config } from './config'
import FireCrawlApp from '@mendable/firecrawl-js'
import type { ScrapeResponse } from '@mendable/firecrawl-js'

const app = new FireCrawlApp({ apiKey: config.firecrawl.apiKey })

export interface FirecrawlResponse {
  title?: string | null
  description?: string | null
  image?: string | null
  favicon?: string | null
  error?: string
  content?: string | null
  metadata?: {
    title?: string | null
    description?: string | null
    image?: string | null
    favicon?: string | null
    'og:url'?: string
    'og:image:width'?: string
    'og:price:currency'?: string
    'twitter:title'?: string
    [key: string]: string | null | undefined
  }
}

export async function fetchUrlMetadata(url: string): Promise<FirecrawlResponse> {
  try {
    if (!config.firecrawl.apiKey) {
      console.error('Firecrawl API key missing')
      throw new Error('Firecrawl API key is not configured')
    }

    console.log('Fetching metadata for URL:', url)
    console.log('Using Firecrawl base URL:', config.firecrawl.baseUrl)

    const endpoint = `${config.firecrawl.baseUrl}/v1/metadata?url=${encodeURIComponent(url)}`
    console.log('Full metadata endpoint:', endpoint)

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${config.firecrawl.apiKey}`,
        'Accept': 'application/json',
      },
    })

    console.log('Metadata response status:', response.status)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Metadata response data:', data)
    
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
      console.error('Firecrawl API key missing')
      throw new Error('Firecrawl API key is not configured')
    }

    if (!app?.scrapeUrl) {
      throw new Error('Firecrawl App instance is not initialized.')
    }

    console.log('Starting URL scrape for:', url)

    const scrapeResult = await app.scrapeUrl(url, { formats: ['markdown'] }) as ScrapeResponse

    if (!scrapeResult.success) {
      throw new Error(`Failed to scrape: ${scrapeResult.error}`)
    }

    console.log('Scrape response:', scrapeResult)
    
    // Prioritize the main image selection
    const mainImage = scrapeResult.metadata?.image || 
                     scrapeResult.metadata?.['og:image'] || 
                     scrapeResult.metadata?.['twitter:image']
    
    return {
      title: scrapeResult.metadata?.title,
      description: scrapeResult.metadata?.description,
      image: mainImage,
      favicon: scrapeResult.metadata?.favicon,
      content: scrapeResult.markdown,
      metadata: scrapeResult.metadata
    }
  } catch (error) {
    console.error('Error scraping URL:', error)
    return {
      error: error instanceof Error ? error.message : 'An error occurred while scraping the URL'
    }
  }
} 