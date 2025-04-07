'use client'

import { Button } from "@/app/ui/button"
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
} from "@/app/ui/dialog"
import { Input } from "@/app/ui/input"
import { Label } from "@/app/ui/label"

export function AuthButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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
        setIsOpen(false) // Close the dialog on successful sign in
      } else if (event === 'SIGNED_OUT') {
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Sign In
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Sign in to your account to continue
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 