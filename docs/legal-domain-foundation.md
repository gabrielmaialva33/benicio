# Legal domain foundation

This document records the decisions behind the first legal-domain slice. The legacy API was used
as input, not as the target design.

## First slice

The first slice owns two aggregates:

- `clients`: a tenant's legal clients;
- `folders`: the internal matter/folder used to organize work for one client.

Both resources expose CRUD endpoints under `/api/v1`, require an active tenant, use permission
middleware, validate requests with VineJS, and soft-delete with `deleted_at`.

## Invariants

- Every client and folder belongs to exactly one tenant.
- Client documents and folder codes are unique only among active records in the same tenant.
- A folder must reference a non-deleted client from the same tenant. The database enforces this
  with a composite foreign key, in addition to service validation.
- A responsible lawyer is optional, but when present must be an active user who belongs to the
  selected tenant.
- A client with active folders cannot be deleted.
- Cross-tenant lookups return `404`, avoiding both data leakage and resource enumeration.
- Company documents accept the 14-position alphanumeric CNPJ format; formatting characters are
  removed and letters are stored uppercase.

## Deliberate legacy breaks

The following legacy choices were not carried forward:

- global uniqueness for documents and folder codes;
- boolean `is_deleted` flags;
- global `folders.is_favorite` state;
- hard-coded PostgreSQL enums for legal areas;
- folder-owned CNJ, court, parties, amounts, procedural dates, movements, and hearings;
- a second document table that duplicates the kit's `files` module;
- unvalidated mass assignment and controller-level `try/catch` blocks that leaked errors;
- `limit`, ignored sorting parameters, and inconsistent single-resource envelopes.

Process data belongs to a forthcoming `processes` slice. Favorites will be a `(user, folder)`
relation, and legal documents will reference the existing tenant-aware `files` table.

## REST contract

Lists return the Lucid paginator shape `{ data, meta }`. Single-resource, create, and update
responses return `{ data }`. Deletes return `204`.

List queries use `page`, `per_page` (maximum 100), `sort_by`, `order`, and resource-specific
filters. Sort fields are allowlisted.

## Next slices

1. `processes`, including CNJ, court, parties, procedural state, values, and dates;
2. source-aware BMG/Daycoval ingestion and human review state;
3. movements, hearings, tasks, and deadlines;
4. folder files and per-user favorites.
