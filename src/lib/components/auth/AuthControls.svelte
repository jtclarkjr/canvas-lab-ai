<script lang="ts">
  import { page } from '$app/state'
  import { getUserAvatarUrl, getUserDisplayName } from '$lib/auth/user-profile'
  import { signOut } from '$lib/auth/session-service'
  import Popover from '$lib/components/shared/Popover.svelte'
  import { session } from '$lib/stores/session.svelte'
  import { theme, type Theme } from '$lib/stores/theme.svelte'
  import { CircleUserRound, LogOut, Monitor, Moon, Sun } from 'lucide-svelte'

  const themeOptions: Theme[] = ['light', 'dark', 'system']
  const activeThemeIndex = $derived(Math.max(themeOptions.indexOf(theme.current), 0))
  const themeThumbStyle = $derived(`transform: translateX(${activeThemeIndex * 2.5}rem);`)

  const loginHref = $derived(
    `/login?redirect=${encodeURIComponent(`${page.url.pathname}${page.url.search}`)}`
  )
  const user = $derived(session.data?.user ?? null)
  const userDisplayName = $derived(user ? getUserDisplayName(user) : 'Guest')
  const userEmail = $derived(user?.email ?? 'Signed in')
  const userAvatarUrl = $derived(user ? getUserAvatarUrl(user) : null)
  const userInitial = $derived(userDisplayName.charAt(0).toUpperCase() || 'U')

  let popoverOpen = $state(false)
  let avatarLoadFailed = $state(false)
  let lastUserAvatarUrl = $state<string | null>(null)

  $effect(() => {
    if (userAvatarUrl !== lastUserAvatarUrl) {
      lastUserAvatarUrl = userAvatarUrl
      avatarLoadFailed = false
    }
  })

  function setTheme(nextTheme: Theme) {
    theme.set(nextTheme)
  }

  function labelFor(option: Theme) {
    return `${option.charAt(0).toUpperCase()}${option.slice(1)}`
  }
</script>

{#if user}
  <Popover bind:open={popoverOpen} id="account-popover" label="Account menu" align="end">
    {#snippet trigger(popover)}
      <button
        type="button"
        class="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border/70 bg-card/80 shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label={`${userDisplayName} account menu`}
        aria-haspopup="dialog"
        aria-expanded={popover.expanded}
        aria-controls={popover.id}
        onclick={() => (popoverOpen = !popoverOpen)}
      >
        {#if userAvatarUrl && !avatarLoadFailed}
          <img
            src={userAvatarUrl}
            alt={`${userDisplayName} avatar`}
            class="size-full object-cover"
            onerror={() => {
              avatarLoadFailed = true
            }}
          />
        {:else}
          <span
            class="flex size-full items-center justify-center bg-primary text-xs font-semibold text-primary-foreground"
          >
            {userInitial}
          </span>
        {/if}
      </button>
    {/snippet}

    {#snippet children()}
      <div class="grid gap-4">
        <div class="flex min-w-0 items-center gap-3">
          <div
            class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {#if userAvatarUrl && !avatarLoadFailed}
              <img
                src={userAvatarUrl}
                alt={`${userDisplayName} avatar`}
                class="size-full object-cover"
                onerror={() => {
                  avatarLoadFailed = true
                }}
              />
            {:else}
              {userInitial}
            {/if}
          </div>
          <div class="min-w-0">
            <p class="m-0 truncate text-sm font-medium text-foreground">{userDisplayName}</p>
            <p class="m-0 truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        <div class="grid gap-2">
          <p class="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Theme
          </p>
          <div
            class="relative inline-grid w-fit grid-cols-3 items-center rounded-full border border-border/70 bg-card/80 p-1"
            role="group"
            aria-label="Theme"
          >
            <span
              class="pointer-events-none absolute left-1 top-1.5 h-8 w-10 rounded-full bg-primary shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
              style={themeThumbStyle}
              aria-hidden="true"
            ></span>
            {#each themeOptions as option}
              <button
                type="button"
                class={`relative z-10 flex h-9 w-10 cursor-pointer items-center justify-center rounded-full p-0 transition-colors duration-200 ${
                  theme.current === option
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onclick={() => setTheme(option)}
                aria-label={`Use ${option} theme`}
                aria-pressed={theme.current === option}
                title={labelFor(option)}
              >
                {#if option === 'light'}
                  <Sun class="size-4" aria-hidden="true" />
                {:else if option === 'dark'}
                  <Moon class="size-4" aria-hidden="true" />
                {:else}
                  <Monitor class="size-4" aria-hidden="true" />
                {/if}
              </button>
            {/each}
          </div>
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
