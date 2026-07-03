<script lang="ts">
  import { onMount } from 'svelte'
  import { X } from 'lucide-svelte'

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

  let backdropEl = $state<HTMLButtonElement | null>(null)
  let cardEl = $state<HTMLDivElement | null>(null)
  let visible = $state(false)
  const titleId = `modal-title-${Math.random().toString(36).slice(2)}`
  let cardAnim: Animation | null = null
  let backdropAnim: Animation | null = null

  $effect(() => {
    if (open) {
      visible = true
      queueMicrotask(() => {
        const firstFocusable = cardEl?.querySelector<HTMLElement>(
          'button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
        )
        firstFocusable?.focus()
        if (backdropEl) {
          backdropAnim?.cancel()
          backdropAnim = backdropEl.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 200,
            easing: 'ease-out'
          })
        }
        if (cardEl) {
          cardAnim?.cancel()
          cardAnim = cardEl.animate(
            [
              { opacity: 0, transform: 'scale(0.95)' },
              { opacity: 1, transform: 'scale(1)' }
            ],
            { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
          )
        }
      })
    } else {
      if (!visible) return
      const bEl = backdropEl
      const cEl = cardEl
      if (cEl) {
        cardAnim?.cancel()
        cardAnim = cEl.animate(
          [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(0.95)' }
          ],
          { duration: 160, easing: 'ease-in', fill: 'forwards' }
        )
      }
      if (bEl) {
        backdropAnim?.cancel()
        backdropAnim = bEl.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 160,
          easing: 'ease-in',
          fill: 'forwards'
        })
      }
      ;(cardAnim ?? backdropAnim)?.finished
        .then(() => {
          visible = false
        })
        .catch(() => undefined)
      if (!cardAnim && !backdropAnim) visible = false
    }
  })

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

{#if visible}
  <div
    use:portal
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
  >
    <button
      bind:this={backdropEl}
      type="button"
      class="absolute inset-0 bg-black/45 backdrop-blur-sm"
      onclick={() => (open = false)}
      aria-label="Close dialog"
      tabindex="-1"
    ></button>
    <div
      bind:this={cardEl}
      class={`glass-card surface-border relative z-10 w-full rounded-[2rem] p-6 ${widthClass}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div class="mb-5 flex min-w-0 items-start justify-between gap-4">
        <div class="grid min-w-0 flex-1 gap-1">
          {#if eyebrow}
            <p
              class="truncate text-xs font-black uppercase tracking-[0.24em] text-primary"
              title={eyebrow}
            >
              {eyebrow}
            </p>
          {/if}
          <h2
            id={titleId}
            class="truncate text-2xl font-bold text-foreground"
            {title}
          >
            {title}
          </h2>
        </div>
        {#if showClose}
          <button
            type="button"
            class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition hover:scale-105"
            onclick={() => (open = false)}
            aria-label="Close dialog"
          >
            <X class="size-4" aria-hidden="true" />
          </button>
        {/if}
      </div>

      {@render children?.()}
    </div>
  </div>
{/if}
