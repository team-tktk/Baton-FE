export type ApiErrorCode = 'http' | 'network' | 'invalid-response'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  /**
   * 서버가 Problem Details에 담아 준 오류 코드(예: MASKING_NOT_CONFIRMED).
   * 같은 409라도 이유가 여러 가지라, 분기해야 할 때는 status가 아니라 이 값을 본다.
   */
  readonly serverCode: string | null

  constructor(message: string, options: { code: ApiErrorCode; status?: number | null; serverCode?: string | null; cause?: unknown }) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.code = options.code
    this.status = options.status ?? null
    this.serverCode = options.serverCode ?? null
  }
}
