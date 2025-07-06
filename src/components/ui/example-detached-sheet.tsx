"use client";
import React from "react";
import { Sheet } from "@silk-hq/components";
import { DetachedSheet } from "./detached-sheet";

export const ExampleDetachedSheet = () => {
  return (
    <div className="Example">
      <Sheet.Trigger className="Example-trigger" action="present">
        <h2 className="Example-title">Detached Sheet</h2>
        <p className="Example-description">
          A sheet that can be positioned at the bottom or center of the screen
        </p>
      </Sheet.Trigger>
      <DetachedSheet
        presentTrigger={
          <Sheet.Trigger className="Example-trigger" action="present">
            Open Detached Sheet
          </Sheet.Trigger>
        }
        sheetContent={
          <div className="Example-content">
            <h3>Detached Sheet</h3>
            <p>
              This sheet can be positioned at the bottom on mobile devices and in the center on larger screens.
              It demonstrates responsive behavior and maintains a consistent user experience across different device sizes.
            </p>
            <Sheet.Trigger action="dismiss" className="Example-dismissTrigger">
              Close
            </Sheet.Trigger>
          </div>
        }
      />
    </div>
  );
}; 