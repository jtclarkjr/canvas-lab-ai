import type { createWorkspaceCoordinatorActions } from '../actions.svelte'

export type WorkspaceCoordinatorActions = ReturnType<
  typeof createWorkspaceCoordinatorActions
>
