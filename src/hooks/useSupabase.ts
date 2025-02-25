"use client"

import { useState, useEffect } from "react"
import createClient from "../lib/supabase/client"

export function useSupabase() {
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Supabase auth event: ${event}`, session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return supabase
}

