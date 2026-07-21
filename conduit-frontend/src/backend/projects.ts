/**
 * Cloud projects + share links (Supabase). Every function assumes cloud is
 * configured — callers gate on isCloudEnabled() / an authenticated user first.
 */
import { requireSupabase } from "./supabase"
import type { ProjectState } from "./projectState"

export interface ProjectRow {
  id: string
  name: string
  updated_at: string
}

export async function listProjects(): Promise<ProjectRow[]> {
  const { data, error } = await requireSupabase()
    .from("projects")
    .select("id,name,updated_at")
    .order("updated_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createProject(name: string, state: ProjectState): Promise<string> {
  const sb = requireSupabase()
  const { data: userData } = await sb.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error("Not signed in")
  const { data, error } = await sb
    .from("projects")
    .insert({ owner: uid, name, state })
    .select("id")
    .single()
  if (error) throw error
  return data.id as string
}

export async function updateProject(id: string, name: string, state: ProjectState): Promise<void> {
  const { error } = await requireSupabase().from("projects").update({ name, state }).eq("id", id)
  if (error) throw error
}

export async function fetchProject(id: string): Promise<{ name: string; state: ProjectState }> {
  const { data, error } = await requireSupabase().from("projects").select("name,state").eq("id", id).single()
  if (error) throw error
  return { name: data.name as string, state: data.state as ProjectState }
}

export async function renameProject(id: string, name: string): Promise<void> {
  const { error } = await requireSupabase().from("projects").update({ name }).eq("id", id)
  if (error) throw error
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await requireSupabase().from("projects").delete().eq("id", id)
  if (error) throw error
}

/** Create (or reuse) a share link and return the full URL. */
export async function createShareLink(projectId: string): Promise<string> {
  const sb = requireSupabase()
  const { data: userData } = await sb.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error("Not signed in")

  const existing = await sb.from("project_shares").select("token").eq("project_id", projectId).limit(1).maybeSingle()
  let token = existing.data?.token as string | undefined
  if (!token) {
    const { data, error } = await sb
      .from("project_shares")
      .insert({ project_id: projectId, owner: uid })
      .select("token")
      .single()
    if (error) throw error
    token = data.token as string
  }
  return `${window.location.origin}/share/${token}`
}

/** Resolve a share token to a read-only project via the security-definer RPC. */
export async function getSharedProject(token: string): Promise<{ name: string; state: ProjectState } | null> {
  const { data, error } = await requireSupabase().rpc("get_shared_project", { share_token: token })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return { name: row.name as string, state: row.state as ProjectState }
}
