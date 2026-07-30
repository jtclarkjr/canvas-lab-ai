import { ChartNoAxesColumn, UserRound } from 'lucide-svelte'
import type { SettingsTabId } from './tabs/types'

export const settingsTabs = [
  {
    id: 'general',
    label: 'General',
    Icon: UserRound
  },
  {
    id: 'ai-usage',
    label: 'AI Usage',
    Icon: ChartNoAxesColumn
  }
] as const

export function getSettingsTabId(tab: SettingsTabId) {
  return `settings-${tab}-tab`
}

export function getSettingsPanelId(tab: SettingsTabId) {
  return `settings-${tab}-panel`
}
