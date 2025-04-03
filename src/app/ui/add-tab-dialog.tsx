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
import { supabase } from "@/lib/supabase"
import { config } from "@/lib/config"

interface ScrapedData {
  url: string
  markdown?: string | null
  metadata: {
    title?: string | null
    description?: string | null
    image?: string | null
    favicon?: string | null
    'og:image'?: string | null
    'twitter:image'?: string | null
    [key: string]: string | null | undefined
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
        setIsProcessing(false)
        setIsLoading(false)
        return
      }

      // Store scraped data temporarily
      const data: ScrapedData = {
        url,
        markdown: result.content,
        metadata: {
          title: result.title || result.metadata?.title || null,
          description: result.description || result.metadata?.description || null,
          image: result.image || null,
          favicon: result.favicon || result.metadata?.favicon || null,
          ...result.metadata
        }
      }
      setScrapedData(data)

      // Step 3: Store the tab in Supabase
      try {
        console.log('Sending tab data:', {
          url: data.url,
          title: data.metadata.title || 'Untitled',
          description: data.metadata.description || null,
          image: data.metadata.image || null,
          favicon: data.metadata.favicon || null,
          content: data.markdown || null,
        })

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
        const response = await fetch(`${baseUrl}/api/tabs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: data.url,
            title: data.metadata.title || 'Untitled',
            description: data.metadata.description || null,
            image: data.metadata.image || null,
            favicon: data.metadata.favicon || null,
            content: data.markdown || null,
            tags: [], // TODO: Add tag support
          }),
        })

        if (!response.ok) {
          const responseText = await response.text()
          console.error('Error response:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText
          })
          
          let errorMessage: string
          try {
            const errorData = JSON.parse(responseText)
            errorMessage = errorData.error || 'Failed to create tab'
          } catch (e) {
            console.error('Error parsing error response:', e)
            errorMessage = 'Failed to create tab'
          }
          
          throw new Error(errorMessage)
        }

        const newTab = await response.json()
        console.log('Successfully created tab:', newTab)
        toast.success("Tab added successfully!")
        setIsProcessing(false)
        handleClose()
      } catch (error) {
        console.error('Error creating tab:', error)
        toast.error(error instanceof Error ? error.message : "Failed to add tab. Please try again.")
        setIsProcessing(false)
      }
    } catch (error) {
      toast.error("Failed to add tab. Please try again.")
      console.error(error)
      setIsProcessing(false)
      setIsLoading(false)
      setScrapedData(null)
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
      <DialogContent className="sm:max-w-[725px]">
        <DialogHeader>
          <DialogTitle>Add New Tab</DialogTitle>
          <DialogDescription>
            Enter a URL to add it to your tab collection.
          </DialogDescription>
        </DialogHeader>

        {!scrapedData ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-8">
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>
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
              title={scrapedData.metadata.title || ""}
              images={scrapedData.metadata.image ? [scrapedData.metadata.image] : []}
              description={scrapedData.metadata.description || ""}
              favicon={scrapedData.metadata.favicon || undefined}
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