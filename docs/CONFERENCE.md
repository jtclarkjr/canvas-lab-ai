# Canvas Calls (LiveKit)

Slack-style channel calls on the canvas page: any canvas member can start a
call from the top-right toolbar, other members see a live "Join · N" pill and
hop in. In-call UI is a Google-Meet-style picture-in-picture box that snaps
to the four window corners.

## Architecture

```
Supabase  ── decides who may access a canvas (canvas_members / owner)
SvelteKit ── mints a short-lived LiveKit JWT after that access check
LiveKit   ── carries call media and runs the managed transcript agent
```

- Canvas data, call sessions, participants, transcript artifacts, structured
  summaries, and final transcript segments stay in Supabase. LiveKit remains
  the media, STT, LLM, and worker runtime; Supabase is the durable source of
  truth and access-control layer. The token endpoint creates rooms with a 30s
  `emptyTimeout` and 10s `departureTimeout` for predictable shutdown.
- Room name: `canvas:{canvasId}` (`conferenceRoomName` in
  `src/lib/conference/schema.ts`). Transcript jobs use explicit dispatch to
  the fixed `canvas-transcriber` agent.
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
- `POST /api/canvases/[canvasId]/conference/transcription/start` — atomically
  claims one transcript attempt and creates an explicit LiveKit dispatch.
- `GET /api/canvases/[canvasId]/call-sessions` and
  `GET /api/canvases/[canvasId]/call-sessions/[sessionId]` — participant-only
  transcript history; canvas owners and admins can read all sessions.
- `POST /api/canvases/[canvasId]/call-sessions/[sessionId]/reconcile` — one-shot
  missed-event recovery after 30s in `starting` or 60s in `processing`.
- `POST /api/livekit/webhook` — signed raw-body LiveKit webhook receiver.
  `participant_joined` records actual call membership for transcript access.
  `room_finished` owns `ended_at` and advances `active` to `processing`, or an
  unacknowledged `starting` attempt to `failed/agent_unavailable`.

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

## Transcript agent deployment

The transcript worker is a separate LiveKit Cloud Agent deployment. It is not
started by the Vercel/SvelteKit application process.

1. Select the LiveKit project. If it is already shown by `lk project list`,
   skip this step. Otherwise, either use `lk cloud auth` or add the credentials
   already stored in `.env`:

```text
set -a
source .env
set +a
lk project add canvas-app --url "$LIVEKIT_URL" --api-key "$LIVEKIT_API_KEY" --api-secret "$LIVEKIT_API_SECRET" --default
```

2. Prepare the restricted agent secret file and create the deployment:

```text
vp run agent:cloud:secrets
vp run agent:cloud:create
```

`agent:cloud:create` defaults to `ap-south`; set `LIVEKIT_AGENT_REGION` to
`us-east` or `eu-central` when deploying nearer those regions. The generated
`.env.agent` contains only `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and optional
transcription, language, and summary-model settings. LiveKit injects its own
connection credentials. `LIVEKIT_SUMMARY_MODEL` defaults to
`openai/gpt-4.1-mini` through LiveKit Inference; no OpenAI API key is used. The
CLI writes non-secret deployment identity to `livekit.toml`; commit that file.

3. Deploy and inspect later revisions:

```text
vp run agent:cloud:deploy
vp run agent:cloud:status
vp run agent:cloud:logs
```

4. Configure a LiveKit Cloud webhook for
`https://<app-domain>/api/livekit/webhook` and include `participant_joined` and
`room_finished` events.

If Vercel Firewall challenges automated POST requests, bypass only the signed
webhook path and keep the rule first:

```text
vercel firewall rules add "LiveKit webhook" --condition '{"type":"path","op":"eq","value":"/api/livekit/webhook"}' --action bypass --yes
vercel firewall rules reorder "LiveKit webhook" --first --yes
vercel firewall publish --yes
```

An unsigned POST to that path must reach the app and return `401`, not a Vercel
`429` challenge. Signature verification remains the authorization boundary.

Local choices are `vp run dev:cloud` (Cloud LiveKit plus a local worker) or
`vp run dev:local` (local LiveKit server, app, and worker).

The durable lifecycle is
`not_requested/failed -> starting -> active -> processing -> ready|failed`.
Only the worker changes `starting` to `active`, and only room lifecycle code
sets `ended_at`. The drawer and in-call controls subscribe to the session row
through Supabase Realtime; there is no transcript polling loop.

