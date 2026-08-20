import type { StorybookConfig } from '@storybook/sveltekit'

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
  staticDirs: ['../static']
}

export default config
