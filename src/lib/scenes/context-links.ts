import { normalizeAnchorBinding } from '$lib/canvas/diagram-utils'
import type {
  Arrowhead,
  DiagramConnector,
  DiagramEndpoint
} from '$lib/canvas/types'

type SceneConnector = Pick<
  DiagramConnector,
  'start' | 'end' | 'startArrow' | 'endArrow'
>

type SceneRelation = {
  first: string
  second: string
  bidirectional: boolean
  directions: Set<string>
}

function sceneIdFromEndpoint(endpoint: DiagramEndpoint) {
  const binding = normalizeAnchorBinding(endpoint.binding)
  return binding?.targetType === 'scene' ? binding.targetId : null
}

function directionKey(fromSceneId: string, toSceneId: string) {
  return `${fromSceneId}->${toSceneId}`
}

function pairKey(firstSceneId: string, secondSceneId: string) {
  return [firstSceneId, secondSceneId].sort().join('::')
}

function isBidirectional(startArrow: Arrowhead, endArrow: Arrowhead) {
  return startArrow === endArrow
}

export function getLinkedContextSceneIds(
  targetSceneId: string,
  connectors: SceneConnector[]
): string[] {
  const relations = new Map<string, SceneRelation>()

  for (const connector of connectors) {
    const startSceneId = sceneIdFromEndpoint(connector.start)
    const endSceneId = sceneIdFromEndpoint(connector.end)
    if (!startSceneId || !endSceneId || startSceneId === endSceneId) continue

    const key = pairKey(startSceneId, endSceneId)
    const relation =
      relations.get(key) ??
      ({
        first: startSceneId,
        second: endSceneId,
        bidirectional: false,
        directions: new Set<string>()
      } satisfies SceneRelation)

    if (isBidirectional(connector.startArrow, connector.endArrow)) {
      relation.bidirectional = true
    } else if (connector.endArrow === 'arrow') {
      relation.directions.add(directionKey(startSceneId, endSceneId))
    } else {
      relation.directions.add(directionKey(endSceneId, startSceneId))
    }

    relations.set(key, relation)
  }

  const linked = new Set<string>()
  for (const relation of relations.values()) {
    if (relation.first !== targetSceneId && relation.second !== targetSceneId) {
      continue
    }

    const other =
      relation.first === targetSceneId ? relation.second : relation.first
    if (
      relation.bidirectional ||
      relation.directions.has(directionKey(other, targetSceneId))
    ) {
      linked.add(other)
    }
  }

  return [...linked]
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  const endpoint = (sceneId: string): DiagramEndpoint => ({
    x: 0,
    y: 0,
    binding: {
      targetType: 'scene',
      targetId: sceneId,
      anchor: 'right'
    }
  })

  const connector = (
    startSceneId: string,
    endSceneId: string,
    startArrow: Arrowhead,
    endArrow: Arrowhead
  ): SceneConnector => ({
    start: endpoint(startSceneId),
    end: endpoint(endSceneId),
    startArrow,
    endArrow
  })

  describe('getLinkedContextSceneIds', () => {
    it('treats lines without arrows as bidirectional', () => {
      const connectors = [connector('a', 'b', 'none', 'none')]
      expect(getLinkedContextSceneIds('a', connectors)).toEqual(['b'])
      expect(getLinkedContextSceneIds('b', connectors)).toEqual(['a'])
    })

    it('uses one arrow as tail-to-head context flow', () => {
      const connectors = [connector('a', 'b', 'none', 'arrow')]
      expect(getLinkedContextSceneIds('a', connectors)).toEqual([])
      expect(getLinkedContextSceneIds('b', connectors)).toEqual(['a'])
    })

    it('treats both arrows as bidirectional', () => {
      const connectors = [connector('a', 'b', 'arrow', 'arrow')]
      expect(getLinkedContextSceneIds('a', connectors)).toEqual(['b'])
      expect(getLinkedContextSceneIds('b', connectors)).toEqual(['a'])
    })

    it('lets bidirectional connectors win over one-way duplicates', () => {
      const connectors = [
        connector('a', 'b', 'arrow', 'none'),
        connector('a', 'b', 'none', 'none')
      ]
      expect(getLinkedContextSceneIds('a', connectors)).toEqual(['b'])
      expect(getLinkedContextSceneIds('b', connectors)).toEqual(['a'])
    })
  })
}
