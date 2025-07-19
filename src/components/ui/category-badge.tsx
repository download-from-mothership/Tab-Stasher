interface CategoryBadgeProps {
  primaryCategory: string
  secondaryCategory?: string
  confidence?: number
  className?: string
}

export function CategoryBadge({ 
  primaryCategory, 
  secondaryCategory, 
  confidence, 
  className = "" 
}: CategoryBadgeProps) {
  // Validate inputs
  if (!primaryCategory || typeof primaryCategory !== 'string') {
    return null
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
        {primaryCategory}
      </span>
      {secondaryCategory && typeof secondaryCategory === 'string' && (
        <span className="inline-flex items-center rounded-full bg-secondary/10 px-2 py-1 text-xs font-medium text-secondary">
          {secondaryCategory}
        </span>
      )}
      {confidence && typeof confidence === 'number' && confidence < 0.8 && (
        <span className="text-xs text-muted-foreground">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </div>
  )
} 