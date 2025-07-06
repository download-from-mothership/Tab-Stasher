export const dynamic = 'force-dynamic'

import { LoginForm } from "@/components/ui/login-form"

export default function LoginPage() {
  return (
    <div className="h-screen flex items-center justify-center bg-muted p-4 overflow-hidden">
      <LoginForm />
    </div>
  )
} 