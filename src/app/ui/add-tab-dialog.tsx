"use client"

import * as React from "react"
import { Button } from "@/app/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/ui/dialog"
import { Input } from "@/app/ui/input"
import { Plus, Loader2 } from "lucide-react"
import { scrapeUrl } from "@/lib/firecrawl"
import { extractTitle } from "@/lib/gemini"
import { TabCard } from "@/app/ui/tab-card"
import { toast } from "sonner"

interface ScrapedData {
  url: string
  markdown?: string
  metadata: {
    title?: string | null
    description?: string | null
    image?: string | null
    favicon?: string | null
  }
}

export function AddTabDialog() {
  const [url, setUrl] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [scrapedData, setScrapedData] = React.useState<ScrapedData | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setScrapedData(null)
    setIsProcessing(true)

    try {
      // Step 1: Scrape the URL content and metadata
      const result = await scrapeUrl(url)
      
      if (result.error) {
        toast.error(result.error)
        return
      }

      // Store scraped data temporarily
      const data: ScrapedData = {
        url,
        markdown: result.content,
        metadata: {
          title: result.title,
          description: result.description,
          image: result.image,
          favicon: result.favicon,
        }
      }
      setScrapedData(data)

      // Step 2: Use Gemini to extract a title from the markdown
      if (data.markdown) {
        const titleResult = await extractTitle(data.markdown)
        if (!titleResult.error) {
          data.metadata.title = titleResult.text
          setScrapedData({ ...data, metadata: { ...data.metadata, title: titleResult.text } })
        }
      }

      // Step 3: Store the tab in Supabase
      const response = await fetch('/api/tabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: data.url,
          title: data.metadata.title || null,
          description: data.metadata.description || null,
          image: data.metadata.image || null,
          favicon: data.metadata.favicon || null,
          content: data.markdown || null,
          tags: [], // TODO: Add tag support
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create tab')
      }

      toast.success("Tab added successfully!")
      setIsProcessing(false)
    } catch (error) {
      toast.error("Failed to add tab. Please try again.")
      console.error(error)
      setIsProcessing(false)
      setScrapedData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setUrl("")
    setScrapedData(null)
    setIsProcessing(false)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Tab
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Tab</DialogTitle>
          <DialogDescription>
            Enter a URL to add it to your tab collection.
          </DialogDescription>
        </DialogHeader>

        {!scrapedData ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={isLoading}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Add Tab'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <TabCard
              title={scrapedData.metadata.title}
              images={scrapedData.metadata.image ? [scrapedData.metadata.image] : []}
              description={scrapedData.metadata.description}
              favicon={scrapedData.metadata.favicon}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Close
              </Button>
              {isProcessing && (
                <Button disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 