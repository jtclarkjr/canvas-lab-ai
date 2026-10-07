import { WORKFLOW_ENABLED } from '$app/env/private'
import { notFound } from '#lib/server/api-error.js'

export const envFlag = (value: string | undefined): boolean =>
  !!value && value.toLowerCase() !== 'false' && value !== '0'

export function workflowsEnabled(): boolean {
  return envFlag(WORKFLOW_ENABLED)
}

export function requireWorkflowsEnabled() {
  if (!workflowsEnabled()) {
    throw notFound('Workflows are not enabled.', {
      code: 'workflows_disabled'
    })
  }
}
