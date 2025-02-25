import { NextResponse } from "next/server"
import createClient from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("your_table").select("*")

  if (error) {
    console.error("Error fetching data:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }

  return NextResponse.json(data)
}

