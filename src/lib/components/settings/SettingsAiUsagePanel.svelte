<script lang="ts">
  import { onMount } from 'svelte'
  import { ChevronDown, RefreshCw } from 'lucide-svelte'
  import { promptAiUsageResponseSchema } from '$lib/ai/usage'
  import { apiRequest } from '$lib/api-client'
  import type { PromptAiUsageLimit, PromptAiUsageResponse } from '$lib/ai/usage'

  type ExpandableListKey =
    | 'limited-features'
    | 'limited-models'
    | 'unlimited-features'
    | 'unlimited-models'

  let { id, labelledby } = $props<{
    id: string
    labelledby: string
  }>()

  let usage = $state<PromptAiUsageResponse | null>(null)
  let loading = $state(false)
  let error = $state<string | null>(null)
  let expandedLists = $state<Record<ExpandableListKey, boolean>>({
    'limited-features': false,
    'limited-models': false,
    'unlimited-features': false,
    'unlimited-models': false
  })

  const numberFormatter = new Intl.NumberFormat()
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })

  onMount(() => {
    void loadUsage()
  })

  async function loadUsage() {
    loading = true
    error = null
    try {
      usage = await apiRequest('/api/ai/usage', {
        headers: { accept: 'application/json' },
        parse: (payload) => promptAiUsageResponseSchema.parse(payload),
        fallbackMessage: 'Failed to load AI usage.'
      })
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to load AI usage.'
    } finally {
      loading = false
    }
  }

  function progressPercent(limit: PromptAiUsageLimit) {
    if (limit.capTokens === 0) {
      return 0
    }
    return Math.min(100, Math.round((limit.usedTokens / limit.capTokens) * 100))
  }

  function formatTokens(tokens: number) {
    return numberFormatter.format(tokens)
  }

  function formatReset(resetsAt: string) {
    const deltaMs = new Date(resetsAt).getTime() - Date.now()
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return 'Resets now'
    }

    const totalMinutes = Math.ceil(deltaMs / 60_000)
    const days = Math.floor(totalMinutes / (24 * 60))
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
    const minutes = totalMinutes % 60

    if (days > 0) {
      return `Resets in ${days}d ${hours}h`
    }

    if (hours > 0) {
      return `Resets in ${hours}h ${minutes}m`
    }

    return `Resets in ${minutes}m`
  }

  function formatDate(value: string) {
    return dateFormatter.format(new Date(value))
  }

  function toggleList(key: ExpandableListKey) {
    expandedLists[key] = !expandedLists[key]
  }

  function listCount(count: number, singular: string) {
    return `${count} ${count === 1 ? singular : `${singular}s`}`
  }
</script>

