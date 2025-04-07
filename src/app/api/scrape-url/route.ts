import { NextResponse } from 'next/server'
import { FireCrawlApp } from '@mendable/firecrawl-js'

if (!process.env.FIRECRAWL_API_KEY) {
  throw new Error('Missing FIRECRAWL_API_KEY environment variable')
}

const app = new FireCrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    console.log('Starting URL scrape for:', url)

    const scrapeResult = await app.scrapeUrl(url, { formats: ['markdown', 'html'] })

    if (!scrapeResult.success) {
      throw new Error(`Failed to scrape: ${scrapeResult.error}`)
    }

    // Prioritize the main image selection
    const mainImage = scrapeResult.metadata?.image || 
                     scrapeResult.metadata?.['og:image'] || 
                     scrapeResult.metadata?.['twitter:image']
    
    return NextResponse.json({
      title: scrapeResult.metadata?.title,
      description: scrapeResult.metadata?.description,
      image: mainImage,
      favicon: scrapeResult.metadata?.favicon,
      content: scrapeResult.markdown,
      metadata: scrapeResult.metadata
    })
  } catch (error) {
    console.error('Error scraping URL:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape URL' },
      { status: 500 }
    )
  }
} 