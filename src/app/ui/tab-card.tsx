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
}

export function TabCard({ title, images, description, favicon }: TabCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0)
  const hasMultipleImages = images.length > 1

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <Card className="overflow-hidden">
      {/* Image Carousel */}
      <div className="relative aspect-video">
        {images.length > 0 ? (
          <>
            <Image
              src={images[currentImageIndex]}
              alt={`Image ${currentImageIndex + 1}`}
              fill
              className="object-cover"
            />
            {hasMultipleImages && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
                  onClick={previousImage}
                >
                  <ChevronLeft className="h-4 w-4 text-white" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4 text-white" />
                </Button>
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full bg-white/50 transition-all",
                        currentImageIndex === index && "w-3 bg-white"
                      )}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <span className="text-sm text-muted-foreground">No image available</span>
          </div>
        )}
      </div>

      {/* Title and Description */}
      <CardHeader>
        <div className="flex items-center gap-2">
          {favicon && (
            <Image
              src={favicon}
              alt="Site favicon"
              width={16}
              height={16}
              className="h-4 w-4"
            />
          )}
          <CardTitle className="line-clamp-2">{title || "Untitled"}</CardTitle>
        </div>
        {description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </CardHeader>
    </Card>
  )
} 