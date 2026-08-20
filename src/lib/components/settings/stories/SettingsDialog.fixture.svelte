<script lang="ts">
  import { onMount } from 'svelte'
  import SettingsDialog from '../SettingsDialog.svelte'
  import { settingsDialog } from '$lib/stores/shared/settings-dialog.svelte'

  let { activeTab = 'general' } = $props<{
    activeTab?: 'general' | 'ai-usage'
  }>()

  onMount(() => {
    settingsDialog.open(activeTab)
    return () => settingsDialog.close()
  })
</script>

<SettingsDialog />
