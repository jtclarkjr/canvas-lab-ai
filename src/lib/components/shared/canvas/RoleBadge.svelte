<script lang="ts">
  import { ROLE_LABELS } from '$lib/canvas/consts'
  import type { CanvasRole } from '$lib/canvas/roles'
  import { Badge } from '$lib/components/ui'

  let { role } = $props<{ role: CanvasRole }>()
  const safeRole = $derived(role as CanvasRole)

  const styles: Record<CanvasRole, string> = {
    owner:
      'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300',
    admin: 'border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300',
    editor:
      'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    reader:
      'border-slate-500/30 bg-slate-500/15 text-slate-600 dark:text-slate-300'
  }
</script>

<Badge class={`text-[10px] uppercase tracking-[0.12em] ${styles[safeRole]}`}>
  {ROLE_LABELS[safeRole]}
</Badge>
