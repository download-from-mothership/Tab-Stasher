import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { env } from "../env"
import type { Database } from "@/types/database"

async function createClient() {
  const { SUPABASE_URL, SUPABASE_BASE_KEY } = env()

  if (!SUPABASE_URL || !SUPABASE_BASE_KEY) {
    console.error("Supabase URL or Base Key is missing")
    throw new Error("Supabase configuration is incomplete")
  }

  console.log("Creating Supabase server client with URL:", SUPABASE_URL)

  const cookieStore = await cookies()

  try {
    const client = createServerClient<Database>(SUPABASE_URL, SUPABASE_BASE_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch (error) {
            console.warn("Error setting cookies in Server Component:", error)
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    })
    console.log("Supabase server client created successfully")
    return client
  } catch (error) {
    console.error("Error creating Supabase server client:", error)
    throw error
  }
}

export default createClient

