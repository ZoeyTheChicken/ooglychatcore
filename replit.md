# Oogly Chat

A professional dark-themed community chat platform (v1.4) with admin panel, moderation tools, swear filtering, appeals, and audit logs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/oogly-chat run dev` — run the frontend (port 25076)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui
- API: Express 5
- DB: PostgreSQL (external Neon.tech) + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Auth: bcryptjs + in-memory session tokens (localStorage `oogly_token`)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, messages, bans, mutes, appeals, announcements, reactions, moderation_logs)
- `lib/db/src/index.ts` — Neon.tech DB connection (set DATABASE_URL env var)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/api-server/src/lib/swear-filter.ts` — Regex-powered swear filter
- `artifacts/api-server/src/middlewares/auth.ts` — Session auth middleware
- `artifacts/oogly-chat/src/` — React frontend
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Generated Zod schemas (do not edit)

## Architecture decisions

- Session tokens stored as in-memory Map (token → userId). For production scale, migrate to Redis or DB-backed sessions.
- External Neon.tech PostgreSQL — connection string in `DATABASE_URL` env var with `?sslmode=require`. `lib/db/src/index.ts` has a placeholder connection string.
- Swear filter uses normalized leetspeak expansion + regex patterns + combo detection (clanker/clank/clanka explicitly blocked).
- Username filter applied at registration — usernames with banned words are rejected.
- Messages polled every 3 seconds (no WebSocket in v1.4).
- Admin routes guarded by `requireAdmin` middleware (isAdmin || isOwner).

## Product

- **Chat**: Real-time message feed, reply threading, emoji reactions, compact mode, announcements banner, troll effects
- **Moderation**: Ban, mute, unban, unmute users with reason + optional expiry
- **Appeals**: Banned/muted users can submit appeals; admins see inbox with read/dismiss actions
- **Admin Panel**: Stats dashboard, user management, ban/mute management, appeals inbox, announcements, moderation audit log
- **Swear Filter**: Regex-powered with leetspeak normalization, combo detection, blocks clanker/clank/clanka
- **Settings**: Theme toggle (dark/light), notifications, sounds, compact mode

## User preferences

- App name: Oogly Chat (oogly.chat)
- Default dark theme, mid-light blue (#5aa9e6 area) accent
- Professional look — not AI-generated feeling
- External Neon.tech DB only — no Replit DB

## Gotchas

- Always rebuild libs (`pnpm run typecheck:libs`) after changing `lib/db/src/schema/` before typechecking the api-server
- After OpenAPI spec changes, always run codegen before implementing routes
- The `DATABASE_URL` env var must point to your Neon.tech connection string — the placeholder in `lib/db/src/index.ts` is for reference only
- Do NOT push schema with `pnpm --filter @workspace/db run push` against Neon.tech unless you want to overwrite the existing schema

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
