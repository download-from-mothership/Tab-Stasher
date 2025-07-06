import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { default: FireCrawlApp } = await import('@mendable/firecrawl-js')
  
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'FIRECRAWL_API_KEY environment variable is not configured' },
      { status: 500 }
    )
  }

  const app = new FireCrawlApp({ apiKey })

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

    console.log('/api/scrape-url - scrapeResult (full):', JSON.stringify(scrapeResult, null, 2))

    if (!scrapeResult.success) {
      throw new Error(`Failed to scrape: ${scrapeResult.error}`)
    }

    console.log('/api/scrape-url - scrapeResult.markdown:', scrapeResult.markdown)
    console.log('/api/scrape-url - scrapeResult.html:', scrapeResult.html)
    console.log('/api/scrape-url - scrapeResult.metadata:', scrapeResult.metadata)

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