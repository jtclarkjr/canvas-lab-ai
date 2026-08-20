<script lang="ts">
  import { page } from '$app/state'
  import { getSignedInAccountUser } from '$lib/auth/account-user'
  import { getUserAvatarUrl, getUserDisplayName } from '$lib/auth/user-profile'
  import { signOut } from '$lib/auth/session-service'
  import { Popover, SegmentedControl } from '$lib/components/ui'
  import { Avatar } from '$lib/components/shared/identity'
  import { labelForTheme, themeOptions } from '$lib/settings/theme-options'
  import { settingsDialog } from '$lib/stores/shared/settings-dialog.svelte'
  import { session } from '$lib/stores/shared/session.svelte'
  import { theme } from '$lib/stores/shared/theme.svelte'
  import {
    CircleUserRound,
    LogOut,
    Monitor,
    Moon,
    Settings,
    Sun
  } from 'lucide-svelte'

  const themeItems = themeOptions.map((option) => ({
    value: option.value,
    label: `Use ${option.label} theme`,
    title: labelForTheme(option.value)
  }))

  const loginHref = $derived(
    `/login?redirect=${encodeURIComponent(`${page.url.pathname}${page.url.search}`)}`
  )
  const sessionUser = $derived(session.data?.user ?? null)
  const pageUser = $derived(page.data.user ?? null)
  const user = $derived(getSignedInAccountUser(sessionUser, pageUser))
  const userDisplayName = $derived(user ? getUserDisplayName(user) : 'Guest')
  const userEmail = $derived(
    typeof user?.email === 'string' && user.email ? user.email : 'Signed in'
  )
  const userAvatarUrl = $derived(user ? getUserAvatarUrl(user) : null)
  const userInitial = $derived(userDisplayName.charAt(0).toUpperCase() || 'U')

  let popoverOpen = $state(false)
  function openSettings() {
    popoverOpen = false
    settingsDialog.open('general')
  }
</script>

{#if user}
  <Popover
    bind:open={popoverOpen}
    id="account-popover"
    label="Account menu"
    align="end"
  >
    {#snippet trigger(popover)}
      <button
        {...popover.props}
        type="button"
        class="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border/70 bg-card/80 shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label={`${userDisplayName} account menu`}
        aria-haspopup="dialog"
        aria-expanded={popover.expanded}
        aria-controls={popover.id}
      >
        <Avatar
          name={userDisplayName}
          src={userAvatarUrl}
          fallback={userInitial}
          class="size-full bg-primary text-xs text-primary-foreground"
        />
      </button>
    {/snippet}

    {#snippet children()}
      <div class="grid gap-4">
        <div class="flex min-w-0 items-center gap-3">
          <Avatar
            name={userDisplayName}
            src={userAvatarUrl}
            fallback={userInitial}
            class="size-10 bg-primary text-xs text-primary-foreground"
          />
          <div class="min-w-0">
            <p class="m-0 truncate text-sm font-medium text-foreground">
              {userDisplayName}
            </p>
            <p class="m-0 truncate text-xs text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onclick={openSettings}
        >
          <Settings class="size-4" aria-hidden="true" />
          Settings
        </button>

        <div class="grid gap-2">
          <p
            class="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Theme
          </p>
          <SegmentedControl
            value={theme.current}
            items={themeItems}
            label="Theme"
            size="sm"
            class="w-fit"
            listClass="border border-border/70 bg-card/80"
            triggerClass="size-9 flex-none px-0"
            onValueChange={(value) => {
              const option = themeOptions.find((entry) => entry.value === value)
              if (option) theme.set(option.value)
            }}
          >
            {#snippet item(option)}
              {#if option.value === 'light'}
                <Sun class="size-4" aria-hidden="true" />
              {:else if option.value === 'dark'}
                <Moon class="size-4" aria-hidden="true" />
              {:else}
                <Monitor class="size-4" aria-hidden="true" />
              {/if}
            {/snippet}
          </SegmentedControl>
        </div>

        <div class="h-px bg-border/70"></div>

        <button
          type="button"
          class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          onclick={() => {
            popoverOpen = false
            void signOut()
          }}
        >
          <LogOut class="size-4" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    {/snippet}
  </Popover>
{:else}
  <a
    class="flex size-10 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-card/80 text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    href={loginHref}
    aria-label="Sign in"
    title="Sign in"
  >
    <CircleUserRound class="size-5" aria-hidden="true" />
  </a>
{/if}
