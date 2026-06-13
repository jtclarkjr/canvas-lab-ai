import {
  createWorkflow as createWorkflowApi,
  deleteWorkflow as deleteWorkflowApi,
  listWorkflows,
  updateWorkflow as updateWorkflowApi
} from '$lib/workflows/api'
import {
  workflowDefinitionFromYaml,
  workflowDefinitionToYaml
} from '$lib/workflows/definition'
import type {
  UpdateWorkflowInput,
  Workflow,
  WorkflowDefinition,
  WorkflowSettings
} from '$lib/workflows/schema'
import type { CanvasRole } from '$lib/canvas/roles'

const DRAG_THRESHOLD_PX = 5
const MIN_WORKFLOW_WIDTH = 360
const MIN_WORKFLOW_HEIGHT = 280
const MAX_WORKFLOW_SIZE = 4000
const DEFAULT_WORKFLOW_SIZE = { width: 760, height: 500 }

type PendingFrameDrag = {
  workflowId: string
  startClientX: number
  startClientY: number
  originX: number
  originY: number
  started: boolean
}

type PendingFrameResize = {
  workflowId: string
  startClientX: number
  startClientY: number
  originWidth: number
  originHeight: number
}

type WorkspaceWorkflowsInput = {
  getActiveCanvasId: () => string
  getUserId: () => string
  getRole: () => CanvasRole
  getRootElement: () => HTMLDivElement | null
  getCameraScale: () => number
  initialWorkflows?: Workflow[]
  screenToCanvasPoint: (
    clientX: number,
    clientY: number
  ) => {
    x: number
    y: number
  }
}

