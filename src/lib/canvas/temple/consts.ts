import type {
  AnchorPosition,
  ConnectorKind,
  ShapeKind
} from '$lib/canvas/types'
import type {
  DiagramTemplateConnectorSpec,
  DiagramTemplateDefinition,
  DiagramTemplateId,
  DiagramTemplateShapeSpec,
  DiagramTemplateSpec
} from './types'

export const diagramTemplates: DiagramTemplateDefinition[] = [
  {
    id: 'basic-flow',
    label: 'Basic flow',
    description: 'Start, actions, and end'
  },
  {
    id: 'decision-branch',
    label: 'Decision branch',
    description: 'Yes/no paths with merge'
  },
  {
    id: 'approval-loop',
    label: 'Approval loop',
    description: 'Review, approval, and revision'
  },
  {
    id: 'swimlane-activity',
    label: 'Swimlane activity',
    description: 'Two-lane handoff flow'
  }
]

const basicFlowTemplateSpec: DiagramTemplateSpec = {
  width: 918,
  height: 96,
  shapes: [
    shape('start', 'ellipse', 0, 16, 128, 64, 'Start'),
    shape('action', 'rectangle', 250, 8, 160, 80, 'Action'),
    shape('next', 'rectangle', 520, 8, 160, 80, 'Next action'),
    shape('end', 'ellipse', 790, 16, 128, 64, 'End')
  ],
  connectors: [
    connector('start-action', 'start', 'right', 'action', 'left', 'next'),
    connector('action-next', 'action', 'right', 'next', 'left', 'next'),
    connector('next-end', 'next', 'right', 'end', 'left', 'done')
  ]
}

const decisionBranchTemplateSpec: DiagramTemplateSpec = {
  width: 878,
  height: 360,
  shapes: [
    shape('input', 'rectangle', 0, 144, 148, 72, 'Input'),
    shape('decision', 'diamond', 220, 126, 148, 108, 'Decision?'),
    shape('yes', 'rectangle', 470, 20, 168, 72, 'Yes path'),
    shape('no', 'rectangle', 470, 268, 168, 72, 'No path'),
    shape('merge', 'rectangle', 730, 144, 148, 72, 'Merge')
  ],
  connectors: [
    connector('input-decision', 'input', 'right', 'decision', 'left', 'check'),
    connector('decision-yes', 'decision', 'top', 'yes', 'left', 'yes', 'elbow'),
    connector('decision-no', 'decision', 'bottom', 'no', 'left', 'no', 'elbow'),
    connector('yes-merge', 'yes', 'right', 'merge', 'top', 'continue', 'elbow'),
    connector('no-merge', 'no', 'right', 'merge', 'bottom', 'continue', 'elbow')
  ]
}

const approvalLoopTemplateSpec: DiagramTemplateSpec = {
  width: 900,
  height: 300,
  shapes: [
    shape('submit', 'rectangle', 0, 116, 148, 72, 'Submit'),
    shape('review', 'rectangle', 240, 116, 148, 72, 'Review'),
    shape('approved', 'diamond', 500, 98, 148, 108, 'Approved?'),
    shape('publish', 'rectangle', 752, 116, 148, 72, 'Publish'),
    shape('revise', 'rectangle', 240, 0, 148, 64, 'Revise')
  ],
  connectors: [
    connector('submit-review', 'submit', 'right', 'review', 'left', 'request'),
    connector(
      'review-approved',
      'review',
      'right',
      'approved',
      'left',
      'decision'
    ),
    connector(
      'approved-publish',
      'approved',
      'right',
      'publish',
      'left',
      'yes'
    ),
    connector(
      'approved-revise',
      'approved',
      'top',
      'revise',
      'right',
      'revise',
      'elbow'
    ),
    connector('revise-review', 'revise', 'bottom', 'review', 'top', 'resubmit')
  ]
}

const swimlaneActivityTemplateSpec: DiagramTemplateSpec = {
  width: 940,
  height: 420,
  shapes: [
    shape('lane-a', 'rectangle', 0, 0, 400, 48, 'Actor A', 15, true),
    shape('lane-b', 'rectangle', 540, 0, 400, 48, 'Actor B', 15, true),
    shape('start', 'ellipse', 88, 96, 128, 64, 'Start'),
    shape('prepare', 'rectangle', 68, 232, 160, 72, 'Prepare item'),
    shape('review', 'rectangle', 640, 96, 160, 72, 'Review item'),
    shape('decision', 'diamond', 646, 244, 148, 108, 'Accepted?'),
    shape('finish', 'ellipse', 88, 340, 128, 64, 'Finish')
  ],
  connectors: [
    connector('start-review', 'start', 'right', 'review', 'left', 'handoff'),
    connector(
      'review-decision',
      'review',
      'bottom',
      'decision',
      'top',
      'result'
    ),
    connector(
      'decision-prepare',
      'decision',
      'left',
      'prepare',
      'right',
      'changes',
      'elbow'
    ),
    connector(
      'prepare-review',
      'prepare',
      'right',
      'review',
      'left',
      'resubmit',
      'elbow'
    ),
    connector(
      'decision-finish',
      'decision',
      'left',
      'finish',
      'right',
      'accepted',
      'elbow'
    )
  ]
}

export const diagramTemplateSpecs: Record<
  DiagramTemplateId,
  DiagramTemplateSpec
> = {
  'basic-flow': basicFlowTemplateSpec,
  'decision-branch': decisionBranchTemplateSpec,
  'approval-loop': approvalLoopTemplateSpec,
  'swimlane-activity': swimlaneActivityTemplateSpec
}

function shape(
  key: string,
  kind: ShapeKind,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  textFontSize?: number,
  textIsBold?: boolean
): DiagramTemplateShapeSpec {
  return { key, kind, x, y, width, height, text, textFontSize, textIsBold }
}

function connector(
  key: string,
  from: string,
  fromAnchor: AnchorPosition,
  to: string,
  toAnchor: AnchorPosition,
  text: string,
  kind?: ConnectorKind
): DiagramTemplateConnectorSpec {
  return { key, from, fromAnchor, to, toAnchor, text, kind }
}
