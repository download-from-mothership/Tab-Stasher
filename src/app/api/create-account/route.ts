import { createServerClientInstance } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    const { email, password } = requestData

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const supabase = await createServerClientInstance(cookieStore)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      user: data.user,
      message: "Check your email to confirm your account"
    })
  } catch (err) {
    console.error("Error creating account:", err)
    return NextResponse.json(
      { error: "An error occurred while creating your account" },
      { status: 500 }
    )
  }
} 