<div {id} role="tabpanel" aria-labelledby={labelledby} class="space-y-5">
  <div class="flex items-center justify-between gap-3 pr-8">
    <h2 class="text-xl font-semibold tracking-tight text-foreground">
      AI Usage
    </h2>

    <button
      type="button"
      class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-default disabled:opacity-60"
      onclick={() => void loadUsage()}
      disabled={loading}
      aria-label="Refresh AI usage"
    >
      <RefreshCw
        class={`size-4 ${loading ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
    </button>
  </div>

  <div class="border-t border-border">
    {#if error}
      <div
        class="border-b border-border py-4 text-sm text-destructive"
        role="alert"
      >
        {error}
      </div>
    {/if}

    {#if usage}
      <div class="space-y-5 border-b border-border py-5">
        {#each usage.limits as limit (limit.id)}
          {@const percent = progressPercent(limit)}
          <div class="space-y-2">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="m-0 text-sm font-medium text-foreground">
                  {limit.label}
                </p>
                <p class="m-0 text-xs text-muted-foreground">
                  {formatReset(limit.resetsAt)}
                </p>
              </div>
              <div class="shrink-0 text-right">
                <p class="m-0 text-xs text-muted-foreground">
                  {percent}% used
                </p>
                <p class="m-0 text-xs text-muted-foreground">
                  {formatTokens(limit.usedTokens)} / {formatTokens(
                    limit.capTokens
                  )}
                  tokens
                </p>
              </div>
            </div>

            <div class="h-2 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full bg-foreground transition-[width]"
                style={`width: ${percent}%`}
              ></div>
            </div>
          </div>
        {/each}
      </div>

      <div class="grid gap-5 border-b border-border py-5 md:grid-cols-2">
        <section class="min-w-0 space-y-3">
          <h3 class="m-0 text-sm font-medium text-foreground">Limited</h3>
          <div class="divide-y divide-border/70 border-y border-border/70">
            <div>
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-between gap-3 py-2 text-left"
                aria-expanded={expandedLists['limited-features']}
                aria-controls={`${id}-limited-features`}
                onclick={() => toggleList('limited-features')}
              >
                <span class="text-sm font-medium text-foreground">Features</span
                >
                <span
                  class="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  {listCount(usage.limited.features.length, 'feature')}
                  <ChevronDown
                    class={`size-4 transition-transform ${expandedLists['limited-features'] ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </span>
              </button>
              {#if expandedLists['limited-features']}
                <ul
                  id={`${id}-limited-features`}
                  class="m-0 space-y-1 pb-3 text-sm text-foreground"
                >
                  {#each usage.limited.features as feature (feature)}
                    <li class="list-none">{feature}</li>
                  {/each}
                </ul>
              {/if}
            </div>
            <div>
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-between gap-3 py-2 text-left"
                aria-expanded={expandedLists['limited-models']}
                aria-controls={`${id}-limited-models`}
                onclick={() => toggleList('limited-models')}
              >
                <span class="text-sm font-medium text-foreground">Models</span>
                <span
                  class="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  {listCount(usage.limited.models.length, 'model')}
                  <ChevronDown
                    class={`size-4 transition-transform ${expandedLists['limited-models'] ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </span>
              </button>
              {#if expandedLists['limited-models']}
                <ul
                  id={`${id}-limited-models`}
                  class="m-0 space-y-1 pb-3 text-sm text-foreground"
                >
                  {#each usage.limited.models as model (model.id)}
                    <li class="list-none">{model.label}</li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>
        </section>

        <section class="min-w-0 space-y-3">
          <h3 class="m-0 text-sm font-medium text-foreground">Unlimited</h3>
          <div class="divide-y divide-border/70 border-y border-border/70">
            <div>
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-between gap-3 py-2 text-left"
                aria-expanded={expandedLists['unlimited-features']}
                aria-controls={`${id}-unlimited-features`}
                onclick={() => toggleList('unlimited-features')}
              >
                <span class="text-sm font-medium text-foreground">Features</span
                >
                <span
                  class="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  {listCount(usage.unlimited.features.length, 'feature')}
                  <ChevronDown
                    class={`size-4 transition-transform ${expandedLists['unlimited-features'] ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </span>
              </button>
              {#if expandedLists['unlimited-features']}
                <ul
                  id={`${id}-unlimited-features`}
                  class="m-0 space-y-1 pb-3 text-sm text-foreground"
                >
                  {#each usage.unlimited.features as feature (feature)}
                    <li class="list-none">{feature}</li>
                  {/each}
                </ul>
              {/if}
            </div>
            <div>
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-between gap-3 py-2 text-left"
                aria-expanded={expandedLists['unlimited-models']}
                aria-controls={`${id}-unlimited-models`}
                onclick={() => toggleList('unlimited-models')}
              >
                <span class="text-sm font-medium text-foreground">Models</span>
                <span
                  class="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  {listCount(usage.unlimited.models.length, 'model')}
                  <ChevronDown
                    class={`size-4 transition-transform ${expandedLists['unlimited-models'] ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </span>
              </button>
              {#if expandedLists['unlimited-models']}
                <ul
                  id={`${id}-unlimited-models`}
                  class="m-0 space-y-1 pb-3 text-sm text-foreground"
                >
                  {#each usage.unlimited.models as model (model.id)}
                    <li class="list-none">{model.label}</li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>
        </section>
      </div>

      <p class="m-0 pt-4 text-xs text-muted-foreground">
        Last updated {formatDate(usage.lastUpdatedAt)}
      </p>
    {:else if loading}
      <div class="space-y-5 border-b border-border py-5" aria-hidden="true">
        <div class="space-y-2">
          <div class="h-4 w-32 animate-pulse rounded bg-muted"></div>
          <div class="h-2 w-full animate-pulse rounded-full bg-muted"></div>
        </div>
        <div class="space-y-2">
          <div class="h-4 w-28 animate-pulse rounded bg-muted"></div>
          <div class="h-2 w-full animate-pulse rounded-full bg-muted"></div>
        </div>
      </div>
    {/if}
  </div>
</div>
