// Storybook's internal navigation mock ships without declarations.
declare module '@storybook/sveltekit/internal/mocks/app/navigation' {
  export * from '$app/navigation'
}
