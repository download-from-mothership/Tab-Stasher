"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import FireCrawlApp from "@mendable/firecrawl-js"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

// Initialize FireCrawl with API key
const app = new FireCrawlApp({ apiKey: "fc-65d71811097a491c98800ca693d884b6" })

// Define the schema for scraped data
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

  // Initialize Supabase client
  const supabase = createClient(env().SUPABASE_URL || "", env().SUPABASE_ANON_KEY || "")

  const handleExtract = async () => {
    setLoading(true)
    setError(null)
    try {
      // Scrape the URL using FireCrawl
      const scrapeResult = await app.scrapeUrl(url, {
        formats: ["json"],
        jsonOptions: { schema: schema },
      })

      // Check if scrape was successful
      if (!scrapeResult.success) {
        throw new Error(`Failed to scrape: ${scrapeResult.error}`)
      }

      // Check if scraped data contains 'item' key
      if (scrapeResult.json && 'item' in scrapeResult.json) {
        // Set scrapedData to the entire json object
        setScrapedData(scrapeResult.json)
        setExtracted(true)

        // Get current user from Supabase
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) {
          console.error("Error getting user or user not logged in:", userError)
          setError("You must be logged in to extract items.")
          return
        }

        // Insert scraped data into Supabase
        const { data, error } = await supabase.from("scraped_items").insert({
          url: url,
          data: scrapeResult.json,
          user_id: userData.user.id,
        })

        if (error) {
          console.error("Error saving to Supabase:", error)
          setError("Failed to save extracted data.")
        }
      } else {
        throw new Error("Scraped data does not contain 'item' key")
      }
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
        <Button onClick={handleExtract} disabled={extracted || loading} variant="default">
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
                <strong>Price:</strong> {item.price || "N/A"}
              </p>
              <p>
                <strong>Description:</strong> {item.description || "No description"}
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
