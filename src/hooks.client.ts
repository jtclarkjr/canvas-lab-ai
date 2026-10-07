import { dev } from '$app/env'
import { handleErrorWithSentry, init } from '@sentry/sveltekit'

const dsn = import.meta.env.VITE_SENTRY_DSN

init({
  dsn,
  enabled: !dev && Boolean(dsn),
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    httpBodies: []
  }
})

export const handleError = handleErrorWithSentry()
