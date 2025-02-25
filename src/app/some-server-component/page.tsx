import { Suspense } from "react"
import createClient from "@/lib/supabase/server"

async function ServerComponent() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("your_table").select("*")

  if (error) {
    console.error("Error fetching data:", error)
    return <div>Error loading data</div>
  }

  return (
    <div>
      {/* Render your data here */}
      {JSON.stringify(data)}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ServerComponent />
    </Suspense>
  )
}

