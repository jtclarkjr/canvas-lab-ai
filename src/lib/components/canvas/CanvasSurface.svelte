<script lang="ts">
  import type {
    Camera,
    DiagramConnector,
    DiagramShape,
    DrawFormatting,
    EditingText,
    Path,
    Point,
    TextElement,
    Tool
  } from '$lib/canvas/types'
  import {
    getTextContentWidth,
    getTextCenter,
    getTextLines,
    getTextLineBaseline,
    getTextLineHeight,
    getTextOutlinePoints,
    getTextResizeHandles,
    getTextRotateAnchor,
    getTextRotateHandle,
    getPathOutlinePoints,
    getPathResizeHandles,
    getPathRotateAnchor,
    getPathRotateHandle,
    pathToSvgPath,
    selectionRectFromPoints
  } from '$lib/canvas/drawing-utils'
  import {
    connectorToSvgPath,
    getArrowheadPoints,
    getAnchorTargetAnchors,
    getAnchorTargetOutlinePoints,
    getAnchorTargetResizeHandles,
    getAnchorTargetRotateHandle,
    getConnectorLabelPoint,
    getConnectorTerminalSegments,
    getDiamondPoints,
    getShapeAnchors,
    getShapeCenter,
    getShapeOutlinePoints,
    getShapeResizeHandles,
    getShapeRotateHandle,
    getStrokeDashArray,
    pointsToSvg,
    resolveEndpoint
  } from '$lib/canvas/diagram-utils'
  import {
    resolveCanvasDisplayColor,
    resolveTextColorOnFill
  } from '$lib/canvas/helpers/display-color'
  import type { Scene } from '$lib/scenes/schema'

  type CanvasSurfaceElements = {
    paths: Path[]
    currentPath: Point[]
    textElements: TextElement[]
    shapes?: DiagramShape[]
    connectors?: DiagramConnector[]
    scenes?: Scene[]
    draftShape?: DiagramShape | null
    draftConnector?: DiagramConnector | null
  }

  type CanvasSurfaceSelection = {
    selectedIds: Set<string>
    start: Point | null
    end: Point | null
  }

  type CanvasSurfaceHandlers = {
    pointerDown: (event: PointerEvent) => void
    pointerMove: (event: PointerEvent) => void
    pointerUp: (event: PointerEvent) => void
    doubleClick: (event: MouseEvent) => void
  }

  let {
    svgEl = $bindable(null),
    camera,
    canEdit,
    selectedTool,
    drawFormatting,
    editingText,
    elements,
    selection,
    handlers
  } = $props<{
    svgEl?: SVGSVGElement | null
    camera: Camera
    canEdit: boolean
    selectedTool: Tool
    drawFormatting: DrawFormatting
    editingText: EditingText | null
    elements: CanvasSurfaceElements
    selection: CanvasSurfaceSelection
    handlers: CanvasSurfaceHandlers
  }>()

  const pointerEvents = $derived(
    canEdit &&
      ['select', 'pencil', 'eraser', 'text', 'shape', 'connector'].includes(
        selectedTool
      )
      ? 'auto'
      : 'none'
  )

  const shapes = $derived.by((): DiagramShape[] => elements.shapes ?? [])
  const connectors = $derived.by(
    (): DiagramConnector[] => elements.connectors ?? []
  )
  const scenes = $derived.by((): Scene[] => elements.scenes ?? [])
  const selectedShapes = $derived(
    shapes.filter((shape: DiagramShape) => selection.selectedIds.has(shape.id))
  )
  const selectedConnectors = $derived(
    connectors.filter((connector: DiagramConnector) =>
      selection.selectedIds.has(connector.id)
    )
  )
  const selectedScenes = $derived(
    scenes.filter((scene: Scene) => selection.selectedIds.has(scene.id))
  )
  const sortedPaths = $derived([...elements.paths].sort(compareZ))
  const sortedTextElements = $derived([...elements.textElements].sort(compareZ))
  const sortedShapes = $derived([...shapes].sort(compareZ))
  const sortedConnectors = $derived([...connectors].sort(compareZ))
  const selectedTexts = $derived(
    sortedTextElements.filter(
      (text: TextElement) =>
        selection.selectedIds.has(text.id) && !isEditingStandaloneText(text)
    )
  )
  const selectedPaths = $derived(
    sortedPaths.filter((path: Path) => selection.selectedIds.has(path.id))
  )
  const handleSize = $derived(8 / camera.scale)
  const anchorSize = $derived(5 / camera.scale)

  function compareZ(
    first: { z?: number | null },
    second: { z?: number | null }
  ) {
    return (first.z ?? 0) - (second.z ?? 0)
  }

  function shapeTransform(shape: DiagramShape) {
    const center = getShapeCenter(shape)
    return `rotate(${shape.rotation} ${center.x} ${center.y})`
  }

  function textTransform(text: TextElement) {
    const center = getTextCenter(text)
    return `rotate(${text.rotation ?? 0} ${center.x} ${center.y})`
  }

  function arrowPoints(
    segment: [Point, Point] | null,
    strokeWidth: number
  ): string {
    if (!segment) return ''
    return pointsToSvg(
      getArrowheadPoints(segment[0], segment[1], Math.max(10, strokeWidth * 5))
    )
  }

  function shapeTextFontSize(shape: DiagramShape) {
    return shape.textFontSize ?? 16
  }

  function connectorTextFontSize(connector: DiagramConnector) {
    return connector.textFontSize ?? 16
  }

  function shapeTextBaseline(shape: DiagramShape, lineIndex: number) {
    const fontSize = shapeTextFontSize(shape)
    const lineHeight = getTextLineHeight(fontSize)
    const lineCount = getTextLines(shape.text ?? '').length
    const textHeight = (lineCount - 1) * lineHeight + fontSize
    return (
      shape.y +
      shape.height / 2 -
      textHeight / 2 +
      fontSize +
      lineIndex * lineHeight
    )
  }

  function connectorTextFrame(connector: DiagramConnector) {
    const fontSize = connectorTextFontSize(connector)
    const lines = getTextLines(connector.text ?? '')
    const lineHeight = getTextLineHeight(fontSize)
    const width = getTextContentWidth(lines, fontSize) + 12
    const height = (lines.length - 1) * lineHeight + fontSize + 8
    const point = getConnectorLabelPoint(connector, shapes, scenes)
    return {
      x: point.x - width / 2,
      y: point.y - height / 2,
      width,
      height,
      textX: point.x,
      firstBaseline: point.y - (height - 8) / 2 + fontSize,
      lineHeight
    }
  }

  function isEditingShapeText(shape: DiagramShape) {
    return editingText?.target === 'shape' && editingText.id === shape.id
  }

  function isEditingConnectorText(connector: DiagramConnector) {
    return (
      editingText?.target === 'connector' && editingText.id === connector.id
    )
  }

  function isEditingStandaloneText(text: TextElement) {
    return editingText?.target === 'text' && editingText.id === text.id
  }
