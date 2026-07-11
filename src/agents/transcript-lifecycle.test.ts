import { describe, expect, it } from 'vite-plus/test'
import {
  createSerializedFinalizer,
  PendingTaskSet,
  resolveTranscriptOutcome,
  settleWithForcedClose,
  withTimeout
} from './transcript-lifecycle'

describe('transcript worker lifecycle', () => {
  it('serializes competing finalization signals', async () => {
    let calls = 0
    const finalize = createSerializedFinalizer(async () => {
      calls += 1
      await Promise.resolve()
    })

    await Promise.all([finalize(), finalize(), finalize()])

    expect(calls).toBe(1)
  })

  it('waits for pending transcript writes before draining', async () => {
    const tasks = new PendingTaskSet()
    let release!: () => void
    const write = new Promise<void>((resolve) => {
      release = resolve
    })
    void tasks.track(write)

    let drained = false
    const draining = tasks.drain().then(() => {
      drained = true
    })
    await Promise.resolve()

    expect(drained).toBe(false)
    release()
    await draining
    expect(drained).toBe(true)
    expect(tasks.size).toBe(0)
  })

  it('bounds an STT flush that never completes', async () => {
    await expect(
      withTimeout(
        new Promise<never>(() => {}),
        5,
        () => new Error('flush timeout')
      )
    ).rejects.toThrow('flush timeout')
  })

  it('forces a lingering stream closed without failing finalization', async () => {
    let release!: () => void
    const task = new Promise<void>((resolve) => {
      release = resolve
    })

    await expect(
      settleWithForcedClose({
        task,
        timeoutMs: 5,
        forceClose: release
      })
    ).resolves.toBe(true)
  })

  it('distinguishes empty audio, silence, failures, and ready transcripts', () => {
    expect(
      resolveTranscriptOutcome({
        failureCode: null,
        receivedAudio: false,
        attemptSegmentCount: 0,
        segmentCount: 0
      })
    ).toEqual({ status: 'no_speech', errorCode: 'no_audio_received' })
    expect(
      resolveTranscriptOutcome({
        failureCode: null,
        receivedAudio: true,
        attemptSegmentCount: 0,
        segmentCount: 0
      })
    ).toEqual({ status: 'no_speech', errorCode: 'no_speech_detected' })
    expect(
      resolveTranscriptOutcome({
        failureCode: 'stt_failed',
        receivedAudio: true,
        attemptSegmentCount: 1,
        segmentCount: 1
      })
    ).toEqual({ status: 'failed', errorCode: 'stt_failed' })
    expect(
      resolveTranscriptOutcome({
        failureCode: 'finalization_timeout',
        receivedAudio: true,
        attemptSegmentCount: 1,
        segmentCount: 1
      })
    ).toEqual({ status: 'ready', errorCode: null })
    expect(
      resolveTranscriptOutcome({
        failureCode: null,
        receivedAudio: false,
        attemptSegmentCount: 0,
        segmentCount: 1
      })
    ).toEqual({ status: 'ready', errorCode: null })
    expect(
      resolveTranscriptOutcome({
        failureCode: null,
        receivedAudio: true,
        attemptSegmentCount: 1,
        segmentCount: 1
      })
    ).toEqual({ status: 'ready', errorCode: null })
  })
})
