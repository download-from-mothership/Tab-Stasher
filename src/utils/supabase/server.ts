import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Export the function as createServerClientInstance
export const createServerClientInstance = async (cookieStore: ReturnType<typeof cookies>) => {
  const resolvedCookies = await cookieStore;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return resolvedCookies.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => resolvedCookies.set(name, value, options));
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};
