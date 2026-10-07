import type { StorybookConfig } from '@storybook/sveltekit'
import { fileURLToPath } from 'node:url'

const navigationMock = fileURLToPath(
  new URL('./navigation.ts', import.meta.url)
)

const config: StorybookConfig = {
  stories: ['../src/lib/**/stories/**/*.stories.ts'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest'
  ],
  framework: {
    name: '@storybook/sveltekit',
    options: {}
  },
  staticDirs: ['../static'],
  viteFinal(config) {
    config.plugins ??= []
    config.plugins.push({
      name: 'storybook:sveltekit-3-mocks',
      enforce: 'pre',
      // Apply after SvelteKit's config hook adds its $app prefix alias.
      config() {
        return {
          resolve: {
            alias: {
              '$app/env': fileURLToPath(new URL('./env.ts', import.meta.url))
            }
          }
        }
      },
      resolveId(source, importer) {
        if (
          source === '@storybook/sveltekit/internal/mocks/app/navigation' &&
          importer !== navigationMock
        ) {
          return navigationMock
        }
      }
    })
    return config
  }
}

export default config
