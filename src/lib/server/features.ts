import { env as privateEnv } from '$env/dynamic/private'
import { notFound } from '$lib/server/api-error'

export const envFlag = (value: string | undefined): boolean =>
  !!value && value.toLowerCase() !== 'false' && value !== '0'

export function workflowsEnabled(): boolean {
  return envFlag(privateEnv.WORKFLOW_ENABLED)
}

export function requireWorkflowsEnabled() {
  if (!workflowsEnabled()) {
    throw notFound('Workflows are not enabled.', {
      code: 'workflows_disabled'
    })
  }
}
