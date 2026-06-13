export type DocumentSaveSnapshot = {
  title: string
  markdown: string
}

export function sameDocumentSaveSnapshot(
  first: DocumentSaveSnapshot | null,
  second: DocumentSaveSnapshot | null
) {
  return (
    first !== null &&
    second !== null &&
    first.title === second.title &&
    first.markdown === second.markdown
  )
}

export function shouldAttemptAutosave({
  current,
  baseline,
  pending,
  lastAttempt
}: {
  current: DocumentSaveSnapshot
  baseline: DocumentSaveSnapshot
  pending: DocumentSaveSnapshot | null
  lastAttempt: DocumentSaveSnapshot | null
}) {
  if (sameDocumentSaveSnapshot(current, baseline)) {
    return false
  }

  if (sameDocumentSaveSnapshot(current, pending)) {
    return false
  }

  if (sameDocumentSaveSnapshot(current, lastAttempt)) {
    return false
  }

  return true
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  const snapshot = (title: string, markdown: string): DocumentSaveSnapshot => ({
    title,
    markdown
  })

  describe('document autosave snapshots', () => {
    it('does not save content that already matches the baseline', () => {
      const current = snapshot('Title', 'Body')

      expect(
        shouldAttemptAutosave({
          current,
          baseline: snapshot('Title', 'Body'),
          pending: null,
          lastAttempt: null
        })
      ).toBe(false)
    })

    it('does not resave an in-flight payload', () => {
      const current = snapshot('Title', 'Changed')

      expect(
        shouldAttemptAutosave({
          current,
          baseline: snapshot('Title', 'Body'),
          pending: snapshot('Title', 'Changed'),
          lastAttempt: null
        })
      ).toBe(false)
    })

    it('does not repeatedly autosave the same failed payload', () => {
      const current = snapshot('Title', 'Changed')

      expect(
        shouldAttemptAutosave({
          current,
          baseline: snapshot('Title', 'Body'),
          pending: null,
          lastAttempt: snapshot('Title', 'Changed')
        })
      ).toBe(false)
    })

    it('allows autosave after the user changes the failed payload', () => {
      expect(
        shouldAttemptAutosave({
          current: snapshot('Title', 'Changed again'),
          baseline: snapshot('Title', 'Body'),
          pending: null,
          lastAttempt: snapshot('Title', 'Changed')
        })
      ).toBe(true)
    })
  })
}
