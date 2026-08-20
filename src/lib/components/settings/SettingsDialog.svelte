<script lang="ts">
  import { page } from '$app/state'
  import { getSignedInAccountUser } from '$lib/auth/account-user'
  import { getUserAvatarUrl, getUserDisplayName } from '$lib/auth/user-profile'
  import SettingsAiUsagePanel from '$lib/components/settings/SettingsAiUsagePanel.svelte'
  import SettingsGeneralPanel from '$lib/components/settings/SettingsGeneralPanel.svelte'
  import {
    getSettingsPanelId,
    getSettingsTabId,
    settingsTabs
  } from '$lib/components/settings/tabs'
  import type { SettingsTabId } from '$lib/components/settings/tabs/types'
  import { session } from '$lib/stores/shared/session.svelte'
  import { settingsDialog } from '$lib/stores/shared/settings-dialog.svelte'
  import { Dialog } from '$lib/components/ui'

  const user = $derived(
    getSignedInAccountUser(session.data?.user ?? null, page.data.user ?? null)
  )
  const isVisible = $derived(settingsDialog.isOpen && Boolean(user))
  const activeTab = $derived.by(() => {
    const tab = settingsTabs.find(
      (entry) => entry.id === settingsDialog.activeTab
    )
    return tab?.id ?? 'general'
  })
  const displayName = $derived(user ? getUserDisplayName(user) : 'User')
  const email = $derived(
    typeof user?.email === 'string' && user.email
      ? user.email
      : 'No email available'
  )
  const avatarUrl = $derived(user ? getUserAvatarUrl(user) : null)
  const initial = $derived(displayName.charAt(0).toUpperCase() || 'U')

  $effect(() => {
    if (settingsDialog.isOpen && !user) {
      settingsDialog.close()
    }
  })

  function closeDialog() {
    settingsDialog.close()
  }

  function focusTab(tab: SettingsTabId) {
    queueMicrotask(() => {
      document.getElementById(getSettingsTabId(tab))?.focus()
    })
  }

  function handleTabKeyDown(index: number, event: KeyboardEvent) {
    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return
    }

    event.preventDefault()

    let nextIndex = index
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = (index + 1) % settingsTabs.length
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + settingsTabs.length) % settingsTabs.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = settingsTabs.length - 1
    }

    const nextTab = settingsTabs[nextIndex].id
    settingsDialog.setActiveTab(nextTab)
    focusTab(nextTab)
  }
</script>

{#if isVisible}
  <Dialog
    open={isVisible}
    onOpenChange={(nextOpen) => {
      if (!nextOpen) closeDialog()
    }}
    title="Settings"
    widthClass="max-w-[780px]"
    class="flex max-h-[calc(100dvh-2rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border-border/70 bg-card p-0 text-card-foreground md:h-[640px] md:flex-row"
    hideHeader
    showClose
    closeLabel="Close settings"
  >
    <aside
      class="shrink-0 border-b border-border bg-secondary/45 p-3 md:w-56 md:border-b-0 md:border-r"
    >
      <div class="px-2 pb-3 pt-1">
        <p class="m-0 text-base font-semibold text-foreground">Settings</p>
      </div>

      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="Settings sections"
        class="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
      >
        {#each settingsTabs as tab, index (tab.id)}
          {@const Icon = tab.Icon}
          {@const isActive = activeTab === tab.id}
          <button
            type="button"
            role="tab"
            id={getSettingsTabId(tab.id)}
            aria-selected={isActive}
            aria-controls={getSettingsPanelId(tab.id)}
            tabindex={isActive ? 0 : -1}
            class={`flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-full ${
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
            }`}
            onclick={() => settingsDialog.setActiveTab(tab.id)}
            onkeydown={(event) => handleTabKeyDown(index, event)}
          >
            <Icon class="size-4 shrink-0" aria-hidden="true" />
            <span class="truncate">{tab.label}</span>
          </button>
        {/each}
      </div>
    </aside>

    <div class="min-w-0 flex-1 overflow-y-auto p-5 md:p-6">
      {#if activeTab === 'general'}
        <SettingsGeneralPanel
          id={getSettingsPanelId('general')}
          labelledby={getSettingsTabId('general')}
          {displayName}
          {email}
          {avatarUrl}
          {initial}
        />
      {:else if activeTab === 'ai-usage'}
        <SettingsAiUsagePanel
          id={getSettingsPanelId('ai-usage')}
          labelledby={getSettingsTabId('ai-usage')}
        />
      {/if}
    </div>
  </Dialog>
{/if}
