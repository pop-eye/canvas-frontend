/**
 * Supabase client — the cloud backbone (auth, cloud projects, share links).
 *
 * Entirely optional. When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are unset
 * the client is null, `isCloudEnabled()` is false, and every cloud feature is
 * hidden — the app runs fully local (localStorage) exactly as before. This gate
 * is the contract that keeps the local-only experience untouched.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

/** True only when both env vars are present. Guard every cloud code path with this. */
export function isCloudEnabled(): boolean {
  return supabase !== null
}

/** Narrowing helper so callers get a non-null client or a clear throw. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Cloud is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)")
  return supabase
}
