import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return new NextResponse('Missing URL parameter', { status: 400 })
  }

  try {
    const response = await fetch(imageUrl)
    const buffer = await response.arrayBuffer()
    const headers = new Headers(response.headers)
    
    // Preserve content type
    const contentType = headers.get('content-type')
    if (contentType) {
      headers.set('content-type', contentType)
    }

    // Set caching headers
    headers.set('cache-control', 'public, max-age=31536000, immutable')

    return new NextResponse(buffer, {
      headers,
      status: response.status,
    })
  } catch (error) {
    console.error('Error proxying image:', error)
    return new NextResponse('Error fetching image', { status: 500 })
  }
} 