"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import FireCrawlApp from "@mendable/firecrawl-js"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"

const app = new FireCrawlApp({ apiKey: "fc-65d71811097a491c98800ca693d884b6" })

const schema = z.object({
  items: z.array(z.object({
    price: z.string(),
    description: z.string(),
    photos: z.array(z.string()).optional()
  }))
})

type ExtractedItem = {
  price: string;
  description: string;
  photos?: string[];
}

export default function TabStashPage() {
  const [tabUrl, setTabUrl] = useState("")
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<{ items: ExtractedItem[] } | null>(null)
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 
        process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      setSupabase(client)
    }
  }, [])

  const handleExtract = async () => {
    if (!supabase) {
      toast.error("Unable to connect to database")
      return
    }

    setIsExtracting(true)
    setExtractionError(null)
    
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error("Authentication required")
      
      // Extract data using FireCrawl
      const scrapeResult = await app.scrapeUrl(tabUrl, {
        formats: ["json"],
        jsonOptions: { schema }
      })

      if (!scrapeResult.success || !scrapeResult.json) {
        throw new Error(`Failed to scrape: ${scrapeResult.error}`)
      }

      const items = scrapeResult.json.items
      setExtractedData({ items })

      // Save each item to Supabase
      for (const item of items) {
        const { error: insertError } = await supabase
          .from("tab_stash")
          .insert({
            url: tabUrl,
            price: item.price,
            description: item.description,
            photos: item.photos || [],
            user_id: user.id
          })

        if (insertError) {
          console.error("Error saving to Supabase:", insertError)
          toast.error("Failed to save item to your stash")
        } else {
          toast.success("Item saved to your stash!")
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during extraction"
      setExtractionError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tab Stasher</h1>
      <div className="mb-4">
        <Label htmlFor="tabUrl">Enter URL to extract</Label>
        <Input
          id="tabUrl"
          placeholder="https://example.com"
          type="url"
          value={tabUrl}
          onChange={(e) => setTabUrl(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button 
        onClick={handleExtract} 
        disabled={isExtracting || !supabase} 
        className="mb-4"
      >
        {isExtracting ? "Extracting..." : "Extract"}
      </Button>
      {!supabase && (
        <p className="text-amber-500 mb-4">
          Connecting to database...
        </p>
      )}
      {extractionError && <p className="text-red-500 mb-4">{extractionError}</p>}
      {extractedData && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Extracted Data:</h2>
          {extractedData.items.map((item: ExtractedItem, index: number) => (
            <div key={index} className="mb-4 p-4 bg-white rounded-lg shadow">
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
        </div>
      )}
    </div>
  )
}