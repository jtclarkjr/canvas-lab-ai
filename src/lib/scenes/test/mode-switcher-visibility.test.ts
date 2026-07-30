import { describe, expect, it } from 'vite-plus/test'
import { render } from 'svelte/server'
import CanvasWorkspace from '$lib/components/canvas/workspace/CanvasWorkspace.svelte'
import WorkflowLayer from '$lib/components/canvas/workflows/WorkflowLayer.svelte'
import type { SceneDocumentsStore } from '$lib/stores/scenes/documents/types'
import type { CanvasElement } from '$lib/workspace/schema'
import type { Scene } from '$lib/scenes/schema'
import type { Workflow } from '$lib/workflows/schema'

// The Editor/Scenes/Workflows mode switcher is navigation: readers can switch
// modes, while edit affordances stay gated separately.
describe('scene mode switcher visibility', () => {
  function renderWorkspace(
    role: 'reader' | 'editor' | 'admin' | 'owner',
    options: { isAnonymousPublicViewer?: boolean } = {}
  ) {
    return render(CanvasWorkspace, {
      props: {
        canvasId: 'canvas-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        role,
        ...options
      }
    }).body
  }

  it('renders the mode switcher for non-anonymous users', () => {
    expect(renderWorkspace('reader')).toContain('Scenes')
    expect(renderWorkspace('editor')).toContain('Scenes')
    expect(renderWorkspace('owner')).toContain('Scenes')
  })

  it('hides the mode switcher from anonymous public viewers', () => {
    expect(
      renderWorkspace('reader', { isAnonymousPublicViewer: true })
    ).not.toContain('Scenes')
  })

  it('keeps diagram templates inside the collapsed editing toolbar', () => {
    expect(renderWorkspace('editor')).toContain('Drawing tools')
    expect(renderWorkspace('reader')).not.toContain('Diagram templates')
  })

  it('renders canvas history only for owner and admin users', () => {
    expect(renderWorkspace('owner')).toContain('Open canvas history')
    expect(renderWorkspace('admin')).toContain('Open canvas history')
    expect(renderWorkspace('editor')).not.toContain('Open canvas history')
    expect(renderWorkspace('reader')).not.toContain('Open canvas history')
    expect(
      renderWorkspace('reader', { isAnonymousPublicViewer: true })
    ).not.toContain('Open canvas history')
  })

  it('server-renders initial drawing elements and scene cards', () => {
    const timestamp = '2026-06-12T00:00:00.000Z'
    const initialElements: CanvasElement[] = [
      {
        id: 'path-1',
        canvasId: 'canvas-1',
        type: 'path',
        data: {
          points: [
            { x: 1, y: 2 },
            { x: 3, y: 4 }
          ],
          color: '#111111',
          width: 5,
          opacity: 0.75
        },
        x: 0,
        y: 0,
        z: null,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        updatedAt: timestamp
      },
      {
        id: 'text-1',
        canvasId: 'canvas-1',
        type: 'text',
        data: {
          text: 'Server seeded text',
          color: '#222222',
          fontSize: 18,
          isBold: false,
          isItalic: false,
          isUnderline: false,
          listStyle: 'none'
        },
        x: 10,
        y: 20,
        z: null,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        updatedAt: timestamp
      },
      {
        id: 'shape-1',
        canvasId: 'canvas-1',
        type: 'shape',
        data: {
          kind: 'rectangle',
          width: 120,
          height: 72,
          rotation: 0,
          fillColor: '#ffffff',
          strokeColor: '#000000',
          strokeWidth: 2,
          strokeStyle: 'solid',
          opacity: 1,
          text: 'Shape A',
          textColor: '#000000',
          textFontSize: 16,
          textIsBold: false,
          textIsItalic: false,
          textIsUnderline: false
        },
        x: 160,
        y: 20,
        z: 1,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        updatedAt: timestamp
      },
      {
        id: 'shape-2',
        canvasId: 'canvas-1',
        type: 'shape',
        data: {
          kind: 'rectangle',
          width: 120,
          height: 72,
          rotation: 0,
          fillColor: '#ffffff',
          strokeColor: '#000000',
          strokeWidth: 2,
          strokeStyle: 'solid',
          opacity: 1,
          text: 'Shape B',
          textColor: '#000000',
          textFontSize: 16,
          textIsBold: false,
          textIsItalic: false,
          textIsUnderline: false
        },
        x: 360,
        y: 20,
        z: 2,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        updatedAt: timestamp
      },
      {
        id: 'connector-1',
        canvasId: 'canvas-1',
        type: 'connector',
        data: {
          kind: 'straight',
          start: {
            x: 280,
            y: 56,
            binding: {
              targetType: 'shape',
              targetId: 'shape-1',
              anchor: 'right'
            }
          },
          end: {
            x: 360,
            y: 56,
            binding: {
              targetType: 'shape',
              targetId: 'shape-2',
              anchor: 'left'
            }
          },
          strokeColor: '#000000',
          strokeWidth: 2,
          strokeStyle: 'solid',
          opacity: 1,
          startArrow: 'none',
          endArrow: 'arrow',
          text: 'handoff',
          textColor: '#000000',
          textFontSize: 14,
          textIsBold: false,
          textIsItalic: false,
          textIsUnderline: false
        },
        x: 0,
        y: 0,
        z: 3,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        updatedAt: timestamp
      }
    ]
    const initialScenes: Scene[] = [
      {
        id: 'scene-1',
        canvasId: 'canvas-1',
        type: 'document',
        title: 'Server seeded scene',
        x: 100,
        y: 80,
        width: 320,
        height: 200,
        rotation: 0,
        settings: { preview: 'SSR preview' },
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ]

    const body = render(CanvasWorkspace, {
      props: {
        canvasId: 'canvas-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        role: 'editor',
        initialElements,
        initialScenes
      }
    }).body

    expect(body).toContain('M 1 2 L 3 4')
    expect(body).toContain('M 280 56 L 360 56')
    expect(body).toContain('handoff')
    expect(body).not.toContain('connector-label-mask')
    expect(body).toContain('Server seeded text')
    expect(body).toContain('Server seeded scene')
  })

  it('shows workflow builder panels only for modifiable workflows', () => {
    expect(renderWorkflowLayer(false)).not.toContain('Workflow AI builder')
    expect(renderWorkflowLayer(false)).not.toContain(
      'Workflow code and versions'
    )
    expect(renderWorkflowLayer(true)).toContain('Workflow AI builder')
    expect(renderWorkflowLayer(true)).toContain('Workflow code and versions')
  })
})

function renderWorkflowLayer(canModify: boolean) {
  const workflow = createWorkflow()
  const sceneDocumentsStore = {
    getItems: () => []
  } as unknown as SceneDocumentsStore

  return render(WorkflowLayer, {
    props: {
      canvasId: 'canvas-1',
      workflows: [workflow],
      focusedWorkflow: workflow,
      scenes: [],
      sceneDocumentsStore,
      camera: { x: 0, y: 0, scale: 1 },
      mode: 'workflows',
      selectedTool: 'hand',
      canEdit: true,
      canModifyWorkflow: () => canModify,
      handlers: {
        pointerDown: () => undefined,
        pointerMove: () => undefined,
        pointerUp: () => undefined,
        pointerCancel: () => undefined,
        resizePointerDown: () => undefined,
        resizePointerMove: () => undefined,
        resizePointerUp: () => undefined,
        resizePointerCancel: () => undefined
      },
      onCreateWorkflow: () => undefined,
      onFocusWorkflow: () => undefined,
      onClearFocusedWorkflow: () => undefined,
      onDeleteWorkflow: () => undefined,
      onPatchWorkflow: async () => null,
      onPatchWorkflowDefinition: async () => null,
      onPatchWorkflowYaml: async () => null,
      onPatchWorkflowNotes: async () => null,
      onPatchWorkflowSettings: async () => null
    }
  }).body
}

function createWorkflow(): Workflow {
  const timestamp = '2026-06-12T00:00:00.000Z'

  return {
    id: 'workflow-1',
    canvasId: 'canvas-1',
    title: 'Server seeded workflow',
    x: 120,
    y: 96,
    width: 760,
    height: 500,
    rotation: 0,
    definition: {
      version: 1,
      flowType: 'workflow',
      name: 'Server seeded workflow',
      description: '',
      steps: []
    },
    configYaml: 'version: 1\nname: Server seeded workflow\n',
    notes: '',
    settings: {
      context: {
        documentIds: [],
        sceneIds: [],
        includeLinkedScenes: true
      }
    },
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: timestamp,
    updatedAt: timestamp
  }
}
