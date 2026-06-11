<script lang="ts">
  import { onMount } from 'svelte'

  let {
    open = $bindable(false),
    title = '',
    eyebrow = '',
    widthClass = 'max-w-lg',
    showClose = false,
    children
  } = $props<{
    open?: boolean
    title?: string
    eyebrow?: string
    widthClass?: string
    showClose?: boolean
    children?: () => unknown
  }>()

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        open = false
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function portal(node: HTMLElement) {
    document.body.appendChild(node)
    return {
      destroy() {
        node.parentNode?.removeChild(node)
      }
    }
  }
</script>

{#if open}
  <div use:portal class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-black/45 backdrop-blur-sm"
      onclick={() => (open = false)}
      aria-label="Close dialog"
    ></button>
    <div
      class={`glass-card surface-border relative z-10 w-full rounded-[2rem] p-6 ${widthClass}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div class="mb-5 flex items-start justify-between gap-4">
        <div class="grid gap-1">
          {#if eyebrow}
            <p class="text-xs font-black uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
          {/if}
          <h2 class="text-2xl font-bold text-foreground">{title}</h2>
        </div>
        {#if showClose}
          <button
            type="button"
            class="flex size-10 items-center justify-center rounded-full bg-secondary text-lg text-secondary-foreground transition hover:scale-105"
            onclick={() => (open = false)}
            aria-label="Close dialog"
          >
            ×
          </button>
        {/if}
      </div>

      {@render children?.()}
    </div>
  </div>
{/if}
