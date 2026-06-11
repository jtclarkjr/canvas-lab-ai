# Role-Based Access Control (RBAC)

Canvas sharing is built around four roles. The server is the single source of
truth for authorization — all client-side gating is UX only and every API
route re-checks the caller's role on each request.

## Roles

| Role | How it is granted | Capabilities |
| --- | --- | --- |
| `owner` | Implicit: `canvases.created_by`. Not stored in `canvas_members`, cannot be changed or removed. | Everything: edit all elements, rename, delete the canvas, manage members and access requests. |
| `admin` | Row in `canvas_members` | Edit **all** elements, rename the canvas, open the full share dialog, add/remove members, change roles, approve/deny access requests. Cannot delete the canvas. |
| `editor` | Row in `canvas_members` | Draw and create elements; edit, move, erase, and delete **only elements they created** (`canvas_elements.created_by`). Cannot rename the canvas or manage sharing. |
| `reader` | Row in `canvas_members` | View only: pan, zoom, hover. Appears in presence (avatar + live cursor). Locked to the hand tool; cannot draw, edit, delete, or rename. |

Role precedence: `owner (3) > admin (2) > editor (1) > reader (0)` — see
`ROLE_RANK` / `roleAtLeast()` in `src/lib/canvas/roles.ts`.

Notes:

- Elements with `created_by IS NULL` (rows that predate the sharing
  migration backfill) are editable by owner/admin only; editors are denied.
- Any member (including readers) may remove **themselves** from a canvas.
- Everyone with access can copy the share link; only owner/admin see the
  member-management sections of the share dialog.

## Share links and the request-access flow

A share link is just the canvas URL (`/canvas/<id>`). Links grant no role.

1. **Unauthenticated** visitor → redirected to `/login?redirect=…`
   (`src/hooks.server.ts`).
2. **Authenticated non-member** → the page load
   (`src/routes/canvas/[canvasId]/+page.server.ts`) resolves access
   server-side and renders `RequestAccessScreen` instead of the workspace.
   A canvas that does not exist renders a "Canvas not found" screen — 404 is
   reserved for genuinely missing canvases, never used to mask denial.
3. The visitor clicks **Request access**, creating a `pending` row in
   `canvas_access_requests` (one live pending request per user per canvas,
   enforced by a partial unique index).
4. Owner/admins on the canvas receive a **realtime toast + badge** on the
   share button. Approving (with a role picker, default `reader`) upserts a
   `canvas_members` row and marks the request `approved`.
5. The waiting requester's screen is subscribed to its request row and
   **auto-enters the canvas** on approval (no refresh). Denied requests show
   a "request again" state.

Revocation is also live: if a member's row is updated or deleted, their
client re-runs the page load immediately (workspace `canvas_members`
listener) and falls back to the request-access screen; any in-flight API
call that returns 403 `canvas_access_denied` triggers the same.

## Data model

Defined in `supabase/migrations/` (baseline = pre-existing schema; sharing =
this feature). Types mirrored in `src/lib/server/database.types.ts`.

```
profiles                 one-to-one with auth.users, synced by trigger
  id, email, display_name, avatar_url, avatar_color, last_seen, …

canvases                 owner = created_by (auth.users)
  id, title, created_by, created_at

canvas_members           role enum: admin | editor | reader
  id, canvas_id, user_id, role, invited_by, created_at, updated_at
  unique (canvas_id, user_id); replica identity full (realtime DELETEs)

canvas_access_requests   status enum: pending | approved | denied
  id, canvas_id, requester_id, status, resolved_by, resolved_role, …
  partial unique index on (canvas_id, requester_id) where status = 'pending'

canvas_elements
  …, created_by (element author — drives editor permissions), updated_by
```

`public.profiles` is kept in sync with `auth.users` by the
`sync_profile_from_auth_user()` trigger (insert + update) so member search
and member lists have emails/names/avatars. Existing users were backfilled.

## Server enforcement

`src/lib/server/canvas-access.ts`:

- `resolveCanvasAccess(supabase, canvasId, userId)` → `{ canvas, role | null }`.
  Throws 404 `canvas_not_found` if the canvas does not exist.
- `requireCanvasRole(supabase, canvasId, userId, min)` → throws
  403 `canvas_access_denied` for non-members (this is what routes the client
  to the request-access screen) or 403 `insufficient_role` when the role is
  below `min`.

