import { UserRound } from 'lucide-svelte'

export type SettingsTabId = 'general'

export const settingsTabs = [
  {
    id: 'general',
    label: 'General',
    Icon: UserRound
  }
] as const

export function getSettingsTabId(tab: SettingsTabId) {
  return `settings-${tab}-tab`
}

export function getSettingsPanelId(tab: SettingsTabId) {
  return `settings-${tab}-panel`
}
