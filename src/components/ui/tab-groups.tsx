"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Globe, MoreVertical, Plus, Trash2, Edit, ExternalLink, Loader2, Search, Check, X } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useTabs } from "@/components/ui/tabs-context"

interface Collection {
  id: string
  name: string
  description: string | null
  icon: string | null
  tab_count: number
  created_at: string
  updated_at: string
}

export function TabGroups() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null)
  const [viewCollection, setViewCollection] = useState<Collection & { tabs?: any[] } | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [addTabsOpen, setAddTabsOpen] = useState(false)
  const [tabSearch, setTabSearch] = useState("")
  const [addingTabIds, setAddingTabIds] = useState<Set<string>>(new Set())
  const { tabs: allTabs } = useTabs()

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch("/api/collections")
      if (res.ok) {
        const data = await res.json()
        setCollections(data)
      }
    } catch (e) {
      console.error("Failed to fetch collections:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      })
      if (res.ok) {
        setName("")
        setDescription("")
        setCreateOpen(false)
        fetchCollections()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!activeCollection || !name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/collections/${activeCollection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      })
      if (res.ok) {
        setEditOpen(false)
        setActiveCollection(null)
        fetchCollections()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!activeCollection) return
    setSaving(true)
    try {
      const res = await fetch(`/api/collections/${activeCollection.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setDeleteOpen(false)
        setActiveCollection(null)
        if (viewCollection?.id === activeCollection.id) setViewCollection(null)
        fetchCollections()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleViewCollection = async (collection: Collection) => {
    try {
      const res = await fetch(`/api/collections/${collection.id}`)
      if (res.ok) {
        const data = await res.json()
        setViewCollection(data)
      }
    } catch (e) {
      console.error("Failed to fetch collection:", e)
    }
  }

  const handleAddTabs = async (tabIds: string[]) => {
    if (!viewCollection || tabIds.length === 0) return
    try {
      const res = await fetch(`/api/collections/${viewCollection.id}/tabs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabIds }),
      })
      if (res.ok) {
        setAddingTabIds(new Set())
        setAddTabsOpen(false)
        setTabSearch("")
        handleViewCollection(viewCollection)
      }
    } catch (e) {
      console.error("Failed to add tabs:", e)
    }
  }

  const handleRemoveTab = async (tabId: string) => {
    if (!viewCollection) return
    try {
      const res = await fetch(`/api/collections/${viewCollection.id}/tabs`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabIds: [tabId] }),
      })
      if (res.ok) {
        handleViewCollection(viewCollection)
      }
    } catch (e) {
      console.error("Failed to remove tab:", e)
    }
  }

  const openEdit = (collection: Collection) => {
    setActiveCollection(collection)
    setName(collection.name)
    setDescription(collection.description || "")
    setEditOpen(true)
    setMenuOpenId(null)
  }

  const openDelete = (collection: Collection) => {
    setActiveCollection(collection)
    setDeleteOpen(true)
    setMenuOpenId(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // If viewing a specific collection, show its tabs
  if (viewCollection) {
    const existingTabIds = new Set((viewCollection.tabs || []).map((t: any) => t.id))
    const filteredAllTabs = allTabs.filter((t) => {
      if (existingTabIds.has(t.id)) return false
      if (!tabSearch.trim()) return true
      const q = tabSearch.toLowerCase()
      return (t.title?.toLowerCase().includes(q) || t.url?.toLowerCase().includes(q))
    })

    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => { setViewCollection(null); fetchCollections() }}>
            &larr; Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{viewCollection.name}</h2>
            {viewCollection.description && (
              <p className="text-sm text-muted-foreground">{viewCollection.description}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {viewCollection.tab_count} tab{viewCollection.tab_count !== 1 ? "s" : ""}
            </span>
            <Dialog open={addTabsOpen} onOpenChange={(open) => {
              setAddTabsOpen(open)
              if (!open) { setTabSearch(""); setAddingTabIds(new Set()) }
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Tabs
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add Tabs to {viewCollection.name}</DialogTitle>
                  <DialogDescription>Select tabs to add to this collection.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tabs..."
                    value={tabSearch}
                    onChange={(e) => setTabSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex-1 overflow-y-auto max-h-[400px] space-y-1">
                  {filteredAllTabs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {allTabs.length === 0 ? "No tabs available." : "No matching tabs found."}
                    </p>
                  ) : (
                    filteredAllTabs.slice(0, 50).map((tab) => {
                      const selected = addingTabIds.has(tab.id)
                      return (
                        <button
                          key={tab.id}
                          className={`flex items-center gap-3 w-full p-2 rounded-md text-left hover:bg-accent transition-colors ${
                            selected ? "bg-primary/5 border border-primary/20" : ""
                          }`}
                          onClick={() => {
                            const next = new Set(addingTabIds)
                            if (selected) next.delete(tab.id); else next.add(tab.id)
                            setAddingTabIds(next)
                          }}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selected ? "bg-primary border-primary text-white" : "border-gray-300"
                          }`}>
                            {selected && <Check className="h-3 w-3" />}
                          </div>
                          {tab.favicon && <img src={tab.favicon} alt="" className="w-4 h-4 flex-shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{tab.title || tab.url}</p>
                            <p className="text-xs text-muted-foreground truncate">{tab.url}</p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddTabsOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => handleAddTabs(Array.from(addingTabIds))}
                    disabled={addingTabIds.size === 0}
                  >
                    Add {addingTabIds.size} Tab{addingTabIds.size !== 1 ? "s" : ""}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {viewCollection.tabs && viewCollection.tabs.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {viewCollection.tabs.map((tab: any) => (
              <Card key={tab.id} className="relative w-full bg-white rounded-lg shadow-md group">
                <button
                  onClick={() => handleRemoveTab(tab.id)}
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-1 hover:bg-red-50"
                  title="Remove from collection"
                >
                  <X className="h-3.5 w-3.5 text-red-500" />
                </button>
                {tab.image && (
                  <div className="h-32 overflow-hidden rounded-t-lg">
                    <img
                      src={tab.image}
                      alt={tab.title || ""}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm line-clamp-2">{tab.title || tab.url}</CardTitle>
                  {tab.primary_category && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full w-fit">
                      {tab.primary_category}
                    </span>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {tab.favicon && (
                      <img src={tab.favicon} alt="" className="w-4 h-4" />
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {new URL(tab.url).hostname}
                    </span>
                    <a
                      href={tab.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No tabs in this collection yet.</p>
            <p className="text-sm mt-1">Click &quot;Add Tabs&quot; to add tabs to this collection.</p>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Create New Collection Card */}
        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) { setName(""); setDescription("") }
        }}>
          <DialogTrigger asChild>
            <Card className="border-dashed w-full min-h-[240px] bg-white rounded-lg shadow-md cursor-pointer hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle>Create Collection</CardTitle>
                <CardDescription>Organize tabs into named collections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Collection</DialogTitle>
              <DialogDescription>Create a named collection to organize your tabs.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="e.g. Research: Q2 Pricing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  placeholder="What's this collection for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!name.trim() || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Existing Collections */}
        {collections.map((collection) => (
          <Card
            key={collection.id}
            className="relative w-full min-h-[240px] bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleViewCollection(collection)}
          >
            <div className="absolute right-4 top-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpenId(menuOpenId === collection.id ? null : collection.id)
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {menuOpenId === collection.id && (
                <div className="absolute right-0 top-8 bg-white border rounded-md shadow-lg py-1 min-w-[120px]">
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-sm w-full hover:bg-accent text-left"
                    onClick={(e) => { e.stopPropagation(); openEdit(collection) }}
                  >
                    <Edit className="h-3.5 w-3.5" /> Rename
                  </button>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-sm w-full hover:bg-accent text-left text-red-600"
                    onClick={(e) => { e.stopPropagation(); openDelete(collection) }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
            <CardHeader>
              <CardTitle>{collection.name}</CardTitle>
              {collection.description && (
                <CardDescription>{collection.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Globe className="mr-1 h-4 w-4" />
                  <span>{collection.tab_count} tab{collection.tab_count !== 1 ? "s" : ""}</span>
                  <span>&middot;</span>
                  <span>{formatDate(collection.updated_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {collections.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No collections yet. Create one to start organizing your tabs!</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open)
        if (!open) setActiveCollection(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>Update the collection name or description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!name.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={(open) => {
        setDeleteOpen(open)
        if (!open) setActiveCollection(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{activeCollection?.name}&quot;? This will not delete the tabs inside it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
