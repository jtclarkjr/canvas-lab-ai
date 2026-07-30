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
