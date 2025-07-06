"use client";
import React from "react";
import { Sheet } from "@silk-hq/components";
import { cn } from "@/lib/utils";

interface SheetDismissButtonProps extends Omit<React.HTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: "simple" | "icon";
  onClick?: React.MouseEventHandler<HTMLElement>;
}

export const SheetDismissButton = React.forwardRef<
  HTMLButtonElement,
  SheetDismissButtonProps
>(({ className, variant = "simple", ...props }, ref) => {
  return (
    <Sheet.Trigger
      ref={ref}
      action="dismiss"
      className={cn(
        "SheetDismissButton",
        {
          "SheetDismissButton--simple": variant === "simple",
          "SheetDismissButton--icon": variant === "icon",
        },
        className
      )}
      {...props}
    >
      {variant === "simple" ? (
        "Close"
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="SheetDismissButton-icon"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </Sheet.Trigger>
  );
});

SheetDismissButton.displayName = "SheetDismissButton"; 