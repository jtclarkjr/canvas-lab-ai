# Canvas Calls (LiveKit)

Slack-style channel calls on the canvas page: any canvas member can start a
call from the top-right toolbar, other members see a live "Join · N" pill and
hop in. In-call UI is a Google-Meet-style picture-in-picture box that snaps
to the four window corners.

## Architecture

```
Supabase  ── decides who may access a canvas (canvas_members / owner)
SvelteKit ── mints a short-lived LiveKit JWT after that access check
LiveKit   ── carries all call media (WebRTC SFU); rooms are ephemeral
```

- Canvas data, cursors, chat, and scenes stay on Supabase. No call state is
  persisted in Postgres — LiveKit is the source of truth. The token endpoint
  creates rooms explicitly with a 30s `emptyTimeout` (instead of LiveKit's
  5-minute auto-create default) so an ended call doesn't linger as active.
- Room name: `canvas:{canvasId}` (`conferenceRoomName` in
  `src/lib/conference/schema.ts`). Keep it derived only from the canvas id —
  LiveKit agent dispatch can target this pattern later.
- The browser never sees `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`. The token
  endpoint returns the project's wss URL alongside the JWT, so no public env
  plumbing exists at all.

## Endpoints

- `POST /api/canvases/[canvasId]/conference/token` — members only
  (`requireCanvasMember`, min role `reader`, public viewers rejected).
  Ensures the room exists (idempotent `createRoom` with the short empty
  timeout) and returns `{ token, url, roomName }`. Identity is the Supabase
  user id so call tiles reuse the deterministic presence colors; all
  members can publish (Slack-huddle semantics).
- `GET /api/canvases/[canvasId]/conference` — call status for the
  join-in-progress pill, backed by `RoomServiceClient.listParticipants`.
  Returns `{ active, count, participants }`.

## Call-presence signal

The status endpoint is the source of truth. Participants additionally send a
payload-free `conference-changed` broadcast on the Supabase channel
`canvas:{canvasId}:conference` when the roster changes; everyone else
debounce-refetches the status endpoint. Drift from crashed tabs is corrected
by a refetch on window focus and a 60s poll that only runs while a call
appears active.

## Setup (LiveKit Cloud)

1. Create a project at [cloud.livekit.io](https://cloud.livekit.io) (free
   tier works).
2. Copy the project WebSocket URL — `wss://<project>.livekit.cloud` — from
   the project home page.
3. Go to **Settings → Keys**, create an API key, and copy the key + secret.
4. Fill the three server-only vars in `.env`:

```
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
```

The project id and SIP URI shown in the dashboard are not needed for
WebRTC conferencing.

## Code map

- `src/lib/conference/` — shared `schema.ts` (zod + inferred response
  types), `types.ts` (hand-written conference types), pure
  geometry/selection `helpers.ts` (corner snapping, featured-speaker pick),
  `api.ts` client.
- `src/lib/server/livekit.ts` — env config + `RoomServiceClient` factory
  (REST host is the `https://` form of the wss URL).
- `src/lib/stores/canvas/conference/` — split on the workspace-store
  pattern, composed by `index.svelte.ts` (also the context
  provider/consumer): `room.svelte.ts` owns the LiveKit `Room` lifecycle
  (the Room lives in a plain closure, never `$state`; UI reads `$state.raw`
  participant snapshots rebuilt by a single `syncFromRoom()` on a fixed
  `RoomEvent` list; `livekit-client` is imported dynamically so it stays
  out of the SSR bundle), `devices.svelte.ts` owns enumeration/selection
  and no-device warnings, `status.svelte.ts` owns the call-in-progress
  indicator (broadcast nudge + endpoint polling), and `view.svelte.ts` owns
  PiP/bar/fullscreen placement state.
- `src/lib/components/canvas/conference/` — call button (top-right),
  draggable PiP with hover controls, participant strip, device-settings
  dialog.

## UI behaviors worth knowing

- Three in-call views, all driven by `viewMode` on the conference store:
  the floating **PiP** (24rem wide, 16:9, like the chat window), a
  minimized **bar** (active-speaker pill with compact controls, same
  drag/snap), and a Meet-style **fullscreen** dialog (participant tile
  grid, bottom control bar, Escape exits). Fullscreen has toggleable side
  panels: the people list and the canvas chat (the chat store is provided
  from `CanvasWorkspace` so the fullscreen panel reuses
  `CanvasChatRoomPanel` directly).
- The PiP features the last remote speaker (sticky), falls back to self,
  and a strip-tile click pins someone. Z-order: above the chat window
  (z-40), below modals (z-50); toasts (z-60) may overlap it intentionally.
- Bottom-right anchor sits left of the zoom column; when the chat window
  opens, the box glides up above it (the chat height formula is mirrored in
  `anchorFor`, no DOM measurement).
- Remote audio plays through hidden `<audio>` sinks rendered in
  `CanvasConference`, so it survives switches between pip/bar/fullscreen.
- Missing devices degrade gracefully: no mic/camera produces a warning
  toast and a disabled toggle, never a failed join. Remote audio plays
  through hidden `<audio>` sinks so speaker switching works and the
  featured `<video>` stays muted.

## Agents later

LiveKit agents join these rooms as ordinary participants: mint them a token
server-side with the same grant shape (`roomJoin` on `canvas:{canvasId}`)
and a distinct identity (e.g. `agent:<name>`), or configure automatic agent
dispatch against the `canvas:` room-name prefix in LiveKit Cloud.
`canPublishData` is already granted to every participant for future
data-channel use.