During finalization, the worker groups adjacent speech into speaker turns and
generates a structured `summary` artifact before marking the transcript ready.
The drawer opens on the summary and keeps the grouped transcript in a separate
tab. To summarize older sessions that already contain segments:

```text
vp run agent:summary:backfill -- --limit 10
```

## Code map

- `src/lib/conference/` — shared `schema.ts` (zod + inferred response
  types), `types.ts` (hand-written conference types), pure
  geometry/selection `helpers.ts` (corner snapping, featured-speaker pick),
  `api.ts` client.
- `src/lib/server/livekit.ts` — env config + `RoomServiceClient` factory
  (REST host is the `https://` form of the wss URL).
- `src/lib/stores/conference/` — split on the workspace-store
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
  panels: the people list and chat. The chat panel defaults to the **Call**
  tab, an ephemeral LiveKit text-stream chat for the active call, and also
  has a **Canvas** tab that reuses the persistent canvas chat from
  `CanvasChatRoomPanel`.
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

## Live captions (fullscreen)

- Toggle: the CC button in the fullscreen control bar; a language picker
  appears beside it (English first, 日本語 second; see
  `CAPTION_LANGUAGES` in `src/lib/conference/captions.ts`). The language
  choice persists in localStorage; captions default to off each call.
- Architecture: each participant transcribes their **own** microphone with
  OpenAI's realtime transcription API (`gpt-4o-mini-transcribe` preferred —
  it streams deltas over WebRTC with server VAD; the token endpoint falls
  back across models and returns the one used; `gpt-realtime-whisper`
  rejects `turn_detection` config and gets it omitted).
  The browser connects to OpenAI directly over WebRTC using a short-lived
  client secret minted by `POST …/conference/captions/token` — the
  project's `OPENAI_API_KEY` never leaves the server. Two hard-won
  gotchas: (1) after the data channel opens the client must re-assert the
  transcription config with a `session.update` event, or the session
  connects but never emits transcripts; (2) the transcription leg uses its
  own `getUserMedia` capture — cloning the call's published mic track
  yields silent audio on a second peer connection in some browsers
  (Safari). Whisper-family models emit `…transcription.segment` events
  (handled alongside `delta`/`completed`). Segments are published to the
  room on the LiveKit data topic `captions` (the call token grants
  `canPublishData` and `canUpdateOwnMetadata`). Failures (and only
  failures) log to the console under `[captions]`.
- Coordination: a participant's captions preference rides on their LiveKit
  participant attributes (`captions: on/off`). While anyone in the room has
  captions on, every unmuted participant transcribes their mic, so all
  speakers are captioned for whoever wants them. No one transcribes when
  nobody has captions enabled (cost control).
- Translation is per-viewer: finalized utterances go through
  `POST …/conference/captions/translate` (gpt-4o-mini, returns the text
  unchanged when already in the target language). Viewers see captions
  **only in their target language** — lines render once translated, the
  original language never flashes first, and a failed translation falls
  back to the original text. Interim transcription deltas are neither
  published nor rendered.
- Privacy note: with captions on, call audio is streamed to OpenAI for
  transcription.

## Call chat

- Fullscreen chat has two tabs: **Call** and **Canvas**. Call is the default
  when the chat side panel opens.
- Call chat uses LiveKit text streams on the `call-chat` topic. It is
  realtime-only: messages are not stored in Postgres, do not replay for late
  joiners, and clear when the call ends.
- Canvas chat remains the existing Supabase-backed member chat and keeps its
  normal persistence, realtime, unread, and @mention behavior.
- The fullscreen chat button shows the combined unread count while the side
  panel is closed. Inside the panel, each tab owns its own badge/read state.

## Transcript diagnostics

Each attempt records dispatch and job ids plus accepted, first-audio,
first-segment, and completed timestamps. Terminal failures use a specific code:
`agent_unavailable`, `agent_connect_failed`, `dispatch_failed`,
`no_audio_received`, `no_speech_detected`, `stt_failed`,
`finalization_timeout`, or `worker_did_not_finalize`. The agent resumes from
the greatest stored segment position after a LiveKit job restart and drains
all STT streams before writing the terminal state.
