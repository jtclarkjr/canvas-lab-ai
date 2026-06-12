type ExportAnnotatedNotesPdfInput = {
  annotationsSvg: SVGSVGElement
  contentEl: HTMLElement
  title: string
}

// PDF of the annotated document: html2canvas paints the rendered markdown
// natively (no SVG foreignObject — Safari taints canvases for those, which
// breaks toDataURL), then the annotation SVG is layered on top. Both libs
// are dynamically imported so they stay out of the main bundle.
export async function exportAnnotatedNotesPdf({
  annotationsSvg,
  contentEl,
  title
}: ExportAnnotatedNotesPdfInput) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas')
  ])

  const width = contentEl.clientWidth
  const height = contentEl.offsetHeight

  // Cap the raster so very long documents don't exceed canvas limits.
  const scale = height * 2 > 16384 ? 1 : 2

  // The annotation layer (and any open text editor) is excluded here and
  // composited manually below — html2canvas's SVG handling is unreliable.
  const canvas = await html2canvas(contentEl, {
    backgroundColor: '#ffffff',
    scale,
    logging: false,
    onclone: (_documentClone, referenceElement) => {
      referenceElement.classList.add('notes-export-light')
    },
    ignoreElements: (element) =>
      element === annotationsSvg || element.tagName === 'TEXTAREA'
  })

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is unavailable for PDF rendering.')
  }

  // Annotation layer: a plain SVG (paths + text) rasterizes without
  // tainting the canvas.
  const clone = annotationsSvg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`)

  const blobUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], {
      type: 'image/svg+xml;charset=utf-8'
    })
  )

  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () =>
        reject(new Error('Failed to render annotations for PDF.'))
      image.src = blobUrl
    })
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
  } finally {
    URL.revokeObjectURL(blobUrl)
  }

  const dataUrl = canvas.toDataURL('image/png')
  const doc = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [width, height]
  })
  doc.addImage(dataUrl, 'PNG', 0, 0, width, height)

  const safeName = (title || 'notes').replace(/[\\/:*?"<>|]/g, '-')
  doc.save(`${safeName}.pdf`)
}
