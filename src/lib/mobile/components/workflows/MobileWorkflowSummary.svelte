<script lang="ts">
  import { Database, Workflow } from 'lucide-svelte'
  import type { Workflow as CanvasWorkflow } from '$lib/workflows/schema'
  import { isDatabaseFlowDefinition } from '$lib/workflows/database/definition'

  let { workflow } = $props<{ workflow: CanvasWorkflow }>()
</script>

<div class="h-full overflow-y-auto px-4 py-3">
  {#if isDatabaseFlowDefinition(workflow.definition)}
    <div class="space-y-3">
      {#each workflow.definition.tables as table (table.id)}
        <section class="rounded-xl border border-border/70 bg-card p-3">
          <div class="mb-2 flex items-center gap-2">
            <Database class="size-4 text-primary" aria-hidden="true" />
            <h3 class="min-w-0 flex-1 truncate text-sm font-semibold">
              {table.name}
            </h3>
            <span class="text-xs text-muted-foreground">
              {table.columns.length}
            </span>
          </div>
          <div class="space-y-1">
            {#each table.columns as column (column.id)}
              <div
                class="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-xs"
              >
                <span class="min-w-0 flex-1 truncate font-medium">
                  {column.name}
                </span>
                <span class="shrink-0 text-muted-foreground">
                  {column.dataType}
                </span>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {:else}
    <div class="space-y-3">
      {#each workflow.definition.steps as step, index (step.id)}
        <section class="rounded-xl border border-border/70 bg-card p-3">
          <div class="mb-1 flex items-center gap-2">
            <span
              class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
            >
              {index + 1}
            </span>
            <h3 class="min-w-0 flex-1 truncate text-sm font-semibold">
              {step.title}
            </h3>
            <span class="text-xs text-muted-foreground">{step.type}</span>
          </div>
          {#if step.description}
            <p class="text-xs leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          {/if}
          {#if step.needs.length > 0}
            <div class="mt-2 flex flex-wrap gap-1">
              {#each step.needs as dependency}
                <span
                  class="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  after {dependency}
                </span>
              {/each}
            </div>
          {/if}
        </section>
      {/each}

      {#if workflow.definition.steps.length === 0}
        <div
          class="flex h-full min-h-60 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground"
        >
          <Workflow class="size-5" aria-hidden="true" />
          No workflow nodes yet.
        </div>
      {/if}
    </div>
  {/if}
</div>
