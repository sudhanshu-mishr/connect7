# CONNECT

A Next.js + Supabase social app starter focused on meaningful, compatibility-first connections. It is based on the uploaded CONNECT build notes and implements the main product flow in a coherent project structure.

## Product flow

1. Create an account and verify/sign in through Supabase Auth.
2. Complete a short profile.
3. Answer the 10-question mindset and connection assessment.
4. Discover profiles with **80% or higher** compatibility. The starter compares each answer dimension; multi-select questions use Jaccard similarity.
5. Send a connection request. The recipient can accept or decline.
6. Accepting a request creates a mutual connection and a private conversation.
7. Connected members can exchange text messages.
8. Members can create/join interest circles and share photo-only posts.

The app includes profile editing, requests, notifications, an admin overview, a mobile bottom navigation, and a desktop sidebar.

## Requirements

- Node.js 18.17+ (Node 20 LTS recommended)
- npm
- A Supabase project

## Local setup

```bash
cp .env.example .env.local
# Add your Supabase project URL and anon key to .env.local
npm install
```

In the Supabase dashboard:

1. Open **SQL Editor** and run all of `supabase/schema.sql`.
2. In **Authentication → Providers**, enable Email.
3. For local testing, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to allowed redirect URLs. You may disable email confirmation during private development only.
4. In **Project Settings → API**, copy the project URL and anon/public key into `.env.local`.
5. Never put the service-role key in a `NEXT_PUBLIC_` variable or browser code. This starter does not require it for the core flows.

Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser-safe Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Site origin used for email verification redirects (e.g. `https://your-app.vercel.app`) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Reserved for trusted server-side administration; not used in normal app flows |

## Deploy to Vercel

1. Push this folder to a private GitHub repository.
2. Import it into Vercel.
3. Add the two required Supabase environment variables to Preview and Production.
4. Deploy. Add the production Vercel URL to Supabase Auth's Site URL and redirect allow-list.

`vercel.json` is included with basic security headers.

## Important implementation notes

- The uploaded source material was a long transcript containing code snippets from several build phases, not a complete file-by-file repository or a ready-to-run ZIP. This project consolidates the intended features into a consistent starter codebase rather than pretending the transcript itself was a finished repository.
- Compatibility is an initial transparent matching heuristic, not a scientifically validated personality test. The 80% threshold is a product rule and should be tested with real users before launch.
- The included messaging experience is a simple authenticated text inbox. Realtime delivery, typing indicators, read receipts, group chat, photo comments, block/report workflows, full moderation tooling, email templates, automated tests, and accessibility audits still need further production work.
- Photo uploads are limited to image files up to 8 MB and stored in the `connect-photos` bucket. The SQL creates a public bucket so feed images can render. For a private production community, switch to a private bucket and signed URLs.
- The admin overview is guarded by `profiles.is_admin`. Promote an account manually in the SQL editor after signup using the commented statement at the bottom of `supabase/schema.sql`.
- Never trust client-side profile fields, uploaded media, or user-generated text without server-side validation and moderation. Add rate limits, abuse prevention, privacy/legal review, backups, and monitoring before public launch.

## Main structure

```text
src/
  actions/       Server actions for auth, profile, assessment, requests, social features
  app/           App Router pages
  components/    Shared UI and navigation
  lib/           Supabase clients, assessment questions, matching utilities
supabase/
  schema.sql     Database tables, RLS policies, storage bucket and triggers
```
