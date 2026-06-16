import type { CanvasWorkspaceStoreInput } from '$lib/workspace/types'
import {
  createWorkspaceCoordinatorActions,
  type WorkspaceCoordinatorActions
} from './coordinator/actions.svelte'
import {
  createWorkspaceChildStores,
  type WorkspaceChildStores
} from './coordinator/child-stores.svelte'
import { createWorkspaceElementActions } from './coordinator/element-actions'
import { installWorkspaceCoordinatorEffects } from './coordinator/effects.svelte'
import { createWorkspaceFacade } from './coordinator/facade.svelte'
import { createWorkspaceCoordinatorState } from './coordinator/state.svelte'

export function createCanvasWorkspaceStore(input: CanvasWorkspaceStoreInput) {
  const state = createWorkspaceCoordinatorState(input)
  let stores: WorkspaceChildStores
  let actions: WorkspaceCoordinatorActions
  const elementActions = createWorkspaceElementActions({
    state,
    setCanvasesError: (message) => stores.canvasesStore.setError(message)
  })

  stores = createWorkspaceChildStores({ state, input, elementActions })
  actions = createWorkspaceCoordinatorActions({
    state,
    stores,
    elementActions
  })
  installWorkspaceCoordinatorEffects({
    state,
    stores,
    actions,
    elementActions
  })

  return createWorkspaceFacade({ state, stores, actions })
}
