# Poli — Web App

Vite + React project wrapping the Poli civic intelligence platform.

## Local development

```bash
npm install
npm run dev
```

## Before your first deploy

Add two icon files (used for the homescreen icon on iOS/Android):
- `public/icons/icon-192.png` (192×192)
- `public/icons/icon-512.png` (512×512)

Anything terracotta/`#E8573A`-on-white with the Poli mark works. The app runs fine without these, but the "Add to Home Screen" icon will fall back to a generic browser icon until they're added.

## Connect Supabase (live data)

**1.** Copy `.env.local.example` to a new file named `.env.local` (same folder).

**2.** Open `.env.local` and fill in your real values from your Supabase project → Settings (gear icon) → API:
   - `VITE_SUPABASE_URL` → your Project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon public key

`.env.local` is already in `.gitignore` — it will never be pushed to GitHub, so your keys stay private to your machine.

**3.** Run `npm install` again (picks up the new Supabase library), then `npm run dev`.

**4.** Open your browser's developer console (Cmd+Option+I in Chrome/Safari → Console tab) and refresh the page. You should see:
```
✅ Supabase connected — mps table has 0 row(s).
```
That confirms the app can talk to your database. (0 rows is correct — we haven't loaded any MPs in yet.)

For deployed (Vercel) builds, add the same two variables under Project Settings → Environment Variables in Vercel, since `.env.local` only works on your own machine.

## Push to GitHub (first time)

1. Go to github.com → click the **+** in the top right → **New repository**
2. Name it `poli-web`, leave it empty (no README/license — you already have files), click **Create repository**
3. In your terminal, from inside this project folder:

```bash
git init
git add .
git commit -m "Initial commit — Poli web app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/poli-web.git
git push -u origin main
```

GitHub will ask you to sign in the first time you push — follow its prompt (browser login or a personal access token).

## Deploy to Vercel

1. Go to vercel.com → sign in with your GitHub account
2. **Add New... → Project**
3. Select the `poli-web` repo from the list
4. Vercel auto-detects Vite — leave build settings as-is
5. Click **Deploy**

You'll have a live URL (`poli-web-xxxx.vercel.app`) within about a minute. Every future `git push` to `main` redeploys automatically.
