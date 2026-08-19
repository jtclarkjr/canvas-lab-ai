<script lang="ts">
  import Button from '../../actions/Button.svelte'
  import Dialog from '../../overlays/Dialog.svelte'

  let {
    initialOpen = false,
    title = 'Invite collaborators',
    description = 'Choose who can access this canvas.',
    showClose = true,
    closeOnOutside = true
  } = $props<{
    initialOpen?: boolean
    title?: string
    description?: string
    showClose?: boolean
    closeOnOutside?: boolean
  }>()

  let open = $state(false)

  $effect(() => {
    open = initialOpen
  })
</script>

<div class="flex min-h-48 items-center justify-center p-6">
  <Button onclick={() => (open = true)}>Open dialog</Button>
</div>

<Dialog
  bind:open
  {title}
  eyebrow="Sharing"
  {description}
  {showClose}
  {closeOnOutside}
>
  <div class="grid gap-3">
    <label class="grid gap-1 text-sm font-medium" for="dialog-email">
      Email address
      <input
        id="dialog-email"
        class="h-10 rounded-xl border border-input bg-background px-3"
        placeholder="name@example.com"
      />
    </label>
    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={() => (open = false)}>Send invite</Button>
    </div>
  </div>
</Dialog>
