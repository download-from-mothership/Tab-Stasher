import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "@/styles/globals.css";
import { Providers } from './providers'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Silk Advanced Examples CSS",
  description: "Native-like swipeable sheets on the web",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "rgb(255, 255, 255)",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <main className="container mx-auto py-6">
            {children}
          </main>
        </Providers>
        <Toaster richColors />
      </body>
    </html>
  )
} 