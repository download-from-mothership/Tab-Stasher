'use client'

import { Button } from "@/app/ui/button"
import { supabase } from "@/lib/supabase"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { User } from '@supabase/supabase-js'

export function AuthButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN') {
        toast.success('Signed in successfully')
      } else if (event === 'SIGNED_OUT') {
        toast.success('Signed out successfully')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignIn = useCallback(async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      toast.error('Error signing in with Google')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {user.email}
        </span>
        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={isLoading}
        >
          {isLoading ? 'Signing out...' : 'Sign Out'}
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={handleSignIn}
      disabled={isLoading}
    >
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </Button>
  )
} 