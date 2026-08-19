<script lang="ts">
  import { LogIn } from 'lucide-svelte'
  import { onMount, tick } from 'svelte'
  import type {
    LegalPolicy,
    LegalPolicySection
  } from '$lib/legal/policies/types'

  let { policy } = $props<{
    policy: LegalPolicy
  }>()

  type TocEntry = {
    id: string
    label: string
    isHeader: boolean
  }

  const tocEntries = $derived.by((): TocEntry[] => [
    {
      id: policy.slug,
      label: `Last Updated: ${policy.lastUpdated}`,
      isHeader: true
    },
    ...policy.sections.map((section: LegalPolicySection): TocEntry => ({
      id: section.id,
      label: section.title,
      isHeader: false
    }))
  ])

  let activeSectionId = $state('')
  const currentSectionId = $derived(activeSectionId || policy.slug)
  let desktopTocElement = $state<HTMLOListElement | null>(null)
  let mobileTocElement = $state<HTMLOListElement | null>(null)
  let desktopIndicatorStyle = $state('height: 0px; opacity: 0;')
  let mobileIndicatorStyle = $state('height: 0px; opacity: 0;')

  function tocLinkClass(entryId: string, isHeader: boolean, isMobile = false) {
    const inactiveColor = isMobile
      ? 'text-zinc-400 hover:text-zinc-100'
      : 'text-zinc-400 hover:text-zinc-100'

    return [
      'block text-sm leading-5 transition-colors duration-200',
      currentSectionId === entryId
        ? 'font-semibold text-zinc-100'
        : `${isHeader ? 'font-semibold ' : ''}${inactiveColor}`
    ].join(' ')
  }

  function indicatorStyleFor(tocElement: HTMLOListElement | null) {
    if (!tocElement) {
      return 'height: 0px; opacity: 0;'
    }

    const activeLink = Array.from(
      tocElement.querySelectorAll<HTMLAnchorElement>('[data-toc-id]')
    ).find((link) => link.dataset.tocId === currentSectionId)

    if (!activeLink) {
      return 'height: 0px; opacity: 0;'
    }

    return `transform: translateY(${activeLink.offsetTop}px); height: ${activeLink.offsetHeight}px; opacity: 1;`
  }

  function updateTocIndicators() {
    desktopIndicatorStyle = indicatorStyleFor(desktopTocElement)
    mobileIndicatorStyle = indicatorStyleFor(mobileTocElement)
  }

  function updateActiveSection() {
    const activationLine = Math.min(window.innerHeight * 0.35, 260)
    let nextActiveId = policy.slug

    for (const entry of tocEntries) {
      const element = document.getElementById(entry.id)
      if (!element) continue

      if (element.getBoundingClientRect().top <= activationLine) {
        nextActiveId = entry.id
      }
    }

    activeSectionId = nextActiveId
    updateTocIndicators()
  }

  $effect(() => {
    if (currentSectionId) {
      void tick().then(updateTocIndicators)
    }
  })

  onMount(() => {
    let frame = 0

    const scheduleActiveUpdate = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateActiveSection)
    }

    updateActiveSection()
    window.addEventListener('scroll', scheduleActiveUpdate, { passive: true })
    window.addEventListener('resize', scheduleActiveUpdate)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleActiveUpdate)
      window.removeEventListener('resize', scheduleActiveUpdate)
    }
  })
</script>

<main class="min-h-screen bg-[#050505] px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
  <a
    href="/login"
    class="fixed right-4 top-4 z-20 inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/90 px-3 text-sm font-semibold text-zinc-100 shadow-lg backdrop-blur transition hover:border-zinc-600 hover:bg-zinc-900 sm:right-6 sm:top-6"
  >
    <LogIn class="size-4" aria-hidden="true" />
    Login
  </a>

  <div
    class="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]"
  >
    <aside class="hidden lg:block">
      <nav class="sticky top-10 max-h-[calc(100vh-5rem)] overflow-y-auto pr-6">
        <p class="m-0 mb-4 text-xs font-medium uppercase text-zinc-400">
          On this page
        </p>
        <ol
          bind:this={desktopTocElement}
          class="relative m-0 grid list-none gap-3 border-l border-zinc-800 p-0 pl-3"
        >
          <span
            class="pointer-events-none absolute -left-px top-0 w-px rounded-full bg-zinc-100 transition-[transform,height,opacity] duration-300 ease-out motion-reduce:transition-none"
            style={desktopIndicatorStyle}
            aria-hidden="true"
          ></span>
          {#each tocEntries as entry}
            <li>
              <a
                class={tocLinkClass(entry.id, entry.isHeader)}
                href={`#${entry.id}`}
                data-toc-id={entry.id}
                aria-current={currentSectionId === entry.id
                  ? 'location'
                  : undefined}
              >
                {entry.label}
              </a>
            </li>
          {/each}
        </ol>
      </nav>
    </aside>

    <article
      class="min-w-0 rounded-[1.5rem] border border-zinc-800 bg-[#080808] px-5 py-8 shadow-[0_22px_80px_rgba(0,0,0,0.35)] sm:px-8 lg:px-12"
    >
      <header id={policy.slug} class="scroll-mt-8">
        <h1 class="m-0 text-3xl font-bold leading-tight text-white sm:text-4xl">
          {policy.title}
        </h1>
        <p
          class="mt-10 mb-0 border-b border-zinc-800 pb-4 text-2xl font-bold text-white"
        >
          Last Updated: {policy.lastUpdated}
        </p>
      </header>

      <nav
        class="my-8 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 lg:hidden"
      >
        <p class="m-0 mb-3 text-xs font-medium uppercase text-zinc-400">
          On this page
        </p>
        <ol
          bind:this={mobileTocElement}
          class="relative m-0 grid list-none gap-2 border-l border-zinc-800 p-0 pl-3"
        >
          <span
            class="pointer-events-none absolute -left-px top-0 w-px rounded-full bg-zinc-100 transition-[transform,height,opacity] duration-300 ease-out motion-reduce:transition-none"
            style={mobileIndicatorStyle}
            aria-hidden="true"
          ></span>
          {#each tocEntries as entry}
            <li>
              <a
                class={tocLinkClass(entry.id, entry.isHeader, true)}
                href={`#${entry.id}`}
                data-toc-id={entry.id}
                aria-current={currentSectionId === entry.id
                  ? 'location'
                  : undefined}
              >
                {entry.label}
              </a>
            </li>
          {/each}
        </ol>
      </nav>

      <div class="grid gap-10 pt-10">
        {#each policy.sections as section}
          <section id={section.id} class="scroll-mt-8">
            <h2
              class="m-0 border-b border-zinc-800 pb-3 text-2xl font-bold leading-tight text-white"
            >
              {section.title}
            </h2>
            {#if section.paragraphs?.length}
              <div class="mt-5 grid gap-5">
                {#each section.paragraphs as paragraph}
                  <p class="m-0 text-base leading-8 text-zinc-100">
                    {paragraph}
                  </p>
                {/each}
              </div>
            {/if}
            {#if section.bullets?.length}
              <ul
                class="mt-5 grid list-disc gap-3 pl-6 text-base leading-8 text-zinc-100"
              >
                {#each section.bullets as bullet}
                  <li>{bullet}</li>
                {/each}
              </ul>
            {/if}
          </section>
        {/each}
      </div>
    </article>
  </div>
</main>
