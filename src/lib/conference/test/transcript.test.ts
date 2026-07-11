import { describe, expect, it } from 'vite-plus/test'
import {
  groupTranscriptSegments,
  transcriptForSummary,
  type TranscriptSegmentLike
} from '../transcript'

function segment(
  position: number,
  speakerIdentity: string,
  text: string,
  startTimeSeconds: number | null
): TranscriptSegmentLike {
  return {
    id: `segment-${position}`,
    position,
    speakerIdentity,
    speakerName: speakerIdentity === 'james' ? 'James' : 'Taylor',
    text,
    startTimeSeconds,
    endTimeSeconds: startTimeSeconds === null ? null : startTimeSeconds + 1
  }
}

describe('groupTranscriptSegments', () => {
  it('combines adjacent fragments from the same speaker into one turn', () => {
    const utterances = groupTranscriptSegments([
      segment(0, 'james', 'Hello.', 1),
      segment(1, 'james', 'So', 3),
      segment(2, 'james', 'today,', 5),
      segment(3, 'james', 'we are testing summaries.', 7)
    ])

    expect(utterances).toEqual([
      expect.objectContaining({
        speakerName: 'James',
        text: 'Hello. So today, we are testing summaries.',
        startTimeSeconds: 1,
        endTimeSeconds: 8,
        segmentCount: 4
      })
    ])
  })

  it('starts a new turn for a speaker change or a long pause', () => {
    const utterances = groupTranscriptSegments([
      segment(0, 'james', 'First point.', 1),
      segment(1, 'taylor', 'A response.', 3),
      segment(2, 'taylor', 'A later topic.', 15)
    ])

    expect(utterances.map((utterance) => utterance.text)).toEqual([
      'First point.',
      'A response.',
      'A later topic.'
    ])
  })

  it('formats grouped speaker turns for summary generation', () => {
    expect(
      transcriptForSummary([
        segment(0, 'james', 'First fragment.', 1),
        segment(1, 'james', 'Second fragment.', 2)
      ])
    ).toBe('[1s] James: First fragment. Second fragment.')
  })
})
