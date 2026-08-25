export type ApiErrorCode = 'http' | 'network' | 'invalid-response'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null

  constructor(message: string, options: { code: ApiErrorCode; status?: number | null; cause?: unknown }) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.code = options.code
    this.status = options.status ?? null
  }
}
