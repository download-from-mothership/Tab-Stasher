"use client"

import * as React from "react"
import { Button } from "@/app/ui/button"
import { Input } from "@/app/ui/input"
import { Plus, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { SilkCard } from "@/app/ui/silk-card"

// Tag colors for different categories
const TAG_COLORS = {
  technology: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  business: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  entertainment: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  education: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  shopping: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100",
  news: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  social: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
} as const

interface ScrapedData {
  url: string
  title: string
  image: string | null
  tags: string[]
}

export function AddTabDialog() {
  const [url, setUrl] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [scrapedData, setScrapedData] = React.useState<ScrapedData | null>(null)
  const [tagInput, setTagInput] = React.useState("")
  const [customTags, setCustomTags] = React.useState<string[]>([])

  const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim().toLowerCase()
      if (!customTags.includes(newTag) && !scrapedData?.tags.includes(newTag)) {
        setCustomTags([...customTags, newTag])
      }
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    if (customTags.includes(tag)) {
      setCustomTags(customTags.filter(t => t !== tag))
    } else if (scrapedData) {
      setScrapedData({
        ...scrapedData,
        tags: scrapedData.tags.filter(t => t !== tag)
      })
    }
  }

  const getTagColor = (tag: string) => {
    // Simple logic to assign colors based on tag content
    if (tag.includes('tech') || tag.includes('software') || tag.includes('programming')) return TAG_COLORS.technology
    if (tag.includes('business') || tag.includes('finance') || tag.includes('work')) return TAG_COLORS.business
    if (tag.includes('entertainment') || tag.includes('movie') || tag.includes('game')) return TAG_COLORS.entertainment
    if (tag.includes('education') || tag.includes('learn') || tag.includes('course')) return TAG_COLORS.education
    if (tag.includes('shop') || tag.includes('store') || tag.includes('buy')) return TAG_COLORS.shopping
    if (tag.includes('news') || tag.includes('article')) return TAG_COLORS.news
    if (tag.includes('social') || tag.includes('community')) return TAG_COLORS.social
    return TAG_COLORS.other
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setScrapedData(null);

    try {
      // Step 1: Scrape the URL content and metadata using our secure API
      const scrapeResponse = await fetch('/api/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!scrapeResponse.ok) {
        const error = await scrapeResponse.json();
        throw new Error(error.error || 'Failed to scrape URL');
      }

      const result = await scrapeResponse.json();

      if (result.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      // Step 2: Use Gemini to analyze the content
      const dataToSend = {
        url: url,
        markdownContent: result.content || '',
      };
      console.log('Sending to /api/analyze-content:', JSON.stringify(dataToSend, null, 2));
      console.log('URL value:', url);
      console.log('Markdown content value:', result.content);
      
      try {
        const response = await fetch('/api/analyze-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });

        console.log('Analyze content response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Analyze content error response:', errorData);
          throw new Error(errorData.error || 'Failed to analyze content');
        }

        const analysis = await response.json();
        console.log('Analyze content success response:', analysis);

        if (!analysis || !analysis.title || !Array.isArray(analysis.tags)) {
          throw new Error('Invalid response from content analysis');
        }

        // Store processed data
        const data: ScrapedData = {
          url,
          title: analysis.title || result.title || 'Untitled',
          image: analysis.image || result.image || result.metadata?.['og:image'] || null,
          tags: analysis.tags || []
        };
        setScrapedData(data);
      } catch (error) {
        console.error('Error in analyze-content API call:', error);
        throw error; // Re-throw to be caught by the outer try-catch
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!scrapedData) return

    try {
      setIsLoading(true)

      // Store in Supabase
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: scrapedData.url,
          title: scrapedData.title,
          image: scrapedData.image,
          tags: [...scrapedData.tags, ...customTags]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save tab')
      }

      toast.success('Tab saved successfully')
      setUrl('')
      setScrapedData(null)
      setCustomTags([])
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save tab')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SilkCard
      presentTrigger={
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Tab
        </Button>
      }
      sheetContent={
        <div className="p-6 w-full max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">Add New Tab</h2>
          <form onSubmit={handleSubmit} className="space-y-4 w-full">
            <div className="space-y-2 w-full">
              <label htmlFor="url" className="text-sm font-medium">
                URL
              </label>
              <Input
                id="url"
                placeholder="Enter URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full text-base"
              />
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}

            {scrapedData && (
              <div className="space-y-4">
                <div className="w-full bg-white rounded-lg shadow-sm">
                  <div className="p-4 space-y-4">
                    <div className="flex items-start gap-4">
                      {scrapedData.image && (
                        <img
                          src={scrapedData.image}
                          alt=""
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-lg truncate">
                          {scrapedData.title}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {scrapedData.url}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {scrapedData.tags.map((tag) => (
                          <div
                            key={tag}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md ${getTagColor(tag)}`}
                            onDoubleClick={() => handleRemoveTag(tag)}
                          >
                            <span className="text-sm">{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="opacity-60 hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <Input
                        placeholder="Add custom tag (press Enter)"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddCustomTag}
                        className="mt-2"
                      />

                      {customTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {customTags.map((tag) => (
                            <div
                              key={tag}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md ${TAG_COLORS.other}`}
                              onDoubleClick={() => handleRemoveTag(tag)}
                            >
                              <span className="text-sm">{tag}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="opacity-60 hover:opacity-100"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setUrl('')
                  setScrapedData(null)
                  setCustomTags([])
                }}
              >
                Cancel
              </Button>
              {!scrapedData ? (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Preview'}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSave}
                >
                  {isLoading ? 'Saving...' : 'Save Tab'}
                </Button>
              )}
            </div>
          </form>
        </div>
      }
    />
  )
} 