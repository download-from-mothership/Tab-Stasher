import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { env } from "@/lib/env"

export async function middleware(request: NextRequest) {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = env()

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Supabase URL or Anon Key is missing in middleware")
      throw new Error("Supabase configuration is incomplete")
    }

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          request.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove: (name, options) => {
          request.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      if (request.nextUrl.pathname.startsWith("/auth")) {
        // User is logged in, redirect to home page
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }
    } else {
      if (!request.nextUrl.pathname.startsWith("/auth")) {
        // No user, redirect to login page
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        url.searchParams.set("next", request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }
    }

    // Continue with the request
    return NextResponse.next()
  } catch (error) {
    console.error("Middleware error:", error)
    // Return a basic response to avoid crashing
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public file extensions
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

