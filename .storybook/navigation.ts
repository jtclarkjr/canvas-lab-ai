// Storybook 10.6 does not yet mock SvelteKit 3's refreshAll. Keep its existing
// navigation events until the framework provides a native refreshAll mock.
export * from '@storybook/sveltekit/internal/mocks/app/navigation'
export { invalidateAll as refreshAll } from '@storybook/sveltekit/internal/mocks/app/navigation'
