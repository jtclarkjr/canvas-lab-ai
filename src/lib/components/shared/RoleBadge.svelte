<script lang="ts">
  import { ROLE_LABELS, type CanvasRole } from '$lib/canvas/roles'

  let { role } = $props<{ role: CanvasRole }>()

  const styles: Record<CanvasRole, string> = {
    owner: 'bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300',
    admin: 'bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300',
    editor: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
    reader: 'bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-300'
  }
</script>

<span
  class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${styles[role as CanvasRole]}`}
>
  {ROLE_LABELS[role as CanvasRole]}
</span>
