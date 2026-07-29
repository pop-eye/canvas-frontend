/**
 * Which sign-in methods the Supabase project actually has enabled, so the UI
 * only offers providers that work. Reads the public auth settings endpoint.
 */
export interface EnabledProviders {
  email: boolean
  google: boolean
  github: boolean
}

const FALLBACK: EnabledProviders = { email: true, google: false, github: false }
let cache: EnabledProviders | null = null

export async function fetchEnabledProviders(): Promise<EnabledProviders> {
  if (cache) return cache
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key) return FALLBACK
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    if (!res.ok) return FALLBACK
    const s = await res.json()
    cache = {
      email: s?.external?.email !== false,
      google: !!s?.external?.google,
      github: !!s?.external?.github,
    }
    return cache
  } catch {
    return FALLBACK
  }
}