Route authorization matrix:

| Endpoint | Minimum role |
| --- | --- |
| `GET /api/canvases` | any auth (returns owned + shared, each with `role`) |
| `GET /api/canvases/[id]` | reader |
| `PATCH /api/canvases/[id]` (rename) | admin |
| `DELETE /api/canvases/[id]` | owner |
| `GET /api/canvases/[id]/elements` | reader |
| `POST /api/canvases/[id]/elements` | editor — update path additionally requires `created_by = caller` unless admin/owner; element ids cannot be reused across canvases |
| `DELETE /api/canvases/[id]/elements/[elementId]` | editor — own elements only unless admin/owner |
| `GET/POST /api/canvases/[id]/members`, `PATCH/DELETE /api/canvases/[id]/members/[userId]` | admin (exception: self-leave via DELETE needs reader) |
| `GET /api/canvases/[id]/access-requests`, `PATCH …/[requestId]` | admin |
| `POST /api/canvases/[id]/access-requests`, `GET …/me` | any auth (idempotent for an existing pending request) |
| `GET /api/users/search?q=` | any auth (min 2 chars, max 10 results, excludes self) |

Error codes the client branches on (serialized by
`src/lib/server/api-error.ts`, surfaced via `ApiClientError.code`):
`canvas_not_found`, `canvas_access_denied`, `insufficient_role`,
`element_not_found`, `element_forbidden`, `already_member`,
`cannot_modify_owner`, `member_not_found`, `request_not_found`,
`request_already_resolved`.

## Realtime + RLS

The server uses the service-role key (bypasses RLS); all writes go through
the API. RLS exists to scope what **clients** can read directly — which is
what authorizes realtime `postgres_changes` subscriptions:

- `canvas_access_requests`: readable by the requester and canvas
  owner/admins (`is_canvas_admin()`), so request notifications are only
  delivered to people allowed to act on them, as a database guarantee.
- `canvas_members`: readable by anyone with access to the canvas
  (`can_view_canvas()`), powering live revocation handling.
- `profiles`: self-only select (pre-existing); user search goes through the
  server API.
- `canvases` / `canvas_elements`: pre-existing broad authenticated-read
  policies are unchanged so the existing element-sync subscription keeps
  working. Tightening these to member-scoped reads is possible later but
  must be verified against the element realtime channel first.

Because the new policies are user-scoped, clients call
`supabase.realtime.setAuth(<access_token>)` before subscribing (see
`RequestAccessScreen.svelte` and the workspace notification effects).

Channels used per canvas: `canvas:{id}:drawings` (element sync, pre-existing),
`{id}` (presence/cursors, pre-existing), `canvas:{id}:access-requests`
(owner/admin notifications), `canvas:{id}:my-access` (requester waiting for
approval), `canvas:{id}:membership` (member revocation/role changes).

Known limitation: the presence/cursor channel is a public broadcast channel —
anyone who knows the canvas UUID can join it. Proper scoping needs Supabase
private channels and is out of scope here.

## Client gating (UX only)

`CanvasWorkspace.svelte` receives `role` from the page load:

- `canEdit` (`role !== 'reader'`) — readers are forced onto the hand tool,
  the SVG layer keeps `pointer-events: none`, and the toolbar
  (`CanvasToolbar readOnly`) hides edit tools.
- `canManageCanvas` (owner/admin) — gates title editing and the share
  dialog's management sections.
- `canModifyElement(id)` — editors are checked against an element-ownership
  map (`created_by`, maintained from the initial load, realtime inserts, and
  local creates); selection, drag, erase, double-click-edit, and delete all
  filter through it.

UI entry points: `CanvasOptionsButton.svelte` (share button right of the
presence avatars: Share… / Copy link, pending-request badge),
`ShareDialog.svelte` (link, add people via search, members list with role
editing, pending requests), `RoleBadge.svelte`, and the "Shared with me"
section in `CanvasHome.svelte`.

## Applying the schema

The migrations in `supabase/migrations/` must be applied to the Supabase
project before any of this works (Dashboard SQL editor or `supabase db
push`). The baseline file matches the pre-existing live schema and is
rerunnable; the sharing migration is the one that adds the RBAC objects.
