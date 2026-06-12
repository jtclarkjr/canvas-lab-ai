export function downloadMarkdown(filename: string, markdown: string) {
  const safeName = filename.trim().replace(/[\\/:*?"<>|]/g, '-') || 'document'
  const name = safeName.endsWith('.md') ? safeName : `${safeName}.md`
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()

  URL.revokeObjectURL(url)
}
