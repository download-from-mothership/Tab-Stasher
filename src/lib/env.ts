// We don't need envRef for this implementation
// const envRef = {
//   current: {
//     SUPABASE_URL: "",
//     SUPABASE_ANON_KEY: "",
//     SUPABASE_BASE_KEY: "",
//   },
// }

// This function is not necessary in this implementation
// export const reloadEnv = () => {
//   // Implementation removed
// }

// Remove the call to reloadEnv as it's no longer needed
// reloadEnv()

export function env() {
  return {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_BASE_KEY: process.env.SUPABASE_BASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

// For debugging purposes, you can log the environment variables here
console.log("Environment variables:", {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_BASE_KEY: process.env.SUPABASE_BASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

