"use client";
import { Sheet } from "@silk-hq/components";
import "@/styles/silk-card.css";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
   presentTrigger?: React.ReactNode;
   sheetContent?: React.ReactNode;
}

const Card = ({ presentTrigger, sheetContent, children, ...restProps }: Props) => {
   // If no presentTrigger or sheetContent is provided, render as a regular card
   if (!presentTrigger || !sheetContent) {
      return (
         <div className="rounded-lg border bg-card text-card-foreground shadow-sm" {...restProps}>
            {children}
         </div>
      );
   }

   // Otherwise, render as a Sheet-based card
   return (
      <Sheet.Root license="commercial" {...restProps}>
         {presentTrigger}
         <Sheet.Portal>
            <Sheet.View
               className="Card-view"
               contentPlacement="center"
               tracks="top"
               enteringAnimationSettings={{
                  easing: "spring",
                  stiffness: 260,
                  damping: 20,
                  mass: 1,
               }}
               nativeEdgeSwipePrevention={true}
            >
               <Sheet.Backdrop
                  className="Card-backdrop"
                  travelAnimation={{
                     opacity: ({ progress }) => Math.min(0.4 * progress, 0.4),
                  }}
                  themeColorDimming="auto"
               />
               <Sheet.Content
                  className="Card-content"
                  travelAnimation={{
                     scale: [0.8, 1],
                  }}
               >
                  {sheetContent}
               </Sheet.Content>
            </Sheet.View>
         </Sheet.Portal>
      </Sheet.Root>
   );
};

// For backward compatibility, we'll export the same structure but with the Silk implementation
const CardHeader = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
   <div {...props}>{children}</div>
);

const CardTitle = ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
   <h3 {...props}>{children}</h3>
);

const CardDescription = ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
   <p {...props}>{children}</p>
);

const CardContent = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
   <div {...props}>{children}</div>
);

const CardFooter = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
   <div {...props}>{children}</div>
);

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
