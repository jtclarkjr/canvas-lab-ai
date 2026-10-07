import adapter from '@sveltejs/adapter-vercel'
import { sentrySvelteKit } from '@sentry/sveltekit/vite'
import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  define: {
    'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(
      process.env.SENTRY_DSN ?? ''
    )
  },
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  staged: {
    '*': 'vp check --fix'
  },
  fmt: {
    $schema: './node_modules/oxfmt/configuration_schema.json',
    semi: false,
    tabWidth: 2,
    singleQuote: true,
    printWidth: 80,
    trailingComma: 'none',
    proseWrap: 'always',
    svelte: true,
    sortPackageJson: false,
    ignorePatterns: ['*.md', 'storybook-static/**']
  },
  lint: {
    rules: {
      'no-nested-ternary': 'error'
    },
    options: { typeAware: true, typeCheck: true }
  },
  test: {
    includeSource: ['src/**/*.{ts,svelte}']
  },
  plugins: [
    sentrySvelteKit({
      org: 'jtclarkjr',
      project: 'sentry-aqua-ball',
      telemetry: false
    }),
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true
      },
      adapter: adapter({ runtime: 'nodejs24.x' }),
      tracing: { server: true }
    })
  ]
})
