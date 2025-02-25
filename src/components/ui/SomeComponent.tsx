import { useSupabase } from "../../hooks/useSupabase"
import { createBrowserClient } from "@supabase/ssr"
import { env } from "../../lib/env"
import type { Database } from "../../types/database"

export function SomeComponent() {
  const supabase = useSupabase()

  // Use supabase client here
  // For example:
  // const { data, error } = await supabase.from('your_table').select('*');

  return (
    <div>
      <h1>Hello, World!</h1>
    </div>
  );
}

function createClient() {
  const { SUPABASE_URL, SUPABASE_BASE_KEY } = env()

  if (!SUPABASE_URL || !SUPABASE_BASE_KEY) {
    console.error("Supabase URL or Base Key is missing")
    throw new Error("Supabase configuration is incomplete")
  }

  console.log("Creating Supabase client with URL:", SUPABASE_URL)

  try {
    const client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_BASE_KEY)
    console.log("Supabase client created successfully")
    return client
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    throw error
  }
}

export default createClient

