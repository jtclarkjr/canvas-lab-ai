export type TranscriptSegmentLike = {
  id: string
  position: number
  speakerIdentity: string
  speakerName: string | null
  text: string
  startTimeSeconds: number | null
  endTimeSeconds: number | null
}

export type TranscriptUtterance = {
  id: string
  speakerIdentity: string
  speakerName: string | null
  text: string
  startTimeSeconds: number | null
  endTimeSeconds: number | null
  segmentCount: number
}

const MAX_TURN_GAP_SECONDS = 6
const MAX_TURN_DURATION_SECONDS = 60
const MAX_TURN_CHARACTERS = 1600

function appendTranscriptText(current: string, next: string) {
  const text = next.trim()
  if (!text) return current
  if (!current) return text
  return /^[,.;:!?)]/.test(text) ? `${current}${text}` : `${current} ${text}`
}

function canAppendToUtterance(
  utterance: TranscriptUtterance,
  segment: TranscriptSegmentLike
) {
  if (utterance.speakerIdentity !== segment.speakerIdentity) return false
  if (utterance.text.length + segment.text.length + 1 > MAX_TURN_CHARACTERS) {
    return false
  }

  const utteranceStart = utterance.startTimeSeconds
  const segmentEnd = segment.endTimeSeconds ?? segment.startTimeSeconds
  if (
    utteranceStart !== null &&
    segmentEnd !== null &&
    segmentEnd - utteranceStart > MAX_TURN_DURATION_SECONDS
  ) {
    return false
  }

  const previousEnd =
    utterance.endTimeSeconds ?? utterance.startTimeSeconds ?? null
  if (previousEnd === null || segment.startTimeSeconds === null) return true
  return segment.startTimeSeconds - previousEnd <= MAX_TURN_GAP_SECONDS
}

export function groupTranscriptSegments(
  segments: readonly TranscriptSegmentLike[]
): TranscriptUtterance[] {
  const utterances: TranscriptUtterance[] = []

  for (const segment of [...segments].sort(
    (left, right) => left.position - right.position
  )) {
    const text = segment.text.trim()
    if (!text) continue

    const previous = utterances.at(-1)
    if (previous && canAppendToUtterance(previous, segment)) {
      previous.text = appendTranscriptText(previous.text, text)
      previous.endTimeSeconds =
        segment.endTimeSeconds ??
        segment.startTimeSeconds ??
        previous.endTimeSeconds
      previous.segmentCount += 1
      continue
    }

    utterances.push({
      id: segment.id,
      speakerIdentity: segment.speakerIdentity,
      speakerName: segment.speakerName,
      text,
      startTimeSeconds: segment.startTimeSeconds,
      endTimeSeconds: segment.endTimeSeconds ?? segment.startTimeSeconds,
      segmentCount: 1
    })
  }

  return utterances
}

export function transcriptForSummary(
  segments: readonly TranscriptSegmentLike[]
) {
  return groupTranscriptSegments(segments)
    .map((utterance) => {
      const seconds = utterance.startTimeSeconds
      const timestamp = seconds === null ? '' : `[${Math.floor(seconds)}s] `
      const speaker = utterance.speakerName ?? utterance.speakerIdentity
      return `${timestamp}${speaker}: ${utterance.text}`
    })
    .join('\n')
}
