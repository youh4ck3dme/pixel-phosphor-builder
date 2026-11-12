# AGENTS.md — Security & Coordination Rules

These rules apply to every AI agent working on this repository (Lovable AI and any local development agent). Follow them at all times. When in doubt, stop and ask the project owner instead of improvising.

## Secrets & environment

- `.env` is **tracked on purpose**. In this Lovable Cloud project it contains only public client keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — a public anon token) that Vite inlines at build time. **Never remove `.env` from the repository and never add it to `.gitignore`.** Removing it breaks the production build.
- Real secrets (`MISTRAL_API_KEY`, service-role keys, database passwords) belong **only** in Lovable Project Secrets (production) or in `.env.local` (local development — gitignored, loaded by Vite with higher priority).
- Never print, log, or commit secret values. Always `.gitignore`-check before staging anything that could contain credentials.

## Security guards — do not weaken

- `POST /api/generate` and `POST /api/enhance` require an authenticated, non-anonymous Supabase user (see `src/lib/server-auth.ts`). Never remove, bypass, or loosen these guards — they protect paid AI credits.
- Client-side AI calls must send `Authorization: Bearer <session access token>` and redirect unauthenticated users to `/auth`.
- Supabase RLS policies, auth configuration, and database rules must never be changed without explicit user approval.
- Server-only keys are read exclusively inside server handlers via `process.env`. Never import server environment variables into a client bundle.

## Git & Lovable sync protocol

- Synchronized branch: `main`. Use normal commits only. **Never force-push, never `git reset --hard`, never drop stashes or discard unreviewed work.**
- Always `git fetch` and rebase onto the latest `origin/main` before starting work or pushing. If another side (Lovable or local) is editing the same files, stop and coordinate first.
- Lovable-generated lockfiles (`bun.lockb`) are authoritative. Do not commit locally regenerated lockfiles over them.
- A push is not a deploy. Publishing the app and applying migrations happen only in the Lovable dashboard, by the project owner.

## Design system — untouchable

"Phosphor Noir": AMOLED black background, amber + phosphor green accents, 5px border radius, hairline borders, full-height stable layout (`100dvh`), no carousels. Do not redesign or restyle without an explicit request.

## AI generation output

The HTML produced by the app's AI generation pipeline must follow the security rules embedded in `SYSTEM_PROMPT` (`src/lib/ai.ts`): single self-contained document, XSS-safe escaping of user text, no `eval`/`new Function`, no `javascript:` URLs, no embedded secrets, no external scripts or network requests except fonts.googleapis.com / fonts.gstatic.com.
