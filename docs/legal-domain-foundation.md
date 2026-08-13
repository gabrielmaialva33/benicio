# Legal domain foundation

This document records the decisions behind the first two legal-domain slices. The legacy legal API
was used as evidence, not as the target design.

## Implemented slices

The foundation now owns three aggregates:

- `clients`: a tenant's legal clients;
- `folders`: the internal matter/folder used to organize work for one client;
- `processes`: canonical court proceedings attached to a folder, with `process_parties` as owned
  child records.

All resources expose endpoints under `/api/v1`, require an active tenant, use permission
middleware, validate requests with VineJS, and soft-delete with `deleted_at`.

## Invariants

- Every client, folder, process, and process party belongs to exactly one tenant.
- Client documents and folder codes are unique only among active records in the same tenant.
- A folder must reference a non-deleted client from the same tenant. The database enforces this
  with a composite foreign key, in addition to service validation.
- A responsible lawyer is optional, but when present must be an active user who belongs to the
  selected tenant.
- A client with active folders cannot be deleted.
- A folder with active processes cannot be deleted.
- Cross-tenant lookups return `404`, avoiding both data leakage and resource enumeration.
- Company documents accept the 14-position alphanumeric CNPJ format; formatting characters are
  removed and letters are stored uppercase.
- A process must have a CNJ number, a legacy number, or an internal code. CNJ numbers are stored as
  20 digits, validated with Mod 97-10, and split into generated query columns.
- An active CNJ number is unique per tenant, not globally. Legacy numbers remain available for
  proceedings outside the current CNJ format.
- Parties are normalized records because a process can have multiple parties and party documents
  are searchable. Supplying `parties` in an update replaces the list atomically.
- At most one active process is primary in a folder. Selecting it locks the folder and demotes the
  previous primary process in the same transaction.
- Legal monetary values are `numeric(18,2)` and leave the API as decimal strings. Procedural dates
  are calendar dates, while audit fields remain timestamps.
- `electronic` is nullable: `null` represents information that the source did not provide.

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

Bank automation and its import lifecycle are separate concerns and are deliberately outside this
legal-domain foundation. Favorites will be a `(user, folder)` relation, and legal documents will
reference the existing tenant-aware `files` table.

## REST contract

Lists return the Lucid paginator shape `{ data, meta }`. Single-resource, create, and update
responses return `{ data }`. Deletes return `204`.

List queries use `page`, `per_page` (maximum 100), `sort_by`, `order`, and resource-specific
filters. Sort fields are allowlisted.

## Next slices

1. movements, hearings, tasks, and procedural deadlines;
2. folder files and per-user favorites.
