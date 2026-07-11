import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite-plus'

export default defineConfig({
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
    ignorePatterns: ['*.md']
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
  plugins: [tailwindcss(), sveltekit()]
})
