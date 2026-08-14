# Copilot Instructions for Benício

Read and follow the repository-level `AGENTS.md` before changing code. It is the canonical source for project structure,
commands, tests, and conventions.

## Architecture

Benício is an AdonisJS 7, React 19, and Inertia application organized as a modular monolith.

- Backend domains live in `app/modules/<domain>/` and own their controllers, services, repositories, models, validators,
  and routes.
- Cross-cutting code lives in `app/shared/`; typed HTTP errors live in `app/exceptions/`.
- React pages and UI code live under `inertia/`.
- Web and REST controllers are thin delivery adapters. Business behavior belongs in shared application services, never
  duplicated between Inertia and `/api/v1`.
- Tenant-scoped business models use `TenantBaseModel` and every external input is validated at the boundary.

## Imports and generators

Use only aliases declared in `package.json`, especially `#modules/*`, `#shared/*`, and
`#exceptions/*`. Adonis generators use the framework's default layout; move generated files into the owning module and
fix their imports before continuing.

Run Ace commands through `pnpm ace <command>`, not `node ace`.

## Validation

Before handing off a change, run the checks relevant to it:

```sh
pnpm typecheck
pnpm lint
pnpm test:e2e
pnpm test:ui
pnpm build
```
