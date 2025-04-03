"use client"

import * as React from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/ui/card"
import { Button } from "@/app/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface TabCardProps {
  title: string | null
  images: string[]
  description?: string | null
  favicon?: string | null
  onClick?: () => void
}

function getProxiedImageUrl(url: string) {
  if (!url) return ''
  // If the URL is already relative or a data URL, return as is
  if (url.startsWith('/') || url.startsWith('data:')) return url
  // Otherwise, proxy it through our API
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export function TabCard({
  title,
  description,
  images,
  favicon,
  onClick,
}: TabCardProps) {
  const mainImage = images && images.length > 0 ? getProxiedImageUrl(images[0]) : null
  const proxyFavicon = favicon ? getProxiedImageUrl(favicon) : null

  return (
    <div
      className="flex flex-col space-y-1.5 p-6 cursor-pointer hover:bg-accent rounded-lg transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center space-x-2">
        {proxyFavicon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxyFavicon}
            alt="favicon"
            className="w-4 h-4"
          />
        )}
        <h3 className="font-semibold leading-none tracking-tight">
          {title || "Untitled"}
        </h3>
      </div>
      {mainImage && (
        <div className="relative w-full aspect-video overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mainImage}
            alt={title || "Tab preview"}
            className="object-cover w-full h-full"
          />
        </div>
      )}
      {description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}
    </div>
  )
} 