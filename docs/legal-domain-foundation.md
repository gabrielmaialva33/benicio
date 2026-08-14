# Reviewed API and legal-domain foundation

This document records the backend boundary established before porting the `yol-benicio` frontend. The legacy projects
under `yol-benicio/` were treated as product and compatibility evidence, not as an architecture to copy. Unrelated
sibling projects are outside this scope.

## Implemented API

The API now owns the complete first legal-operations slice:

- rotating authentication sessions, tenant switching, users, roles, permissions, auditing, and tenant-aware files;
- clients, folders, judicial processes, and normalized process parties;
- tasks, hearings, deadlines, and canonical process movements;
- append-only folder/process activity timelines;
- legal-document metadata linked to the canonical `files` table;
- per-user folder favorites;
- dashboard aggregates and focused widgets backed by real PostgreSQL queries;
- recipient-owned notifications, internal messages, and private realtime delivery;
- persisted, user-owned AI conversations with normal and streaming responses.

Every tenant-scoped route requires authentication, an active tenant, throttling, and its explicit RBAC permission.
Cross-tenant or cross-owner reads return `404` to avoid resource enumeration.

## Authentication and tenancy

- API access JWTs expire after 15 minutes; browser sessions use a one-hour access cookie. Both carry a unique
  token-family ID plus the active tenant.
- Opaque refresh tokens expire after three days, are stored only as SHA-256 hashes, and rotate on every use.
- Reusing a rotated refresh token revokes the whole family. Logout revokes the current family and clears the HTTP-only
  access cookie.
- A user may belong to multiple tenants through `user_tenants`. Composite foreign keys keep tenant-owned relations
  inside the same tenant at the database boundary.
- The `x-tenant-id` header may select a membership; otherwise the signed JWT tenant claim is used.
- Permission identity is `(resource, action, context)`. `own` checks use the ownership repository; unsupported team or
  department scopes fail closed until they have a canonical membership source.

## Legal workflow invariants

- Client documents and folder codes are unique only among active rows in the same tenant.
- A folder references a non-deleted client from its tenant. A responsible lawyer, assignee, attendee, recipient, or
  sender must also be an active member of that tenant.
- A client with active folders and a folder with active processes cannot be deleted.
- A process must have a CNJ number, legacy number, or internal code. CNJ is stored as 20 digits, validated with Mod
  97-10, and decomposed into generated query columns.
- An active CNJ is unique per tenant. At most one active process is primary in a folder; switching it locks the folder
  and demotes the previous primary process atomically.
- Process parties are normalized and atomically replaced only when an update supplies `parties`.
- Tasks, hearings, and deadlines are separate entities. Status transitions maintain
  `completed_at`; hearings additionally own an explicit attendee pivot.
- Deadlines require a folder directly or derive it from a same-tenant process. Hearings always belong to a process.
- Process movements are canonical mutable records. Non-null `(tenant, source, external_id)` values make imports
  idempotent, while source and external ID become immutable after creation.
- Every material workflow mutation also records an append-only activity event. Activity uses an opaque keyset cursor so
  concurrent inserts do not corrupt pagination.
- Legal monetary values are `numeric(18,2)` and leave the API as decimal strings. Procedural dates are calendar dates;
  operational events use timezone-aware timestamps.

## Documents and favorites

- Upload metadata and blob location remain in `files`; `legal_documents` adds legal title, type, version, signature
  state, folder/process association, and arbitrary metadata.
- A legal document cannot link a file, folder, or process from another tenant. Deleting legal metadata does not delete
  the canonical uploaded file.
- Favorites are a unique `(tenant, user, folder)` pivot. `PUT`/`DELETE` are idempotent and `PATCH`
  is the compatibility toggle used by the legacy frontend.

## Dashboard, communication, and realtime

- Dashboard counts, breakdowns, monthly evolution, and widgets are queried from canonical tables; no legacy
  dashboard-view cache or mock totals are used.
- Notifications are visible and mutable only by their recipient. Regular users can read/update/ delete their own
  notifications but cannot create arbitrary notifications by default.
- Internal messages expose inbox, sent, and combined views. Only the recipient may mark or delete a message; both sender
  and recipient may read it.
- Database persistence is authoritative. Realtime broadcast is best-effort and never rolls back a successfully persisted
  notification or message.
- Transmit uses Redis-backed Server-Sent Events. Private channel authorization checks both active tenant and user
  identity for notification/message channels; the tenant activity channel checks active tenant membership.

## AI chat boundary

- `AI_PROVIDER=disabled` is the default. Chat endpoints return `503` before creating history when no valid provider is
  configured.
- The `openai_compatible` adapter calls `{AI_BASE_URL}/chat/completions`, supports optional Bearer credentials,
  validates unknown upstream payloads, normalizes errors, enforces a timeout, and parses SSE across arbitrary transport
  chunk boundaries.
- Conversation and message history is scoped by tenant and user. Only a bounded tail of the same conversation plus the
  configured system prompt is sent upstream.
- A conversation is locked as `generating` during a turn. Concurrent turns and deletion during generation return `409`;
  upstream failures persist an explicit `error` state.
- Production has no echo/fake fallback. Test providers are injected explicitly at the service boundary.

## Deliberate legacy breaks

The review intentionally did not carry forward:

- global uniqueness for legal identifiers that are tenant-owned;
- boolean `is_deleted` flags and hard deletes for workflow records;
- global `folders.is_favorite` state;
- hard-coded PostgreSQL enums for legal areas;
- folder-owned CNJ, court, parties, amounts, procedural dates, movements, and hearings;
- a second blob/document table duplicating `files`;
- conflating hearings and procedural deadlines;
- controller-level mass assignment, broad `try/catch`, or upstream error leakage;
- mock dashboard data, fake AI responses, or persistence that depends on realtime delivery.

## REST contract

- Paginated lists return `{ data, meta }`; single resources return `{ data }`; deletes return `204`
  except the idempotent favorite endpoints, which return their new state.
- Lists use `page`, `per_page` (maximum 100), allowlisted sorting, and explicit domain filters.
- Activity timelines use `{ data, meta: { has_more, next_cursor } }`.
- AI streaming emits content events, a conversation event, and `data: [DONE]`.
- The authoritative machine-readable contract is [`openapi.yaml`](openapi.yaml); executable request examples live in [
  `api.http`](api.http).
