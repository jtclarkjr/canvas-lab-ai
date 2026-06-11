import { z, ZodError } from 'zod'

export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  issues: z.record(z.string(), z.array(z.string())).optional()
})

export type ApiError = z.infer<typeof apiErrorSchema>

export class ApiClientError extends Error {
  status: number
  code?: string
  issues?: ApiError['issues']

  constructor(
    message: string,
    status: number,
    issues?: ApiError['issues'],
    code?: string
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.issues = issues
    this.code = code
  }
}

export async function parseResponse<T>(
  response: Response,
  parse: (payload: unknown) => T,
  fallbackMessage: string
): Promise<T> {
  let payload: unknown = null

  try {
    payload = await response.json()
  } catch {
    throw new ApiClientError(
      'Expected a JSON response from the API.',
      response.status
    )
  }

  if (!response.ok) {
    const apiError = apiErrorSchema.safeParse(payload)

    if (apiError.success) {
      throw new ApiClientError(
        apiError.data.message,
        response.status,
        apiError.data.issues,
        apiError.data.code
      )
    }

    throw new ApiClientError(fallbackMessage, response.status)
  }

  return parse(payload)
}

export function isSchemaError(error: unknown): error is ZodError {
  return error instanceof ZodError
}
