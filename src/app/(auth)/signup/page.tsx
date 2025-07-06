export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { SignUpForm } from "@/components/ui/signup-form"

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-6">
      <SignUpForm />
    </div>
  )
} 