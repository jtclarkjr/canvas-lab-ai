import { afterEach, describe, expect, it } from 'vite-plus/test'
import { env as privateEnv } from '$env/dynamic/private'
import {
  envFlag,
  requireWorkflowsEnabled,
  workflowsEnabled
} from '$lib/server/features'

const mutableEnv = privateEnv as Record<string, string | undefined>
const originalWorkflowFlag = mutableEnv.WORKFLOW_ENABLED

function setWorkflowFlag(value: string | undefined) {
  if (value === undefined) {
    delete mutableEnv.WORKFLOW_ENABLED
    return
  }

  mutableEnv.WORKFLOW_ENABLED = value
}

describe('feature flags', () => {
  afterEach(() => {
    setWorkflowFlag(originalWorkflowFlag)
  })

  it('parses falsey environment flag values', () => {
    expect(envFlag(undefined)).toBe(false)
    expect(envFlag('')).toBe(false)
    expect(envFlag('false')).toBe(false)
    expect(envFlag('FALSE')).toBe(false)
    expect(envFlag('0')).toBe(false)
  })

  it('treats other configured values as enabled', () => {
    expect(envFlag('true')).toBe(true)
    expect(envFlag('1')).toBe(true)
    expect(envFlag('yes')).toBe(true)
  })

  it('throws a not found error when workflows are disabled', () => {
    setWorkflowFlag(undefined)

    expect(workflowsEnabled()).toBe(false)
    expect(() => requireWorkflowsEnabled()).toThrow(
      'Workflows are not enabled.'
    )
  })

  it('allows workflow routes when the flag is enabled', () => {
    setWorkflowFlag('true')

    expect(workflowsEnabled()).toBe(true)
    expect(() => requireWorkflowsEnabled()).not.toThrow()
  })
})
