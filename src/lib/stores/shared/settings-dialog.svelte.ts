import type { SettingsTabId } from '$lib/components/settings/tabs'

let isOpen = $state(false)
let activeTab = $state<SettingsTabId>('general')

export const settingsDialog = {
  get isOpen() {
    return isOpen
  },
  get activeTab() {
    return activeTab
  },
  open(tab: SettingsTabId = 'general') {
    activeTab = tab
    isOpen = true
  },
  close() {
    isOpen = false
  },
  setOpen(nextOpen: boolean) {
    isOpen = nextOpen
  },
  setActiveTab(tab: SettingsTabId) {
    activeTab = tab
  }
}
