"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import FireCrawlApp from "@mendable/firecrawl-js"
import { z } from "zod"

const app = new FireCrawlApp({ apiKey: "fc-65d71811097a491c98800ca693d884b6" })

const schema = z.object({
  item: z.array(
    z.object({
      price: z.string().optional(),
      description: z.string().optional(),
      photos: z.array(z.string()).optional(),
    }),
  ),
  is_open_source: z.boolean(),
})

interface ExtractItemProps {
  url: string
}

export function ExtractItem({ url }: ExtractItemProps) {
  const [extracted, setExtracted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scrapedData, setScrapedData] = useState<any>(null)

  const handleExtract = async () => {
    setLoading(true)
    setError(null)
    try {
      const scrapeResult = await app.scrapeUrl([url], {
        prompt:
          "Extract item price, item description, and item photos. Ensure that each item has a price and description.",
        formats: ["json"],
        jsonOptions: { schema: schema },
      })

      if (!scrapeResult.success) {
        throw new Error(`Failed to scrape: ${scrapeResult.error}`)
      }

      setScrapedData(scrapeResult.data)
      setExtracted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during extraction")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col p-4 bg-[#F5F5F7] dark:bg-neutral-800 rounded-xl mb-4">
      <div className="flex items-center justify-between mb-4">
        <span className="truncate mr-4 text-neutral-600 dark:text-neutral-400">{url}</span>
        <Button
          onClick={handleExtract}
          disabled={extracted || loading}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {loading ? "Extracting..." : extracted ? "Extracted" : "Extract"}
        </Button>
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      {scrapedData && (
        <div className="mt-4">
          <h3 className="font-bold text-lg mb-2">Extracted Data:</h3>
          {scrapedData.item.map((item: any, index: number) => (
            <div key={index} className="mb-4 p-4 bg-white dark:bg-neutral-700 rounded-lg">
              <p>
                <strong>Price:</strong> {item.price}
              </p>
              <p>
                <strong>Description:</strong> {item.description}
              </p>
              {item.photos && item.photos.length > 0 && (
                <div>
                  <strong>Photos:</strong>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.photos.map((photo: string, photoIndex: number) => (
                      <img
                        key={photoIndex}
                        src={photo || "/placeholder.svg"}
                        alt={`Item photo ${photoIndex + 1}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <p>
            <strong>Is Open Source:</strong> {scrapedData.is_open_source ? "Yes" : "No"}
          </p>
        </div>
      )}
    </div>
  )
}