</script>

<svg
  bind:this={svgEl}
  aria-label="Drawing canvas"
  class="absolute inset-0 h-full w-full select-none"
  role="img"
  onpointerdown={handlers.pointerDown}
  onpointermove={handlers.pointerMove}
  onpointerup={handlers.pointerUp}
  onpointercancel={handlers.pointerUp}
  onpointerleave={handlers.pointerUp}
  ondblclick={handlers.doubleClick}
  style={`pointer-events:${pointerEvents};user-select:none;-webkit-user-select:none;touch-action:none`}
>
  <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.scale})`}>
    {#each sortedConnectors as connector (connector.id)}
      {@const labelFrame =
        connector.text && !isEditingConnectorText(connector)
          ? connectorTextFrame(connector)
          : null}
      <path
        d={connectorToSvgPath(connector, shapes, scenes)}
        fill="none"
        stroke={resolveCanvasDisplayColor(connector.strokeColor)}
        stroke-dasharray={getStrokeDashArray(
          connector.strokeStyle,
          connector.strokeWidth
        )}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-opacity={connector.opacity}
        stroke-width={connector.strokeWidth}
      />
      {#if labelFrame}
        <g style="pointer-events:none">
          <rect
            fill="var(--canvas-surface)"
            height={labelFrame.height}
            opacity="0.96"
            rx={2 / camera.scale}
            width={labelFrame.width}
            x={labelFrame.x}
            y={labelFrame.y}
          />
          <text
            class="select-none"
            fill={resolveCanvasDisplayColor(connector.textColor ?? '#000000')}
            font-size={connectorTextFontSize(connector)}
            font-style={connector.textIsItalic ? 'italic' : 'normal'}
            font-weight={connector.textIsBold ? 'bold' : 'normal'}
            style="white-space:pre;font-family:inherit"
            text-anchor="middle"
            text-decoration={connector.textIsUnderline ? 'underline' : 'none'}
          >
            {#each getTextLines(connector.text ?? '') as line, lineIndex (lineIndex)}
              <tspan
                x={labelFrame.textX}
                y={labelFrame.firstBaseline + lineIndex * labelFrame.lineHeight}
              >
                {line}
              </tspan>
            {/each}
          </text>
        </g>
      {/if}
    {/each}

    {#if elements.draftConnector}
      {@const draftConnector = elements.draftConnector}
      {@const terminalSegments = getConnectorTerminalSegments(
        draftConnector,
        shapes,
        scenes
      )}
      <path
        d={connectorToSvgPath(draftConnector, shapes, scenes)}
        fill="none"
        stroke={resolveCanvasDisplayColor(draftConnector.strokeColor)}
        stroke-dasharray={getStrokeDashArray(
          draftConnector.strokeStyle,
          draftConnector.strokeWidth
        )}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-opacity={draftConnector.opacity * 0.75}
        stroke-width={draftConnector.strokeWidth}
      />
      {#if draftConnector.startArrow === 'arrow'}
        <polygon
          fill={resolveCanvasDisplayColor(draftConnector.strokeColor)}
          opacity={draftConnector.opacity * 0.75}
          points={arrowPoints(
            terminalSegments.start,
            draftConnector.strokeWidth
          )}
        />
      {/if}
      {#if draftConnector.endArrow === 'arrow'}
        <polygon
          fill={resolveCanvasDisplayColor(draftConnector.strokeColor)}
          opacity={draftConnector.opacity * 0.75}
          points={arrowPoints(terminalSegments.end, draftConnector.strokeWidth)}
        />
      {/if}
    {/if}

    {#each sortedShapes as shape (shape.id)}
      {#if shape.kind === 'ellipse'}
        <ellipse
          cx={shape.x + shape.width / 2}
          cy={shape.y + shape.height / 2}
          fill={resolveCanvasDisplayColor(shape.fillColor)}
          opacity={shape.opacity}
          rx={shape.width / 2}
          ry={shape.height / 2}
          stroke={resolveCanvasDisplayColor(shape.strokeColor)}
          stroke-dasharray={getStrokeDashArray(
            shape.strokeStyle,
            shape.strokeWidth
          )}
          stroke-linejoin="round"
          stroke-width={shape.strokeWidth}
          transform={shapeTransform(shape)}
        />
      {/if}
      {#if shape.kind === 'diamond'}
        <polygon
          fill={resolveCanvasDisplayColor(shape.fillColor)}
          opacity={shape.opacity}
          points={pointsToSvg(getDiamondPoints(shape))}
          stroke={resolveCanvasDisplayColor(shape.strokeColor)}
          stroke-dasharray={getStrokeDashArray(
            shape.strokeStyle,
            shape.strokeWidth
          )}
          stroke-linejoin="round"
          stroke-width={shape.strokeWidth}
        />
      {/if}
      {#if shape.kind === 'rectangle'}
        <rect
          fill={resolveCanvasDisplayColor(shape.fillColor)}
          height={shape.height}
          opacity={shape.opacity}
          rx={8 / camera.scale}
          stroke={resolveCanvasDisplayColor(shape.strokeColor)}
          stroke-dasharray={getStrokeDashArray(
            shape.strokeStyle,
            shape.strokeWidth
          )}
          stroke-linejoin="round"
          stroke-width={shape.strokeWidth}
          transform={shapeTransform(shape)}
          width={shape.width}
          x={shape.x}
          y={shape.y}
        />
      {/if}
      {#if shape.text && !isEditingShapeText(shape)}
        <text
          class="select-none"
          fill={resolveTextColorOnFill(
            shape.textColor ?? '#000000',
            shape.fillColor
          )}
          font-size={shapeTextFontSize(shape)}
          font-style={shape.textIsItalic ? 'italic' : 'normal'}
          font-weight={shape.textIsBold ? 'bold' : 'normal'}
          style="pointer-events:none;white-space:pre;font-family:inherit"
          text-anchor="middle"
          text-decoration={shape.textIsUnderline ? 'underline' : 'none'}
          transform={shapeTransform(shape)}
          x={shape.x + shape.width / 2}
        >
          {#each getTextLines(shape.text) as line, lineIndex (lineIndex)}
            <tspan
              x={shape.x + shape.width / 2}
              y={shapeTextBaseline(shape, lineIndex)}
            >
              {line}
            </tspan>
          {/each}
        </text>
      {/if}
    {/each}

    {#if elements.draftShape}
      {@const shape = elements.draftShape}
      {#if shape.kind === 'ellipse'}
        <ellipse
          cx={shape.x + shape.width / 2}
          cy={shape.y + shape.height / 2}
          fill={resolveCanvasDisplayColor(shape.fillColor)}
          fill-opacity={shape.opacity * 0.55}
          rx={shape.width / 2}
          ry={shape.height / 2}
          stroke={resolveCanvasDisplayColor(shape.strokeColor)}
          stroke-dasharray={getStrokeDashArray(
            shape.strokeStyle,
            shape.strokeWidth
          )}
          stroke-width={shape.strokeWidth}
        />
      {/if}
      {#if shape.kind === 'diamond'}
        <polygon
          fill={resolveCanvasDisplayColor(shape.fillColor)}
          fill-opacity={shape.opacity * 0.55}
          points={pointsToSvg(getDiamondPoints(shape))}
          stroke={resolveCanvasDisplayColor(shape.strokeColor)}
          stroke-dasharray={getStrokeDashArray(
            shape.strokeStyle,
            shape.strokeWidth
          )}
          stroke-width={shape.strokeWidth}
        />
      {/if}
      {#if shape.kind === 'rectangle'}
        <rect
          fill={resolveCanvasDisplayColor(shape.fillColor)}
          fill-opacity={shape.opacity * 0.55}
          height={shape.height}
          rx={8 / camera.scale}
          stroke={resolveCanvasDisplayColor(shape.strokeColor)}
          stroke-dasharray={getStrokeDashArray(
            shape.strokeStyle,
            shape.strokeWidth
          )}
          stroke-width={shape.strokeWidth}
          width={shape.width}
          x={shape.x}
          y={shape.y}
        />
      {/if}
    {/if}

    {#each sortedConnectors as connector (connector.id)}
      {@const terminalSegments = getConnectorTerminalSegments(
        connector,
        shapes,
        scenes
      )}
      {#if connector.startArrow === 'arrow'}
        <polygon
          fill={resolveCanvasDisplayColor(connector.strokeColor)}
          opacity={connector.opacity}
          points={arrowPoints(terminalSegments.start, connector.strokeWidth)}
        />
      {/if}
      {#if connector.endArrow === 'arrow'}
        <polygon
          fill={resolveCanvasDisplayColor(connector.strokeColor)}
          opacity={connector.opacity}
          points={arrowPoints(terminalSegments.end, connector.strokeWidth)}
        />
      {/if}
    {/each}

    {#each sortedPaths as path (path.id)}
      <path
        d={pathToSvgPath(path.points)}
        fill="none"
        filter={selection.selectedIds.has(path.id)
          ? 'drop-shadow(0 0 4px var(--canvas-selection-shadow))'
          : undefined}
        stroke={resolveCanvasDisplayColor(path.color)}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-opacity={path.opacity}
        stroke-width={path.width}
      />
    {/each}

    {#each selectedPaths as path (path.id)}
      {@const outline = getPathOutlinePoints(path)}
      {@const rotateAnchor = getPathRotateAnchor(path)}
      {@const rotateHandle = getPathRotateHandle(path)}
      <polygon
        fill="var(--canvas-selection-fill)"
        points={pointsToSvg(outline)}
        stroke="var(--canvas-selection-stroke)"
        stroke-dasharray={`${4 / camera.scale} ${2 / camera.scale}`}
        stroke-width={1 / camera.scale}
      />
      <line
        stroke="var(--canvas-selection-stroke)"
        stroke-width={1 / camera.scale}
        x1={rotateAnchor.x}
        y1={rotateAnchor.y}
        x2={rotateHandle.x}
        y2={rotateHandle.y}
      />
      {#each getPathResizeHandles(path) as handle (handle.handle)}
        <rect
          fill="var(--background)"
          height={handleSize}
          rx={1.5 / camera.scale}
          stroke="var(--canvas-selection-stroke)"
          stroke-width={1 / camera.scale}
          width={handleSize}
          x={handle.point.x - handleSize / 2}
          y={handle.point.y - handleSize / 2}
        />
      {/each}
      <circle
        cx={rotateHandle.x}
        cy={rotateHandle.y}
        fill="var(--background)"
        r={handleSize / 2}
        stroke="var(--canvas-selection-stroke)"
        stroke-width={1 / camera.scale}
      />
    {/each}

    {#if elements.currentPath.length > 0}
      <path
        d={pathToSvgPath(elements.currentPath)}
        fill="none"
        stroke={resolveCanvasDisplayColor(drawFormatting.color)}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-opacity={drawFormatting.isHighlighter
          ? drawFormatting.highlighterOpacity
          : 1}
        stroke-width={drawFormatting.width}
      />
    {/if}

    {#each sortedTextElements as text (text.id)}
      {#if !isEditingStandaloneText(text)}
        <g transform={textTransform(text)}>
          <text
            class="select-none"
            fill={resolveCanvasDisplayColor(text.color)}
            font-size={text.fontSize}
            font-style={text.isItalic ? 'italic' : 'normal'}
            font-weight={text.isBold ? 'bold' : 'normal'}
            style="pointer-events:none;white-space:pre;font-family:inherit"
            text-decoration={text.isUnderline ? 'underline' : 'none'}
            x={text.x}
            y={text.y}
          >
            {#each getTextLines(text.text) as line, lineIndex (lineIndex)}
              <tspan x={text.x} y={getTextLineBaseline(text, lineIndex)}>
                {line}
              </tspan>
            {/each}
          </text>
        </g>
      {/if}
    {/each}

    {#each selectedTexts as text (text.id)}
      {@const outline = getTextOutlinePoints(text)}
      {@const rotateAnchor = getTextRotateAnchor(text)}
      {@const rotateHandle = getTextRotateHandle(text)}
      <polygon
        fill="var(--canvas-selection-fill)"
        points={pointsToSvg(outline)}
        stroke="var(--canvas-selection-stroke)"
        stroke-dasharray={`${4 / camera.scale} ${2 / camera.scale}`}
        stroke-width={1 / camera.scale}
      />
      <line
        stroke="var(--canvas-selection-stroke)"
        stroke-width={1 / camera.scale}
        x1={rotateAnchor.x}
        y1={rotateAnchor.y}
        x2={rotateHandle.x}
        y2={rotateHandle.y}
      />
      {#each getTextResizeHandles(text) as handle (handle.handle)}
        <rect
          fill="var(--background)"
          height={handleSize}
          rx={1.5 / camera.scale}
          stroke="var(--canvas-selection-stroke)"
          stroke-width={1 / camera.scale}
          width={handleSize}
          x={handle.point.x - handleSize / 2}
          y={handle.point.y - handleSize / 2}
        />
      {/each}
      <circle
        cx={rotateHandle.x}
        cy={rotateHandle.y}
        fill="var(--background)"
        r={handleSize / 2}
        stroke="var(--canvas-selection-stroke)"
        stroke-width={1 / camera.scale}
      />
    {/each}

    {#each selectedShapes as shape (shape.id)}
      {@const outline = getShapeOutlinePoints(shape)}
      {@const topAnchor = getShapeAnchors(shape).find(
        (entry) => entry.anchor === 'top'
      )}
      {@const rotateHandle = getShapeRotateHandle(shape)}
      <polygon
        fill="var(--canvas-selection-fill)"
        points={pointsToSvg(outline)}
        stroke="var(--canvas-selection-stroke)"
        stroke-dasharray={`${4 / camera.scale} ${2 / camera.scale}`}
        stroke-width={1 / camera.scale}
      />
      {#if topAnchor}
        <line
          stroke="var(--canvas-selection-stroke)"
          stroke-width={1 / camera.scale}
          x1={topAnchor.point.x}
          y1={topAnchor.point.y}
          x2={rotateHandle.x}
          y2={rotateHandle.y}
        />
      {/if}
      {#each getShapeResizeHandles(shape) as handle (handle.handle)}
        <rect
          fill="var(--background)"
          height={handleSize}
          rx={1.5 / camera.scale}
          stroke="var(--canvas-selection-stroke)"
          stroke-width={1 / camera.scale}
          width={handleSize}
          x={handle.point.x - handleSize / 2}
          y={handle.point.y - handleSize / 2}
        />
      {/each}
      <circle
        cx={rotateHandle.x}
        cy={rotateHandle.y}
        fill="var(--background)"
        r={handleSize / 2}
        stroke="var(--canvas-selection-stroke)"
        stroke-width={1 / camera.scale}
      />
      {#each getShapeAnchors(shape) as anchor (anchor.anchor)}
        <circle
          cx={anchor.point.x}
          cy={anchor.point.y}
          fill="var(--background)"
          r={anchorSize}
          stroke="var(--canvas-selection-stroke)"
          stroke-width={1 / camera.scale}
        />
      {/each}
    {/each}

    {#each selectedScenes as scene (scene.id)}
      {@const outline = getAnchorTargetOutlinePoints(scene)}
      {@const topAnchor = getAnchorTargetAnchors(scene).find(
        (entry) => entry.anchor === 'top'
      )}
      {@const rotateHandle = getAnchorTargetRotateHandle(scene)}
      <polygon
        fill="var(--canvas-selection-fill)"
        points={pointsToSvg(outline)}
        stroke="var(--canvas-selection-stroke)"
        stroke-dasharray={`${4 / camera.scale} ${2 / camera.scale}`}
        stroke-width={1 / camera.scale}
      />
      {#if topAnchor}
        <line
          stroke="var(--canvas-selection-stroke)"
          stroke-width={1 / camera.scale}
          x1={topAnchor.point.x}
          y1={topAnchor.point.y}
          x2={rotateHandle.x}
          y2={rotateHandle.y}
        />
      {/if}
      {#each getAnchorTargetResizeHandles(scene) as handle (handle.handle)}
        <rect
          fill="var(--background)"
          height={handleSize}
          rx={1.5 / camera.scale}
          stroke="var(--canvas-selection-stroke)"
          stroke-width={1 / camera.scale}
          width={handleSize}
          x={handle.point.x - handleSize / 2}
          y={handle.point.y - handleSize / 2}
        />
      {/each}
      <circle
        cx={rotateHandle.x}
        cy={rotateHandle.y}
        fill="var(--background)"
        r={handleSize / 2}
        stroke="var(--canvas-selection-stroke)"
        stroke-width={1 / camera.scale}
      />
      {#each getAnchorTargetAnchors(scene) as anchor (anchor.anchor)}
        <circle
          cx={anchor.point.x}
          cy={anchor.point.y}
          fill="var(--background)"
          r={anchorSize}
          stroke="var(--canvas-selection-stroke)"
          stroke-width={1 / camera.scale}
        />
      {/each}
    {/each}

    {#each selectedConnectors as connector (connector.id)}
      {@const start = resolveEndpoint(connector.start, shapes, scenes)}
      {@const end = resolveEndpoint(connector.end, shapes, scenes)}
      <circle
        cx={start.x}
        cy={start.y}
        fill="var(--background)"
        r={handleSize / 2}
        stroke="var(--canvas-selection-stroke)"
        stroke-width={1 / camera.scale}
      />
      <circle
        cx={end.x}
        cy={end.y}
        fill="var(--background)"
        r={handleSize / 2}
        stroke="var(--canvas-selection-stroke)"
        stroke-width={1 / camera.scale}
      />
    {/each}

    {#if selection.start && selection.end}
      {@const rect = selectionRectFromPoints(selection.start, selection.end)}
      <rect
        fill="var(--canvas-selection-fill)"
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        pointer-events="none"
        stroke="var(--canvas-selection-stroke)"
        stroke-dasharray={`${4 / camera.scale} ${2 / camera.scale}`}
        stroke-width={1 / camera.scale}
      />
    {/if}
  </g>
</svg>
