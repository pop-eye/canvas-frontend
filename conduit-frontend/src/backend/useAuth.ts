/**
 * Auth state + actions over Supabase. Safe when cloud is disabled: the hook
 * simply reports no user and the actions are no-ops.
 */
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "./supabase"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { user, loading }
}

export async function signInWithEmail(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "Cloud not configured" }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  return { error: error?.message }
}

export async function signInWithProvider(provider: "google" | "github"): Promise<{ error?: string }> {
  if (!supabase) return { error: "Cloud not configured" }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  })
  return { error: error?.message }
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
}
