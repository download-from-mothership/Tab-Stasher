"use client";

export const dynamic = 'force-dynamic'

import { AuthButton } from "@/components/ui/auth-button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Welcome to Tab Stasher
        </h1>
        <p className="text-center mb-8">
          Your personal tab management solution
        </p>
        <div className="flex justify-center">
          <AuthButton />
        </div>
      </div>
    </div>
  )
} 