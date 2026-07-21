# CONDUIT Cloud — setup & test

Accounts, cloud projects, and share links run on **Supabase**. They are
**optional**: with no Supabase env vars set, the app runs fully local
(localStorage) exactly as before — no cloud UI, no accounts. Setting the two env
vars below turns everything on.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Note the project ref; pick a region near your users.

## 2. Run the schema

Open **SQL Editor** in the Supabase dashboard, paste the contents of
[`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql), and
run it. (Or, with the Supabase CLI: `supabase db push`.) This creates:

- `profiles` (per-user, carries `plan`) — auto-created on sign-up.
- `projects` (a saved rig; `state` is the serialized canvas) — RLS: owner only.
- `custom_devices` (the user's personal library) — RLS: owner only.
- `project_shares` (unguessable token → project) + `get_shared_project(token)`
  RPC for public read-only access. The table itself is never exposed.
- `device_contributions` (the condu-scraper queue) — RLS: submitter reads/inserts
  own; the scraper uses the service-role key to verify + publish.

## 3. Enable auth providers

**Authentication → Providers**:

- **Email** — enabled by default (magic-link sign-in works immediately).
- **Google** and **GitHub** — enable each and paste in the OAuth client
  ID/secret from their consoles. (GitHub pairs nicely with the open-standard
  contribution story.)

**Authentication → URL Configuration**:

- **Site URL**: your deployment origin (e.g. `https://conduit.up.railway.app`).
- **Redirect URLs**: add both the deployment origin and `http://localhost:5173`
  so magic links / OAuth work in dev and prod.

## 4. Set the env vars

From **Settings → API**, copy the **Project URL** and the **anon public** key.

Locally, in `conduit-frontend/.env`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

On **Railway**, add the same two variables to the service and redeploy. (Vite
inlines `VITE_*` at build time, so a rebuild is required to pick them up.)

> The anon key is safe to ship in the browser — Row-Level Security protects every
> row. The **service-role** key is never used by the frontend; keep it only in
> the condu-scraper / server side.

## 5. Test the flow

1. `npm run dev`, open the app — a **Sign in** entry appears top-right.
2. Sign in (magic link or Google/GitHub).
3. Build a rig, then **account menu → Cloud projects → Save current rig**.
4. Reload the page, open the project — it restores canvas, room, 3D placements
   and pricing.
5. In Cloud projects, click the **share** icon → link is copied. Open it in a
   private window → the read-only `/share/:token` view loads with no sign-in.

## 6. condu-scraper hookup (Phase D)

The scraper connects to the same Postgres with the **service-role** key:

- Poll `device_contributions where status = 'pending'`.
- Extract/verify the full conduit/v1 profile from `source_urls`.
- Set `status = 'verified'`, then publish to the open-standard repo and set
  `status = 'published'`.

RLS is bypassed by the service role, so no extra policies are needed for the
worker. This closes the flywheel: in-app custom device → queue → scraper → public
catalog.

## Notes

- **Routing**: `/share/:token` is a client route; `vite preview` (what Railway
  runs) serves the SPA fallback, so deep links work. If you host the static
  build elsewhere, ensure unknown paths fall back to `index.html`.
- **Plans / billing**: `profiles.plan` is in place for gating (free vs pro);
  wire Stripe + limits when you're ready to charge.
