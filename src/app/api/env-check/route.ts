import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function GET() {
  const envVars = env()

  return NextResponse.json({
    SUPABASE_URL: envVars.SUPABASE_URL || "Not Set",
    SUPABASE_ANON_KEY: envVars.SUPABASE_ANON_KEY ? "Set (value hidden)" : "Not Set",
    SUPABASE_BASE_KEY: envVars.SUPABASE_BASE_KEY ? "Set (value hidden)" : "Not Set",
  })
}

