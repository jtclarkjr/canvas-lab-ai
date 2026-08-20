<script lang="ts">
  import { themeOptions } from '$lib/settings/theme-options'
  import { Select } from '$lib/components/ui'
  import { theme } from '$lib/stores/shared/theme.svelte'
  import type { Theme } from '$lib/stores/shared/types'
  import { Avatar } from '$lib/components/shared/identity'

  let { id, labelledby, displayName, email, avatarUrl, initial } = $props<{
    id: string
    labelledby: string
    displayName: string
    email: string
    avatarUrl: string | null
    initial: string
  }>()

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
      <Avatar
        name={displayName}
        src={avatarUrl}
        fallback={initial}
        class="size-12 bg-primary text-sm text-primary-foreground"
        decorative={false}
      />

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

      <label class="w-full sm:w-40">
        <span class="sr-only">Select theme</span>
        <Select
          class="h-9 rounded-md"
          options={themeOptions}
          value={theme.current}
          onchange={setTheme}
          aria-label="Select theme"
        />
      </label>
    </div>
  </div>
</div>
