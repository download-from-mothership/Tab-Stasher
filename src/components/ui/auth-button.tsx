'use client'

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { User } from '@supabase/supabase-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

export function AuthButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Get initial user securely
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Verify the user securely
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        toast.success('Signed in successfully')
        setIsOpen(false) // Close the dialog on successful sign in
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        toast.success('Signed out successfully')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      toast.error('Error signing in')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [email, password])

  const handleSignOut = useCallback(async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      toast.error('Error signing out')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  if (user) {
    return (
      <Button
        variant="outline"
        onClick={handleSignOut}
        disabled={isLoading}
      >
        {isLoading ? 'Signing out...' : 'Sign Out'}
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={() => router.push('/login')}
      disabled={isLoading}
    >
      Sign In
    </Button>
  )
} 