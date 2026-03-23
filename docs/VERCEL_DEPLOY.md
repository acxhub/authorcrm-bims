# Vercel + React Router (Vite SPA)

## Why refresh “breaks” routes

This app uses **React Router** (`BrowserRouter`) and **client-side** routes only. The server must serve **`index.html`** for every path that is not a real static file (`/assets/*`, `/favicon.ico`, etc.). Otherwise a refresh on `/admin` asks the CDN for a file named `admin` → **404** or wrong behavior.

Your repo already has [`vercel.json`](../vercel.json) with a catch-all rewrite to `/index.html`. If refresh still fails, fix **Vercel project settings** (below), not routes in `App.tsx`.

## Vercel project settings

1. **Vercel Dashboard** → your project → **Settings** → **General**
   - **Root Directory**: repo root (or your app folder if monorepo).
   - **Framework Preset**: **Vite** (auto-detects `npm run build` and output **`dist`**).

2. **Settings** → **Environment Variables** (Production + Preview)

   | Name | Notes |
   |------|--------|
   | `VITE_SUPABASE_URL` | Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |

   Redeploy after changing env vars.

3. **Deployments** → open latest → confirm **Build Output** contains `index.html` at the root of the deployment and `assets/` with hashed JS/CSS.

## Supabase Auth (production URL)

**Authentication** → **URL configuration**:

- **Site URL**: `https://your-production-domain.com`
- **Redirect URLs**: include  
  - `https://your-production-domain.com/**`  
  - `http://localhost:8080/**` (dev)  
  - Optional: `https://*.vercel.app/**` for preview deployments

Without this, magic links / OAuth can misbehave after deploy (not always the same as “refresh to dashboard”).

## “Refresh sends me to the dashboard (`/`)”

That is often **not** a routing bug:

- Routes under **`/admin/*`**, **`/lead-manager`**, etc. use **`ProtectedRoute`** with **`requiredRole`**.
- If your user is **`sales`**, opening or refreshing `/admin` loads the app, then React sends you to **`/`** by design.

Check role vs path in [`src/components/ProtectedRoute.tsx`](../src/components/ProtectedRoute.tsx).

## Optional checks

- **Hard refresh** with DevTools → **Network**: first document request should be **200** HTML (`index.html`), not 404.
- **Subpath deploy** (e.g. `example.com/app/`): you must set Vite `base: '/app/'` and React Router `basename="/app"` — not the default for this repo.

## Summary checklist

- [ ] `vercel.json` present with SPA rewrite (already in repo).
- [ ] Framework **Vite**, output **`dist`**, env vars set on Vercel.
- [ ] Supabase **Site URL** + **Redirect URLs** include production (and previews if needed).
- [ ] If you land on `/` after visiting an admin URL, confirm your **role** is allowed for that route.
