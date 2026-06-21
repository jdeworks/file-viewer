# Project Overview

This is a TypeScript monorepo for a SaaS application. Read `ARCHITECTURE.md` for
the full system design before making structural changes.

## Repository Structure

- `apps/web` — Next.js 14 frontend (App Router)
- `apps/api` — Fastify REST API
- `packages/shared` — shared types, utils, and constants
- `packages/ui` — component library (Radix UI + Tailwind)

## Build & Development

```bash
pnpm install        # install dependencies
pnpm dev            # start all apps in dev mode
pnpm build          # production build
pnpm test           # run all tests
pnpm lint           # lint all packages
```

## Code Conventions

- All new code must be TypeScript; `any` is banned
- Use `zod` for runtime validation at API boundaries
- Database access only through `packages/db` — no raw SQL in app code
- API routes follow REST conventions: noun-based paths, proper status codes
- Frontend state: use React Query for server state, Zustand for client state

## Testing

- Unit tests: Vitest, co-located with source (`*.test.ts`)
- Integration: tests in `tests/` folder per package
- E2E: Playwright tests in `apps/web/e2e/`
- Run `pnpm test` before any PR; CI will fail on coverage drop

## Commit & PR Rules

- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- PRs require passing CI and one approval
- Breaking changes need a migration guide in the PR description

## Security Notes

- Never log PII or secrets
- All user input must be validated server-side
- Rate limiting is applied at the API gateway — don't duplicate in handlers
