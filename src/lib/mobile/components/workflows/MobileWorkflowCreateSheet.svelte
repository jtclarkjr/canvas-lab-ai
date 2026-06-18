<script lang="ts">
  import { Database, Workflow, X } from 'lucide-svelte'
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import type { WorkflowFlowType } from '$lib/workflows/schema'
  import { workflowFlowTypeOptions } from '$lib/workflows/flow-types'

  let { isCreating, onClose, onCreate } = $props<{
    isCreating: boolean
    onClose: () => void
    onCreate: (flowType: WorkflowFlowType) => void
  }>()

  const iconFor = (flowType: WorkflowFlowType) =>
    flowType === 'database' ? Database : Workflow
</script>

<div class="fixed inset-0 z-50" transition:fade={{ duration: 120 }}>
  <button
    type="button"
    class="absolute inset-0 bg-black/35"
    onclick={onClose}
    aria-label="Close workflow create sheet"
  ></button>

  <div
    class="absolute inset-x-0 bottom-0 z-10 rounded-t-2xl border border-border/70 bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-card-foreground shadow-2xl"
    role="dialog"
    aria-label="Create workflow item"
    transition:fly={{ y: 36, duration: 180, easing: cubicOut }}
  >
    <header class="mb-4 flex items-center gap-3">
      <div class="min-w-0 flex-1">
        <h2 class="text-sm font-bold">Create</h2>
        <p class="text-xs text-muted-foreground">
          Choose a mobile workflow item.
        </p>
      </div>
      <button
        type="button"
        class="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        onclick={onClose}
        aria-label="Close"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </header>

    <div class="grid gap-2">
      {#each workflowFlowTypeOptions as option (option.id)}
        {@const Icon = iconFor(option.id)}
        <button
          type="button"
          class="flex min-h-14 items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 text-left active:bg-secondary disabled:opacity-60"
          onclick={() => onCreate(option.id)}
          disabled={isCreating}
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <Icon class="size-4" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold">{option.createLabel}</span
            >
            <span class="block text-xs text-muted-foreground"
              >{option.label}</span
            >
          </span>
        </button>
      {/each}
    </div>
  </div>
</div>
