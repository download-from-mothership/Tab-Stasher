"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/ui/card"
import { Button } from "@/app/ui/button"
import { Globe, MoreVertical, Plus } from "lucide-react"
import { useState } from "react"

// Mock data - replace with real data later
const mockGroups = [
  {
    id: 1,
    name: "Work Research",
    description: "Important articles and documentation",
    tabCount: 12,
    lastUpdated: "2 hours ago",
  },
  {
    id: 2,
    name: "Shopping",
    description: "Products to buy later",
    tabCount: 5,
    lastUpdated: "1 day ago",
  },
  {
    id: 3,
    name: "Learning Resources",
    description: "Tutorial videos and courses",
    tabCount: 8,
    lastUpdated: "3 days ago",
  },
]

export function TabGroups() {
  const [groups] = useState(mockGroups)

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Create New Group Card */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Create New Group</CardTitle>
            <CardDescription>Save a new collection of tabs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                New Tab Group
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground">
                <MoreVertical className="mr-2 h-4 w-4" />
                More options
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing Groups */}
        {groups.map((group) => (
          <Card key={group.id} className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Globe className="mr-1 h-4 w-4" />
                  <span>{group.tabCount} tabs</span>
                  <span>•</span>
                  <span>{group.lastUpdated}</span>
                </div>
                <Button variant="outline" size="sm">
                  Open All
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 