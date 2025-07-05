"use client"

import * as React from "react"
import { Button } from "@/app/ui/button"
import { Input } from "@/app/ui/input"
import { Plus, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { SilkCard } from "@/app/ui/silk-card"
import { Sheet } from "@silk-hq/components"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/ui/tabs"

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
  description?: string
  image: string | null
  favicon?: string
  content?: string
  tags: string[]
  primaryCategory?: string
  secondaryCategory?: string
  confidence?: number
}

interface AddTabDialogProps {
  onTabSaved?: () => void
}

export function AddTabDialog({ onTabSaved }: AddTabDialogProps) {
  const [url, setUrl] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [scrapedData, setScrapedData] = React.useState<ScrapedData | null>(null)
  const [tagInput, setTagInput] = React.useState("")
  const [customTags, setCustomTags] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)
  // Image upload state
  const [imageFile, setImageFile] = React.useState<File | null>(null)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState("url")
  const [visualSearchJobId, setVisualSearchJobId] = React.useState<string | null>(null);
  const [visualSearchResult, setVisualSearchResult] = React.useState<any>(null);
  const [visualSearchError, setVisualSearchError] = React.useState<string | null>(null);
  const [isPolling, setIsPolling] = React.useState(false);

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setUrl("")
      setScrapedData(null)
      setCustomTags([])
      setTagInput("")
      setImageFile(null)
      setImagePreview(null)
    }
  }

  // Generate preview when imageFile changes
  React.useEffect(() => {
    if (imageFile) {
      const objectUrl = URL.createObjectURL(imageFile)
      setImagePreview(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    } else {
      setImagePreview(null)
    }
  }, [imageFile])

  // Debug effect to log when scrapedData changes
  React.useEffect(() => {
    if (scrapedData) {
      console.log('scrapedData updated with tags:', scrapedData.tags)
      console.log('scrapedData tags length:', scrapedData.tags?.length)
      console.log('scrapedData tags is array:', Array.isArray(scrapedData.tags))
      console.log('Full scrapedData object:', scrapedData)
    } else {
      console.log('scrapedData is null')
    }
  }, [scrapedData])

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

  const handleRemoveTag = (tag: string, e?: React.MouseEvent) => {
    // Prevent event bubbling to avoid closing the sheet
    if (e) {
      e.stopPropagation()
    }
    
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
    e.preventDefault()
    if (!url.trim()) return

    setIsLoading(true)
    try {
      // Combine scraping and analysis into a single optimized call
      const response = await fetch('/api/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process URL')
      }

      const result = await response.json()
      console.log('Scrape result:', result)

      // If we have content, analyze it immediately
      let analysis = null
      if (result.content) {
        try {
          console.log('Calling analyze-content API with content length:', result.content.length)
          const analysisResponse = await fetch('/api/analyze-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              url, 
              markdownContent: result.content 
            }),
          })

          if (analysisResponse.ok) {
            analysis = await analysisResponse.json()
            console.log('Analysis result:', analysis)
            console.log('Analysis tags:', analysis.tags)
            console.log('Analysis tags type:', typeof analysis.tags)
            console.log('Analysis tags length:', analysis.tags?.length)
            console.log('Analysis tags is array:', Array.isArray(analysis.tags))
          } else {
            const errorData = await analysisResponse.json()
            console.error('Analysis API error:', errorData)
          }
        } catch (error) {
          console.warn('Analysis failed, using scraped data only:', error)
          console.log('Gemini API failed, will use fallback tags')
        }
      } else {
        console.log('No content available for analysis')
      }

      // Store processed data
      let favicon = result.favicon;
      if (!favicon || typeof favicon !== 'string' || favicon.trim() === '') {
        try {
          // Extract domain from URL
          const urlObj = new URL(url);
          const domain = urlObj.hostname;
          favicon = `https://www.google.com/s2/favicons?domain=${domain}`;
        } catch (e) {
          // Fallback to a generic favicon if URL parsing fails
          favicon = '/favicon.ico';
        }
      }
      const data: ScrapedData = {
        url,
        title: analysis?.title || result.title || 'Untitled',
        description: result.description,
        image: analysis?.image || result.image || result.metadata?.['og:image'] || null,
        favicon,
        content: result.content,
        tags: analysis?.tags || [],
        primaryCategory: analysis?.primaryCategory,
        secondaryCategory: analysis?.secondaryCategory,
        confidence: analysis?.confidence
      }
      console.log('Setting scrapedData with tags:', data.tags)
      console.log('Full scrapedData:', data)
      console.log('Tags array length in final data:', data.tags.length)
      setScrapedData(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process URL')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!scrapedData) return;
    setIsLoading(true);
    try {
      // Merge tags from analysis and custom input
      const allTags = Array.from(new Set([...(scrapedData.tags || []), ...customTags]));
      const response = await fetch('/api/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: scrapedData.url,
          title: scrapedData.title,
          description: scrapedData.description,
          image: scrapedData.image,
          favicon: scrapedData.favicon,
          content: scrapedData.content,
          tags: allTags,
          primaryCategory: scrapedData.primaryCategory,
          secondaryCategory: scrapedData.secondaryCategory,
          confidence: scrapedData.confidence
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save tab');
      }
      toast.success('Tab saved!');
      if (onTabSaved) onTabSaved();
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save tab');
    } finally {
      setIsLoading(false);
    }
  };

  // Polling effect
  React.useEffect(() => {
    if (!visualSearchJobId || !isPolling) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/visual-search/${visualSearchJobId}`);
        if (!res.ok) throw new Error('Polling failed');
        const data = await res.json();
        if (data.status === 'pending') {
          setTimeout(poll, 2000);
        } else {
          if (!cancelled) {
            setVisualSearchResult(data);
            setIsPolling(false);
            setIsLoading(false);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setVisualSearchError(err.message || 'Polling failed');
          setIsPolling(false);
          setIsLoading(false);
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [visualSearchJobId, isPolling]);

  // Reset visual search state when dialog closes or tab changes
  React.useEffect(() => {
    if (!open || activeTab !== 'image') {
      setVisualSearchJobId(null);
      setVisualSearchResult(null);
      setVisualSearchError(null);
      setIsPolling(false);
    }
  }, [open, activeTab]);

  return (
    <SilkCard
      presented={open}
      onPresentedChange={handleOpenChange}
      presentTrigger={
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Tab
        </Button>
      }
      sheetContent={
        <div className="p-6 w-full max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">Add New Tab</h2>
          <Tabs defaultValue="url" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-fit mb-2 p-0 bg-transparent">
              <TabsTrigger
                value="url"
                className="px-3 py-1 text-sm rounded-md border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-input data-[state=active]:font-semibold transition-colors"
              >
                URL
              </TabsTrigger>
              <TabsTrigger
                value="image"
                className="px-3 py-1 text-sm rounded-md border border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-input data-[state=active]:font-semibold transition-colors"
              >
                Image
              </TabsTrigger>
            </TabsList>
            <TabsContent value="url">
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
                            {scrapedData.primaryCategory && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                  {scrapedData.primaryCategory}
                                </span>
                                {scrapedData.secondaryCategory && (
                                  <span className="inline-flex items-center rounded-full bg-secondary/10 px-2 py-1 text-xs font-medium text-secondary">
                                    {scrapedData.secondaryCategory}
                                  </span>
                                )}
                                {scrapedData.confidence && scrapedData.confidence < 0.8 && (
                                  <span className="text-xs text-muted-foreground">
                                    ({Math.round(scrapedData.confidence * 100)}% confidence)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {scrapedData.tags && scrapedData.tags.length > 0 ? (
                              scrapedData.tags.map((tag) => (
                                <div
                                  key={tag}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md ${getTagColor(tag)}`}
                                  onDoubleClick={() => handleRemoveTag(tag)}
                                >
                                  <span className="text-sm">{tag}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleRemoveTag(tag, e)}
                                    className="opacity-60 hover:opacity-100"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                No tags generated. Add custom tags below.
                              </div>
                            )}
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
                                    onClick={(e) => handleRemoveTag(tag, e)}
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
                  <Sheet.Trigger action="dismiss" asChild>
                    <Button
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </Sheet.Trigger>
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
            </TabsContent>
            <TabsContent value="image">
              <div className="space-y-2 w-full">
                <label htmlFor="image-upload" className="text-sm font-medium">
                  Upload Screenshot (optional)
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setImageFile(file);
                  }}
                  className="w-full text-base"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-48 rounded border"
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <Sheet.Trigger action="dismiss" asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                    >
                      Cancel
                    </Button>
                  </Sheet.Trigger>
                  <Button
                    type="button"
                    disabled={isLoading || !imageFile}
                    onClick={async () => {
                      if (!imageFile) return;
                      setIsLoading(true);
                      setVisualSearchResult(null);
                      setVisualSearchError(null);
                      try {
                        const formData = new FormData();
                        formData.append('image', imageFile);
                        const res = await fetch('/api/v1/visual-search', {
                          method: 'POST',
                          body: formData,
                        });
                        if (!res.ok) throw new Error('Failed to start visual search');
                        const { jobId } = await res.json();
                        setVisualSearchJobId(jobId);
                        setIsPolling(true);
                      } catch (err: any) {
                        setVisualSearchError(err.message || 'Failed to start visual search');
                        setIsLoading(false);
                      }
                    }}
                  >
                    {isLoading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
                {isPolling && (
                  <div className="flex items-center gap-2 mt-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Searching for matches...</span>
                  </div>
                )}
                {visualSearchError && (
                  <div className="text-red-500 mt-2">{visualSearchError}</div>
                )}
                {visualSearchResult && (
                  <div className="mt-4">
                    {visualSearchResult.matchUrl ? (
                      <div className="p-4 border rounded bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center gap-4">
                          {visualSearchResult.previewImage && (
                            <img src={visualSearchResult.previewImage} alt="Result" className="w-20 h-20 object-cover rounded" />
                          )}
                          <div>
                            <a href={visualSearchResult.matchUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">
                              {visualSearchResult.pageTitle || visualSearchResult.matchUrl}
                            </a>
                            <div className="text-xs text-muted-foreground mt-1">
                              Confidence: {visualSearchResult.confidence?.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground mt-2">No results found—try cropping or adding keywords.</div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      }
    />
  )
} 