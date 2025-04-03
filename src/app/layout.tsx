import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "@/styles/globals.css"
import { Providers } from './providers'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Tab Stasher",
  description: "Manage your browser tabs efficiently",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
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