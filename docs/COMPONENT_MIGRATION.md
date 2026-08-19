# Component Migration Ledger

The migration proceeds continuously from the lowest dependency layer upward.
A phase is complete only when its architecture check, stories, accessibility
tests, browser interactions, visual baselines, and existing application tests
pass.

| Phase | Sections | Status |
| --- | --- | --- |
| 1 | Architecture, Storybook, browser tooling | Complete |
| 2 | `components/ui` primitives | Complete |
| 3 | `components/shared` domain components | Complete |
| 4 | Auth, settings, legal, home, search, access | Complete |
| 5 | Workspace, sharing, navigation, toolbars | Complete |
| 6 | Chat, scenes, documents, notes | Complete |
| 7 | Workflows and conference | Complete |
| 8 | Workspace routers, cleanup, final full-coverage gate | Complete |

The final architecture check covers every production `.svelte` component below
the desktop and mobile component roots. The completed baseline contains 147
components, 147 exact story files, 206 Storybook cases, and 257 Playwright
visual/behavior cases (201 Chromium visual states, 19 critical states repeated
in Firefox and WebKit, plus 18 focused cross-browser behavior cases). This
stores 239 durable visual baselines instead of tripling every story image.

## Ongoing migration rule

The ledger is complete, but the constraints are permanent. Any new component
must be placed in the correct layer and section, receive its exact story file,
pass accessibility and interaction checks, and opt into visual coverage unless
it is explicitly tagged `!visual` for a documented nondeterministic reason.
Architecture and browser discovery are automatic, so coverage grows with the
component inventory rather than relying on a manually maintained test list.
