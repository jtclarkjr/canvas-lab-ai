import type { Theme } from '$lib/stores/shared/types'

export const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
] as const satisfies ReadonlyArray<{
  value: Theme
  label: string
}>

export function labelForTheme(value: Theme) {
  return themeOptions.find((option) => option.value === value)?.label ?? value
}
