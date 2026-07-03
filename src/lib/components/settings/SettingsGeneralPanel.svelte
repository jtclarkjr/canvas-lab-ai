<script lang="ts">
  import { ChevronDown } from 'lucide-svelte'
  import { themeOptions } from '$lib/settings/theme-options'
  import { theme } from '$lib/stores/shared/theme.svelte'
  import type { Theme } from '$lib/stores/shared/types'

  let { id, labelledby, displayName, email, avatarUrl, initial } = $props<{
    id: string
    labelledby: string
    displayName: string
    email: string
    avatarUrl: string | null
    initial: string
  }>()

  let avatarLoadFailed = $state(false)
  let lastAvatarUrl = $state<string | null>(null)

  $effect(() => {
    if (avatarUrl !== lastAvatarUrl) {
      lastAvatarUrl = avatarUrl
      avatarLoadFailed = false
    }
  })

  function setTheme(event: Event) {
    theme.set((event.currentTarget as HTMLSelectElement).value as Theme)
  }
</script>

<div {id} role="tabpanel" aria-labelledby={labelledby} class="space-y-5">
  <div class="pr-8">
    <h2 class="text-xl font-semibold tracking-tight text-foreground">
      General
    </h2>
  </div>

  <div class="border-t border-border">
    <div class="flex items-start gap-4 border-b border-border py-5">
      <div
        class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground"
      >
        {#if avatarUrl && !avatarLoadFailed}
          <img
            src={avatarUrl}
            alt={`${displayName} avatar`}
            class="size-full object-cover"
            onerror={() => {
              avatarLoadFailed = true
            }}
          />
        {:else}
          {initial}
        {/if}
      </div>

      <div class="min-w-0 flex-1 space-y-4">
        <div>
          <p class="m-0 text-xs text-muted-foreground">Display name</p>
          <p class="m-0 truncate text-sm font-medium text-foreground">
            {displayName}
          </p>
        </div>

        <div>
          <p class="m-0 text-xs text-muted-foreground">Email</p>
          <p class="m-0 break-words text-sm font-medium text-foreground">
            {email}
          </p>
        </div>
      </div>
    </div>

    <div
      class="flex flex-col gap-3 border-b border-border py-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0">
        <p class="m-0 text-sm font-medium text-foreground">Appearance</p>
      </div>

      <label class="relative w-full sm:w-40">
        <span class="sr-only">Select theme</span>
        <select
          class="h-9 w-full cursor-pointer appearance-none rounded-md border border-border bg-background px-3 pr-9 text-sm text-foreground outline-none transition focus:border-primary"
          value={theme.current}
          onchange={setTheme}
          aria-label="Select theme"
        >
          {#each themeOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        <span
          class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        >
          <ChevronDown class="size-4" />
        </span>
      </label>
    </div>
  </div>
</div>
