import DOMPurify from 'dompurify'

export type MentionSegment = { text: string; hi: boolean }

// DOMPurify strips all HTML and script injection; ALLOWED_TAGS:[] returns
// plain text only. Unicode normalization and length cap follow.
function sanitizeName(raw: string): string {
  const stripped = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
  return stripped.replace(/\s+/g, ' ').trim().slice(0, 100)
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function mentionPattern(name: string): RegExp | null {
  const clean = sanitizeName(name)
  if (!clean) return null

  const full = escapeRegex(clean)
  const words = clean
    .split(' ')
    .filter((w) => w.length > 1)
    .map(escapeRegex)

  const alts = [...new Set([full, ...words])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

  if (alts.length === 0) return null

  return new RegExp(`@(${alts.join('|')})(?=[\\s,!?.;:]|$)`, 'gi')
}

export function segmentMentions(
  content: string,
  name: string | null
): MentionSegment[] {
  const pat = name ? mentionPattern(name) : null
  if (!pat) return [{ text: content, hi: false }]
  const out: MentionSegment[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = pat.exec(content)) !== null) {
    if (m.index > last)
      out.push({ text: content.slice(last, m.index), hi: false })
    out.push({ text: m[0], hi: true })
    last = pat.lastIndex
  }
  if (last < content.length) out.push({ text: content.slice(last), hi: false })
  return out.length ? out : [{ text: content, hi: false }]
}
