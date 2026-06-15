<script lang="ts">
  import { diagramTemplates } from '$lib/canvas/temple/consts'
  import type { DiagramTemplateId } from '$lib/canvas/temple/types'

  let { onTemplateInsert, onClose } = $props<{
    onTemplateInsert: (templateId: DiagramTemplateId) => void
    onClose: () => void
  }>()

  function insertTemplate(templateId: DiagramTemplateId) {
    onTemplateInsert(templateId)
    onClose()
  }
</script>

<div class="p-1" role="menu">
  {#each diagramTemplates as template (template.id)}
    <button
      type="button"
      class="w-full rounded-md px-3 py-2 text-left transition hover:bg-accent hover:text-accent-foreground"
      role="menuitem"
      onclick={() => insertTemplate(template.id)}
    >
      <span class="block text-sm font-medium">{template.label}</span>
      <span class="block text-xs text-muted-foreground">
        {template.description}
      </span>
    </button>
  {/each}
</div>
