# Canvas App V4

A real-time collaborative canvas application built with SvelteKit and Supabase.

Goal: Building a agentic enabled platform for live collaboration.

## Features

- **Drawing tools** — pencil, eraser, text, hand (pan), and selection
- **Text formatting** — font size, bold, italic, underline, and color
- **Real-time collaboration** — live cursor positions and synced drawing commands via Supabase Realtime
- **Canvas management** — create, list, and delete canvases from a home dashboard
- **Authentication** — email/password sign-in and sign-up, with optional OAuth (GitHub, Google, Apple)
- **Theme** — light, dark, and system modes

## Tech Stack

- [SvelteKit 2](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) (runes)
- [Supabase](https://supabase.com/) — auth, database, and realtime
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Vite+](https://voidzero.dev/) — unified toolchain (Vite, Vitest, Oxlint, Oxfmt)
- TypeScript 6, Zod 4

## Getting Started

### Prerequisites

- [`vp`](https://voidzero.dev/) CLI installed globally
- A Supabase project (local via `supabase start` or hosted)

### Setup

1. Install dependencies:

   ```bash
   vp install
   ```

2. Copy the example environment file and fill in your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   |---|---|
   | `SUPABASE_URL` | Supabase project URL (server-side) |
   | `SUPABASE_SECRET_KEY` | Supabase service role key |
   | `VITE_SUPABASE_URL` | Supabase project URL (client-side) |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
   | `ENABLE_GITHUB_AUTH` | Show GitHub sign-in button (`true`/`false`) |
   | `ENABLE_GOOGLE_AUTH` | Show Google sign-in button (`true`/`false`) |
   | `ENABLE_APPLE_AUTH` | Show Apple sign-in button (`true`/`false`) |
   | `WORKFLOW_ENABLED` | Enable the experimental workflows canvas mode (`true`/`false`, default `false`) |

3. Start the development server:

   ```bash
   vp dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

## Development

```bash
vp dev          # Start dev server
vp check        # Type check, lint, and format check
vp test         # Run tests
vp build        # Production build
vp preview      # Preview production build
```

For Svelte diagnostics and formatting:

```sh
vp dlx sv check
vp fmt . --write
```

## Technical Docs

- [Audit notes](docs/AUDIT.md)
- [Onboarding](docs/ONBOARDING.md)
- [Runbooks](docs/RUNBOOKS.md)
- [Release notes](docs/RELEASE_NOTES.md)
- [Canvas workspace architecture](docs/CANVAS_WORKSPACE.md)
- [Canvas chat architecture](docs/CHAT_ARCHITECTURE.md)
- [Scenes and document workspace architecture](docs/SCENES_ARCHITECTURE.md)
- [Workflows architecture](docs/WORKFLOWS_ARCHITECTURE.md)
- [Text editor and rich text architecture](docs/TEXT_EDITOR_ARCHITECTURE.md)
- [Role-based access control](docs/RBAC.md)
