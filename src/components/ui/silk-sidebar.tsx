"use client";
import React from "react";
import { Sheet, VisuallyHidden } from "@silk-hq/components";
import "@/styles/silk-sidebar.css";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  presentTrigger: React.ReactNode;
  sheetContent: React.ReactNode;
  footer?: React.ReactNode;
  presented?: boolean;
  onPresentedChange?: (presented: boolean) => void;
}

const SilkSidebar = ({ presentTrigger, sheetContent, footer, presented, onPresentedChange, ...restProps }: Props) => {
  return (
    <Sheet.Root license="non-commercial" sheetRole="dialog" presented={presented} onPresentedChange={onPresentedChange} {...restProps}>
      {presentTrigger}
      <Sheet.Portal>
        <Sheet.View
          className="SilkSidebar-view"
          contentPlacement="left"
          swipeOvershoot={false}
          nativeEdgeSwipePrevention={true}
          onClickOutside={() => onPresentedChange?.(false)}
        >
          <Sheet.Backdrop />
          <Sheet.Content className="SilkSidebar-content">
            <VisuallyHidden.Root>
              <Sheet.Title>Navigation Sidebar</Sheet.Title>
              <Sheet.Trigger action="dismiss">
                Close Navigation Sidebar
              </Sheet.Trigger>
            </VisuallyHidden.Root>
            <div className="SilkSidebar-main">
              {sheetContent}
            </div>
            {footer && (
              <div className="SilkSidebar-footer">
                {footer}
              </div>
            )}
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
};

export { SilkSidebar }; 