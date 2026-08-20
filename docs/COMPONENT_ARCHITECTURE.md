# Component Architecture

The component system is built bottom-up. Lower layers are stable building blocks;
higher layers compose them and own application behavior.

## Dependency direction

```text
routes and workspace routers
        ↓
desktop and mobile feature components
        ↓
shared domain components and controllers
        ↓
generic UI primitives
        ↓
Bits UI, Svelte, and styling utilities
```

Dependencies may only point downward. `bits-ui` is private to
`src/lib/components/ui`. UI components cannot import stores, APIs, canvas types,
workspace code, or feature components.

Shared components may depend on pure domain types and utilities, but receive
data, service ports, and callbacks from feature containers. Network access and
global stores remain in feature or route adapters.

Desktop and mobile trees remain separate. They may compose the same UI and
shared components, but device-specific layout and interaction behavior must not
be merged into conditional mega-components.

## Public contracts

- Svelte 5 typed props and snippets are the component interface.
- Bindable state uses `$bindable`; behavior notifications use callback props.
- Components forward relevant DOM props, `class`, and element references.
- Surface primitives such as `Card` own their visual classes. A typed child
  snippet preserves a consumer-owned anchor or interactive element without
  exposing class-builder helpers.
- Centered dialogs use neutral fade/scale motion; directional slide motion is
  reserved for drawers and bottom sheets.
- Icon-only actions require an accessible `label`.
- Cross-layer imports use each layer's public `index.ts` or a domain barrel.
- Temporary compatibility wrappers must be removed before a migration phase is
  complete.

## Story and test contract

Every production component under `src/lib/components` and
`src/lib/mobile/components` receives an individual story. The architecture
checker derives the exact required story path from the component path, so a new
component cannot silently bypass Storybook. Story files live in the owning
section's `stories` folder and use these titles:

- `UI/<Category>/<Component>`
- `Shared/<Domain>/<Component>`
- `Desktop/<Feature>/<Subsection>/<Component>`
- `Mobile/<Feature>/<Component>`
- `Integration/Workspace/<Component>`

All stories render in Chromium and run accessibility checks. Interactive
components also contain `play` assertions. Stories tagged `visual` are
discovered from Storybook's generated index and captured by Playwright in
Chromium. A curated policy in `tests/storybook/visual-policy.ts` adds Firefox
and WebKit baselines for critical UI, shared, desktop, and mobile paths. Visual
capture disables Storybook play-function autoplay so declared visual state
remains deterministic; interactions run in the Storybook test project and in
focused cross-browser Playwright behavior tests.

## Current baseline

As of 2026-08-20, the enforced component inventory is:

| Layer | Organization | Components |
| --- | --- | ---: |
| `components/ui` | actions, forms, feedback, layout, navigation, overlays | 14 |
| `components/shared` | branding, canvas, chat, collections, editors, feedback, identity | 9 |
| desktop and mobile features | 26 separately titled feature sections | 131 |
| **Total** | exact component-to-story coverage | **154** |

The browser safeguards cover 228 Storybook interaction/accessibility cases,
222 Chromium visual stories, 26 critical visual stories in each of Firefox and
WebKit, and 30 focused cross-browser behavior cases. The Playwright run executes
304 cases and stores 274 visual baselines. Temporary actual images, diffs,
traces, reports, and built Storybook output are ignored; expected baselines are
versioned so CI has a durable known-good comparison.

`vp run check:components` is the source of truth for layer boundaries, exact
story paths, and title prefixes. `.github/workflows/components.yml` runs the
architecture, formatting, lint, type, unit, build, Storybook, accessibility,
behavior, and visual gates for pull requests and `main`.
