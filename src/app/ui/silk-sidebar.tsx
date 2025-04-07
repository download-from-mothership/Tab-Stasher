"use client";
import React from "react";
import { Sheet, VisuallyHidden } from "@silk-hq/components";
import "@/styles/silk-sidebar.css";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  presentTrigger: React.ReactNode;
  sheetContent: React.ReactNode;
}

const SilkSidebar = ({ presentTrigger, sheetContent, ...restProps }: Props) => {
  return (
    <Sheet.Root license="commercial" sheetRole="dialog" {...restProps}>
      {presentTrigger}
      <Sheet.Portal>
        <Sheet.View
          className="SilkSidebar-view"
          contentPlacement="left"
          swipeOvershoot={false}
          nativeEdgeSwipePrevention={true}
        >
          <Sheet.Backdrop />
          <Sheet.Content className="SilkSidebar-content">
            <VisuallyHidden.Root>
              <Sheet.Title>Sidebar Example</Sheet.Title>
              <Sheet.Trigger action="dismiss">
                Close Sidebar example
              </Sheet.Trigger>
            </VisuallyHidden.Root>
            {sheetContent}
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
};

export { SilkSidebar }; 