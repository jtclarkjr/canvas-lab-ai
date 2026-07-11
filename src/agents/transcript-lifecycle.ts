export class PendingTaskSet {
  readonly #tasks = new Set<Promise<unknown>>()

  track<T>(task: Promise<T>): Promise<T> {
    const tracked = task.finally(() => this.#tasks.delete(tracked))
    this.#tasks.add(tracked)
    return tracked
  }

  async drain() {
    while (this.#tasks.size > 0) {
      await Promise.allSettled(this.#tasks)
    }
  }

  get size() {
    return this.#tasks.size
  }
}

export function createSerializedFinalizer(
  callback: () => Promise<void>
): () => Promise<void> {
  let finalization: Promise<void> | null = null
  return () => {
    finalization ??= callback()
    return finalization
  }
}

export async function withTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  errorFactory: () => Error
) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(errorFactory()), timeoutMs)
      })
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function settleWithForcedClose({
  task,
  timeoutMs,
  forceClose,
  closeTimeoutMs = 2000
}: {
  task: Promise<void>
  timeoutMs: number
  forceClose: () => void
  closeTimeoutMs?: number
}) {
  try {
    await withTimeout(
      task,
      timeoutMs,
      () => new Error('Stream did not settle before its soft timeout.')
    )
    return false
  } catch {
    forceClose()
    await withTimeout(
      task,
      closeTimeoutMs,
      () => new Error('Stream did not settle after it was closed.')
    )
    return true
  }
}

export type TranscriptFailureCode =
  | 'agent_unavailable'
  | 'agent_connect_failed'
  | 'dispatch_failed'
  | 'no_audio_received'
  | 'no_speech_detected'
  | 'stt_failed'
  | 'finalization_timeout'
  | 'worker_did_not_finalize'

export type TranscriptOutcome =
  | { status: 'ready'; errorCode: null }
  | {
      status: 'no_speech'
      errorCode: 'no_audio_received' | 'no_speech_detected'
    }
  | { status: 'failed'; errorCode: TranscriptFailureCode }

export function resolveTranscriptOutcome({
  failureCode,
  receivedAudio,
  attemptSegmentCount,
  segmentCount
}: {
  failureCode: TranscriptOutcome['errorCode']
  receivedAudio: boolean
  attemptSegmentCount: number
  segmentCount: number
}): TranscriptOutcome {
  if (failureCode === 'finalization_timeout' && segmentCount > 0) {
    return { status: 'ready', errorCode: null }
  }
  if (
    failureCode === 'no_audio_received' ||
    failureCode === 'no_speech_detected'
  ) {
    return { status: 'no_speech', errorCode: failureCode }
  }
  if (failureCode) return { status: 'failed', errorCode: failureCode }
  if (segmentCount > 0) return { status: 'ready', errorCode: null }
  if (!receivedAudio) {
    return { status: 'no_speech', errorCode: 'no_audio_received' }
  }
  if (attemptSegmentCount === 0) {
    return { status: 'no_speech', errorCode: 'no_speech_detected' }
  }
  return { status: 'ready', errorCode: null }
}
