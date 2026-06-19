import { ZodType } from 'zod'
import { isAnonymousUser } from '$lib/auth/anonymous'
import { logServerError } from '$lib/server/logger'
import type { ApiErrorIssues, ErrorLogger } from '$lib/server/types'

type AppErrorOptions = {
  status: number
  message: string
  code?: string
  issues?: ApiErrorIssues
  cause?: unknown
  details?: Record<string, unknown>
}

export class AppError extends Error {
  status: number
  code?: string
  issues?: ApiErrorIssues
  details?: Record<string, unknown>

  constructor({
    status,
    message,
    code,
    issues,
    cause,
    details
  }: AppErrorOptions) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.issues = issues
    this.details = details

    if (cause !== undefined) {
      ;(this as Error & { cause?: unknown }).cause = cause
    }
  }
}

export function badRequest(
  message: string,
  options: Omit<Partial<AppErrorOptions>, 'status' | 'message'> = {}
) {
  return new AppError({
    status: 400,
    message,
    ...options
  })
}

export function validationError(
  message: string,
  issues?: ApiErrorIssues,
  options: Omit<Partial<AppErrorOptions>, 'status' | 'message' | 'issues'> = {}
) {
  return new AppError({
    status: 400,
    message,
    issues,
    ...options
  })
}

export function unauthorized(
  message = 'Unauthorized.',
  options: Omit<Partial<AppErrorOptions>, 'status' | 'message'> = {}
) {
  return new AppError({ status: 401, message, ...options })
}

export function withAuth<U>(user: U | null | undefined): U {
  if (!user) throw unauthorized()
  return user
}

export function withAccountAuth<U>(user: U | null | undefined): U {
  const currentUser = withAuth(user)
  if (isAnonymousUser(currentUser)) {
    throw unauthorized('Log in to continue.', {
      code: 'login_required'
    })
  }
  return currentUser
}

export function forbidden(
  message = 'Forbidden.',
  options: Omit<Partial<AppErrorOptions>, 'status' | 'message'> = {}
) {
  return new AppError({ status: 403, message, ...options })
}

export function notFound(
  message: string,
  options: Omit<Partial<AppErrorOptions>, 'status' | 'message'> = {}
) {
  return new AppError({
    status: 404,
    message,
    ...options
  })
}

export function internalServerError(
  message = 'Something went wrong on the server.',
  options: Omit<Partial<AppErrorOptions>, 'status' | 'message'> = {}
) {
  return new AppError({
    status: 500,
    message,
    ...options
  })
}

export function serializeApiError(error: AppError) {
  return {
    message: error.message,
    ...(error.code ? { code: error.code } : null),
    ...(error.issues ? { issues: error.issues } : null)
  }
}

export function buildValidationIssues(
  fieldErrors: Record<string, string[] | undefined>
) {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter((entry): entry is [string, string[]] =>
      Boolean(entry[1]?.length)
    )
  )
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch (error) {
    throw badRequest('Request body must be valid JSON.', {
      code: 'invalid_json',
      cause: error
    })
  }
}

export function requireRouteParam(
  value: string | undefined,
  label: string,
  param = label
) {
  if (!value) {
    throw badRequest(`${label} is required.`, {
      code: 'missing_route_param',
      details: { param }
    })
  }

  return value
}

export function parseInput<TSchema extends ZodType>(
  schema: TSchema,
  payload: unknown,
  message = 'Request body failed validation.'
) {
  const parsed = schema.safeParse(payload)

  if (!parsed.success) {
    throw validationError(
      message,
      buildValidationIssues(parsed.error.flatten().fieldErrors),
      {
        code: 'validation_error',
        cause: parsed.error
      }
    )
  }

  return parsed.data
}

export function normalizeError(error: unknown): {
  error: AppError
  unexpected: boolean
} {
  if (error instanceof AppError) {
    return { error, unexpected: false }
  }

  return {
    error: internalServerError('Something went wrong on the server.', {
      code: 'internal_server_error',
      cause: error
    }),
    unexpected: true
  }
}

export function handleApiError(
  error: unknown,
  request: Request,
  options?: {
    logger?: ErrorLogger
  }
) {
  const normalized = normalizeError(error)

  logServerError({
    error: normalized.error,
    request,
    unexpected: normalized.unexpected,
    logger: options?.logger
  })

  return new Response(JSON.stringify(serializeApiError(normalized.error)), {
    status: normalized.error.status,
    headers: {
      'content-type': 'application/json'
    }
  })
}