export function createWorkspaceWorkflowsStore({
  getActiveCanvasId,
  getUserId,
  getRole,
  getRootElement,
  getCameraScale,
  initialWorkflows,
  screenToCanvasPoint
}: WorkspaceWorkflowsInput) {
  let workflows = $state<Workflow[]>(initialWorkflows ?? [])
  let isLoading = $state(false)
  let isCreatingWorkflow = $state(false)
  let error = $state<string | null>(null)
  let focusedWorkflowId = $state<string | null>(null)
  let draggingWorkflowId = $state<string | null>(null)
  let resizingWorkflowId = $state<string | null>(null)
  let transformBusyWorkflowIds = $state<Record<string, true>>({})

  let pendingDrag: PendingFrameDrag | null = null
  let pendingResize: PendingFrameResize | null = null
  let lastLoadedCanvasId = ''

  function setWorkflows(
    next: Workflow[] | ((previous: Workflow[]) => Workflow[])
  ) {
    workflows = typeof next === 'function' ? next(workflows) : next
    if (
      focusedWorkflowId &&
      !workflows.some((item) => item.id === focusedWorkflowId)
    ) {
      focusedWorkflowId = null
    }
  }

  function getWorkflow(id: string) {
    return workflows.find((workflow) => workflow.id === id) ?? null
  }

  function canModifyWorkflow(id: string) {
    const role = getRole()
    if (role === 'owner' || role === 'admin') {
      return true
    }
    return role === 'editor' && getWorkflow(id)?.createdBy === getUserId()
  }

  async function loadWorkflows(canvasId: string) {
    if (!canvasId || canvasId === lastLoadedCanvasId) {
      return
    }

    lastLoadedCanvasId = canvasId
    isLoading = true
    error = null

    try {
      const response = await listWorkflows(canvasId)
      workflows = response.items
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to load workflows.'
    } finally {
      isLoading = false
    }
  }

  async function reloadWorkflows() {
    lastLoadedCanvasId = ''
    await loadWorkflows(getActiveCanvasId())
  }

  async function createWorkflowAtViewportCenter() {
    const canvasId = getActiveCanvasId()
    const rootEl = getRootElement()
    if (!canvasId || !rootEl) {
      return null
    }

    if (isCreatingWorkflow) {
      return null
    }
    isCreatingWorkflow = true

    const rect = rootEl.getBoundingClientRect()
    const center = screenToCanvasPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    )

    try {
      const response = await createWorkflowApi(canvasId, {
        title: 'Workflow',
        x: center.x - DEFAULT_WORKFLOW_SIZE.width / 2,
        y: center.y - DEFAULT_WORKFLOW_SIZE.height / 2,
        width: DEFAULT_WORKFLOW_SIZE.width,
        height: DEFAULT_WORKFLOW_SIZE.height
      })

      setWorkflows((previous) => {
        if (previous.some((workflow) => workflow.id === response.item.id)) {
          return previous
        }
        return [...previous, response.item]
      })
      focusedWorkflowId = response.item.id
      return response.item
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to create workflow.'
      return null
    } finally {
      isCreatingWorkflow = false
    }
  }

  function persistWorkflowPatch(
    workflowId: string,
    patch: Partial<Pick<Workflow, 'x' | 'y' | 'width' | 'height' | 'rotation'>>
  ) {
    const canvasId = getActiveCanvasId()
    if (!canvasId) {
      return
    }

    void updateWorkflowApi(canvasId, workflowId, patch).catch((cause) => {
      error =
        cause instanceof Error ? cause.message : 'Failed to save workflow.'
      void reloadWorkflows()
    })
  }

  async function patchWorkflow(workflowId: string, patch: UpdateWorkflowInput) {
    const canvasId = getActiveCanvasId()
    if (!canvasId) {
      return null
    }

    const previousWorkflows = workflows
    setWorkflows((previous) =>
      previous.map((workflow) =>
        workflow.id === workflowId ? { ...workflow, ...patch } : workflow
      )
    )

    try {
      const response = await updateWorkflowApi(canvasId, workflowId, patch)
      setWorkflows((previous) =>
        previous.map((workflow) =>
          workflow.id === workflowId ? response.item : workflow
        )
      )
      return response.item
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to save workflow.'
      workflows = previousWorkflows
      return null
    }
  }

  async function patchWorkflowDefinition(
    workflowId: string,
    definition: WorkflowDefinition
  ) {
    return patchWorkflow(workflowId, {
      definition,
      configYaml: workflowDefinitionToYaml(definition)
    })
  }

  async function patchWorkflowYaml(workflowId: string, configYaml: string) {
    const definition = workflowDefinitionFromYaml(configYaml)
    return patchWorkflow(workflowId, { definition, configYaml })
  }

  async function patchWorkflowNotes(workflowId: string, notes: string) {
    return patchWorkflow(workflowId, { notes })
  }

  async function patchWorkflowSettings(
    workflowId: string,
    settings: WorkflowSettings
  ) {
    return patchWorkflow(workflowId, { settings })
  }

  async function deleteWorkflow(workflowId: string) {
    const canvasId = getActiveCanvasId()
    if (!canvasId) {
      return
    }

    const previousWorkflows = workflows
    setWorkflows((previous) =>
      previous.filter((workflow) => workflow.id !== workflowId)
    )
    if (focusedWorkflowId === workflowId) {
      focusedWorkflowId = null
    }

    try {
      await deleteWorkflowApi(canvasId, workflowId)
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to delete workflow.'
      workflows = previousWorkflows
    }
  }

  function focusWorkflow(workflowId: string) {
    focusedWorkflowId = workflowId
  }

  function clearFocusedWorkflow() {
    focusedWorkflowId = null
  }

  function handleFramePointerDown(event: PointerEvent, workflowId: string) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const interactive = (event.target as Element).closest(
      'button, a, input, textarea, select, [role="button"], .svelte-flow'
    )
    if (interactive && interactive !== event.currentTarget) {
      return
    }

    event.stopPropagation()
    if (event.pointerType !== 'mouse') {
      event.preventDefault()
    }

    const workflow = getWorkflow(workflowId)
    if (!workflow) return
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    pendingDrag = {
      workflowId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: workflow.x,
      originY: workflow.y,
      started: false
    }
  }

  function handleFramePointerMove(event: PointerEvent, workflowId: string) {
    if (!pendingDrag || pendingDrag.workflowId !== workflowId) return
    event.stopPropagation()

    const dx = event.clientX - pendingDrag.startClientX
    const dy = event.clientY - pendingDrag.startClientY

    if (!pendingDrag.started) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
        return
      }
      if (!canModifyWorkflow(workflowId)) {
        return
      }
      pendingDrag.started = true
      draggingWorkflowId = workflowId
    }

    const scale = getCameraScale()
    const nextX = pendingDrag.originX + dx / scale
    const nextY = pendingDrag.originY + dy / scale

    setWorkflows((previous) =>
      previous.map((workflow) =>
        workflow.id === workflowId
          ? { ...workflow, x: nextX, y: nextY }
          : workflow
      )
    )
  }

  function handleFramePointerUp(event: PointerEvent, workflowId: string) {
    if (!pendingDrag || pendingDrag.workflowId !== workflowId) return
    event.stopPropagation()

    const frameEl = event.currentTarget as HTMLElement
    if (frameEl.hasPointerCapture(event.pointerId)) {
      frameEl.releasePointerCapture(event.pointerId)
    }

    const wasDrag = pendingDrag.started
    pendingDrag = null
    draggingWorkflowId = null

    if (wasDrag) {
      const workflow = getWorkflow(workflowId)
      if (workflow) {
        persistWorkflowPatch(workflowId, { x: workflow.x, y: workflow.y })
      }
      return
    }

    focusWorkflow(workflowId)
  }

  function handleFramePointerCancel(event: PointerEvent, workflowId: string) {
    if (!pendingDrag || pendingDrag.workflowId !== workflowId) return
    event.stopPropagation()
    pendingDrag = null
    draggingWorkflowId = null
  }

  function handleResizePointerDown(event: PointerEvent, workflowId: string) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (!canModifyWorkflow(workflowId)) return

    event.stopPropagation()
    event.preventDefault()

    const workflow = getWorkflow(workflowId)
    if (!workflow) return
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    pendingResize = {
      workflowId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originWidth: workflow.width,
      originHeight: workflow.height
    }
    resizingWorkflowId = workflowId
  }

  function handleResizePointerMove(event: PointerEvent, workflowId: string) {
    if (!pendingResize || pendingResize.workflowId !== workflowId) return
    event.stopPropagation()

    const scale = getCameraScale()
    const dx = (event.clientX - pendingResize.startClientX) / scale
    const dy = (event.clientY - pendingResize.startClientY) / scale

    const nextWidth = Math.min(
      Math.max(pendingResize.originWidth + dx, MIN_WORKFLOW_WIDTH),
      MAX_WORKFLOW_SIZE
    )
    const nextHeight = Math.min(
      Math.max(pendingResize.originHeight + dy, MIN_WORKFLOW_HEIGHT),
      MAX_WORKFLOW_SIZE
    )

    setWorkflows((previous) =>
      previous.map((workflow) =>
        workflow.id === workflowId
          ? { ...workflow, width: nextWidth, height: nextHeight }
          : workflow
      )
    )
  }

  function handleResizePointerUp(event: PointerEvent, workflowId: string) {
    if (!pendingResize || pendingResize.workflowId !== workflowId) return
    event.stopPropagation()

    const handleEl = event.currentTarget as HTMLElement
    if (handleEl.hasPointerCapture(event.pointerId)) {
      handleEl.releasePointerCapture(event.pointerId)
    }

    pendingResize = null
    resizingWorkflowId = null

    const workflow = getWorkflow(workflowId)
    if (workflow) {
      persistWorkflowPatch(workflowId, {
        width: workflow.width,
        height: workflow.height
      })
    }
  }

  function handleResizePointerCancel(event: PointerEvent, workflowId: string) {
    if (!pendingResize || pendingResize.workflowId !== workflowId) return
    event.stopPropagation()
    pendingResize = null
    resizingWorkflowId = null
  }

  function handleWorkflowDeletedRemotely(workflowId: string) {
    if (focusedWorkflowId === workflowId) {
      focusedWorkflowId = null
    }
  }

  function isWorkflowBusy(workflowId: string) {
    return (
      draggingWorkflowId === workflowId ||
      resizingWorkflowId === workflowId ||
      transformBusyWorkflowIds[workflowId] === true
    )
  }

  function setTransformBusyWorkflows(workflowIds: string[]) {
    transformBusyWorkflowIds = Object.fromEntries(
      workflowIds.map((workflowId) => [workflowId, true])
    )
  }

  return {
    loadWorkflows,
    createWorkflowAtViewportCenter,
    patchWorkflow,
    patchWorkflowDefinition,
    patchWorkflowYaml,
    patchWorkflowNotes,
    patchWorkflowSettings,
    deleteWorkflow,
    canModifyWorkflow,
    persistWorkflowPatch,
    setWorkflows,
    getWorkflow,
    focusWorkflow,
    clearFocusedWorkflow,
    handleFramePointerDown,
    handleFramePointerMove,
    handleFramePointerUp,
    handleFramePointerCancel,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    handleResizePointerCancel,
    handleWorkflowDeletedRemotely,
    isWorkflowBusy,
    setTransformBusyWorkflows,
    get workflows() {
      return workflows
    },
    get focusedWorkflowId() {
      return focusedWorkflowId
    },
    get focusedWorkflow() {
      return focusedWorkflowId ? getWorkflow(focusedWorkflowId) : null
    },
    get isLoading() {
      return isLoading
    },
    get isCreatingWorkflow() {
      return isCreatingWorkflow
    },
    get error() {
      return error
    },
    get draggingWorkflowId() {
      return draggingWorkflowId
    }
  }
}
