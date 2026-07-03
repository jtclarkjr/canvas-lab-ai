<script lang="ts">
  import { page } from '$app/state'
  import { X } from 'lucide-svelte'
  import { fade, scale } from 'svelte/transition'
  import { getSignedInAccountUser } from '$lib/auth/account-user'
  import { getUserAvatarUrl, getUserDisplayName } from '$lib/auth/user-profile'
  import SettingsAiUsagePanel from '$lib/components/settings/SettingsAiUsagePanel.svelte'
  import SettingsGeneralPanel from '$lib/components/settings/SettingsGeneralPanel.svelte'
  import {
    getSettingsPanelId,
    getSettingsTabId,
    settingsTabs,
    type SettingsTabId
  } from '$lib/components/settings/tabs'
  import { session } from '$lib/stores/shared/session.svelte'
  import { settingsDialog } from '$lib/stores/shared/settings-dialog.svelte'

  const titleId = `settings-dialog-title-${Math.random().toString(36).slice(2)}`
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

  function handleDialogKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDialog()
    }
  }

  function portal(node: HTMLElement) {
    document.body.appendChild(node)
    return {
      destroy() {
        node.parentNode?.removeChild(node)
      }
    }
  }
</script>

{#if isVisible}
  <div
    use:portal
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
  >
    <button
      type="button"
      class="absolute inset-0 bg-black/45 backdrop-blur-sm"
      onclick={closeDialog}
      aria-label="Close settings"
      tabindex="-1"
      transition:fade={{ duration: 140 }}
    ></button>

    <div
      class="relative z-10 flex max-h-[calc(100dvh-2rem)] min-h-[420px] w-[calc(100vw-1rem)] max-w-[780px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-2xl md:h-[640px] md:flex-row"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabindex="-1"
      onkeydown={handleDialogKeyDown}
      transition:scale={{ duration: 160, start: 0.96 }}
    >
      <h2 id={titleId} class="sr-only">Settings</h2>

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

      <button
        type="button"
        class="absolute right-3 top-3 flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        onclick={closeDialog}
        aria-label="Close settings"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>
  </div>
{/if}
