# ZXKING File Hub

Minimal Cloudflare Pages + Supabase file hub starter.

## Files
- `index.html`, `app.js`, `style.css`: browser app
- `functions/api/config.js`: returns only the public Supabase URL and publishable key
- `functions/api/download/[id].js`: server-side signed download route
- `supabase/setup.sql`: database, RLS and private bucket setup

## Cloudflare Pages settings
- Framework preset: None
- Build command: leave blank
- Build output directory: `/` (or `.` if the dashboard requires a value)
- Root directory: `/`
- Keep the `functions` folder at repository root.

## Cloudflare Pages environment variables
Set these under Pages project > Settings > Variables and Secrets:
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` = your `sb_publishable_...` key
- `SUPABASE_SECRET_KEY` = your `sb_secret_...` key, stored as a Secret, never as a plain variable

The secret key is used only by the server-side download function. Never put it in `index.html`, `app.js`, or any `VITE_` variable.

## Supabase
1. Review `supabase/setup.sql` before running it in SQL Editor.
2. Confirm bucket `zxking-files` is private.
3. Enable email/password auth.
4. Add your deployed Cloudflare Pages URL to Authentication > URL Configuration > Site URL and Redirect URLs.

## Important limitations
This starter supports account signup/login, uploads up to 50 MB, owner-only file listing, and two-minute signed downloads. It is a starter, not a complete production service. Download counting, rate limiting, abuse controls, deletion UI, and payments/earnings need further implementation and testing before public launch.
