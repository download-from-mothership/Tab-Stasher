"use client";
import React, { useState, useRef, useCallback } from "react";
import { Sheet, VisuallyHidden, useThemeColorDimmingOverlay } from "@silk-hq/components";
import "@/styles/persistent-sheet-with-detent.css";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
   presentTrigger: React.ReactNode;
   retractedContent: React.ReactNode;
   expandedContent: React.ReactNode;
}

const PersistentSheetWithDetent = ({ presentTrigger, retractedContent, expandedContent, ...restProps }: Props) => {
   //
   // Define inertOutside

   const [inertOutside, setInertOutside] = useState(false);
   const [range, setRange] = useState({ start: 0, end: 0 });

   const rangeChangeHandler: Exclude<React.ComponentProps<typeof Sheet.View>["onTravelRangeChange"], undefined> =
      useCallback((range) => {
         setRange((prevRange) => {
            const goingFromDetent1ToDetent2 = prevRange.start === 1 && prevRange.end === 1 && range.end === 2;
            const onDetent2 = range.start === 2 && range.end === 2;

            setInertOutside(goingFromDetent1ToDetent2 || onDetent2);

            return range;
         });
      }, []);

   //
   // Travel handler

   // This has to be used instead of travel animations because we
   // don't allow (yet) to define animation based on the progress
   // during a specific range.

   const contentRef = useRef<HTMLDivElement>(null);
   const themeColorDimmingControllerRef = useRef<HTMLDivElement>(null);
   const backdropRef = useRef<HTMLDivElement>(null);
   const rectractedContentRef = useRef<HTMLDivElement>(null);
   const expandedContentRef = useRef<HTMLDivElement>(null);

   const { setDimmingOverlayOpacity } = useThemeColorDimmingOverlay({
      elementRef: themeColorDimmingControllerRef,
      dimmingColor: "rgba(63, 165, 225, 1)",
   });

   const travelHandler: Exclude<React.ComponentProps<typeof Sheet.View>["onTravel"], undefined> = useCallback(
      ({ progress, range, progressAtDetents }) => {
         if (!progressAtDetents) return;

         if (range.end > 1) {
            const normalisedProgress = (progress - progressAtDetents[1]) / (1 - progressAtDetents[1]);

            rectractedContentRef.current?.style.setProperty("opacity", (1 - normalisedProgress) as unknown as string);

            setDimmingOverlayOpacity(normalisedProgress);

            backdropRef.current?.style.setProperty("opacity", (normalisedProgress * 0.25) as unknown as string);
            expandedContentRef.current?.style.setProperty("opacity", normalisedProgress as unknown as string);
         }
      },
      [setDimmingOverlayOpacity]
   );

   //
   // Return

   return (
      <Sheet.Root license="commercial">
         {presentTrigger}
         <Sheet.Portal>
            <Sheet.View
               className={`PersistentSheetWithDetent-view detent2-${range.start === 2 && range.end === 2}`}
               detents="max(env(safe-area-inset-bottom, 0px) + 66px, 76px)"
               swipeOvershoot={false}
               swipeDismissal={false}
               onTravelRangeChange={rangeChangeHandler}
               inertOutside={inertOutside}
               onClickOutside={{ dismiss: range.end !== 1 }}
               onTravel={travelHandler}
               nativeEdgeSwipePrevention={range.end !== 1}
            >
               <div
                  className="PersistentSheetWithDetent-themeColorDimmingController"
                  ref={themeColorDimmingControllerRef}
               />
               {range.end > 1 && (
                  <Sheet.Backdrop
                     className="PersistentSheetWithDetent-backdrop"
                     travelAnimation={{ opacity: null }}
                     ref={backdropRef}
                  />
               )}
               <Sheet.Content
                  className={`PersistentSheetWithDetent-content detent2-${range.start === 2 && range.end === 2}`}
                  ref={contentRef}
               >
                  <Sheet.SpecialWrapper.Root>
                     <Sheet.SpecialWrapper.Content>
                        <VisuallyHidden.Root asChild>
                           <Sheet.Title>Persistent Sheet with Detent</Sheet.Title>
                        </VisuallyHidden.Root>
                        <VisuallyHidden.Root asChild>
                           <Sheet.Description>A persistent sheet with detent example</Sheet.Description>
                        </VisuallyHidden.Root>

                        <div className="PersistentSheetWithDetent-actualContent">
                           <div
                              className="PersistentSheetWithDetent-retractedContentContainer"
                              ref={rectractedContentRef}
                           >
                              {range.start < 2 && retractedContent}
                           </div>
                           {range.end === 1 && (
                              <Sheet.Trigger
                                 className="PersistentSheetWithDetent-expandTrigger"
                                 action={{
                                    type: "step",
                                    detent: 2,
                                 }}
                              >
                                 <VisuallyHidden.Root>Expand</VisuallyHidden.Root>
                              </Sheet.Trigger>
                           )}
                           {range.end > 1 && (
                              <div
                                 className="PersistentSheetWithDetent-expandedContentContainer"
                                 ref={expandedContentRef}
                              >
                                 {expandedContent}
                              </div>
                           )}
                        </div>
                     </Sheet.SpecialWrapper.Content>
                  </Sheet.SpecialWrapper.Root>
               </Sheet.Content>
            </Sheet.View>
         </Sheet.Portal>
      </Sheet.Root>
   );
};

export { PersistentSheetWithDetent }; 