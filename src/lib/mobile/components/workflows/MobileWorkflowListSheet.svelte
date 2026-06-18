<script lang="ts">
  import { Database, Plus, Workflow as WorkflowIcon } from 'lucide-svelte'
  import { cubicOut } from 'svelte/easing'
  import { fade, fly } from 'svelte/transition'
  import type { Workflow } from '$lib/workflows/schema'
  import { isDatabaseFlowDefinition } from '$lib/workflows/database/definition'

  let { workflows, canEdit, onOpen, onCreateRequest, onClose } = $props<{
    workflows: Workflow[]
    canEdit: boolean
    onOpen: (workflowId: string) => void
    onCreateRequest: () => void
    onClose: () => void
  }>()

  function countLabel(workflow: Workflow) {
    if (isDatabaseFlowDefinition(workflow.definition)) {
      return `${workflow.definition.tables.length} tables`
    }
    return `${workflow.definition.steps.length} nodes`
  }
</script>

<div class="fixed inset-0 z-50" transition:fade={{ duration: 120 }}>
  <button
    type="button"
    class="absolute inset-0 bg-black/35"
    onclick={onClose}
    aria-label="Close workflow list"
  ></button>

  <div
    class="absolute inset-x-0 bottom-0 z-10 max-h-[82dvh] overflow-hidden rounded-t-2xl border border-border/70 bg-card pb-[calc(env(safe-area-inset-bottom)+1rem)] text-card-foreground shadow-2xl"
    role="dialog"
    aria-label="Workflows"
    transition:fly={{ y: 36, duration: 180, easing: cubicOut }}
  >
    <header class="border-b border-border/70 px-4 py-3">
      <h2 class="text-sm font-bold">Workflows</h2>
      <p class="text-xs text-muted-foreground">
        Open an item without hunting for it on the canvas.
      </p>
    </header>

    <div class="max-h-[60dvh] overflow-y-auto px-4 py-3">
      <div class="grid gap-2">
        {#each workflows as workflow (workflow.id)}
          {@const isDatabase = isDatabaseFlowDefinition(workflow.definition)}
          <button
            type="button"
            class="flex min-h-14 items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 text-left active:bg-secondary"
            onclick={() => onOpen(workflow.id)}
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              {#if isDatabase}
                <Database class="size-4" aria-hidden="true" />
              {:else}
                <WorkflowIcon class="size-4" aria-hidden="true" />
              {/if}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">
                {workflow.title || 'Untitled workflow'}
              </span>
              <span class="block text-xs text-muted-foreground">
                {countLabel(workflow)}
              </span>
            </span>
          </button>
        {/each}
      </div>
    </div>

    {#if canEdit}
      <div class="border-t border-border/70 px-4 pt-3">
        <button
          type="button"
          class="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground"
          onclick={onCreateRequest}
        >
          <Plus class="size-4" aria-hidden="true" />
          New workflow
        </button>
      </div>
    {/if}
  </div>
</div>
