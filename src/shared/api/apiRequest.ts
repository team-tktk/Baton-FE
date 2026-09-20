import { ApiError } from './ApiError'

const SAFE_HTTP_ERROR_MESSAGE = '요청을 처리하지 못했어요.'
const CSRF_HEADER = 'X-XSRF-TOKEN'
const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function readCsrfToken() {
  const match = /(?:^|;\s*)XSRF-TOKEN=([^;]+)/.exec(document.cookie)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * 세션이 없는 첫 진입에서도 서버가 XSRF-TOKEN 쿠키를 내려준다.
 * 401은 정상 응답이므로 의도적으로 무시하고, 다음 상태 변경 요청이 토큰을 읽게 한다.
 */
export async function refreshCsrfToken() {
  try {
    await fetch('/api/v1/auth/me', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
  } catch {
    // 원래 요청의 오류를 유지한다. 연결 자체가 안 된 경우 여기서 새 오류를 덮어쓰지 않는다.
  }
}

function readErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return SAFE_HTTP_ERROR_MESSAGE
  const message = Reflect.get(payload, 'message')
  if (typeof message === 'string' && message.trim()) return message

  // Spring's Problem Details responses expose the user-facing reason as `detail`.
  const detail = Reflect.get(payload, 'detail')
  return typeof detail === 'string' && detail.trim() ? detail : SAFE_HTTP_ERROR_MESSAGE
}

function readServerCode(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const code = Reflect.get(payload, 'code')
  return typeof code === 'string' && code ? code : null
}

async function readJson(response: Response) {
  try {
    return await response.json() as unknown
  } catch (cause) {
    throw new ApiError(response.ok ? '응답 형식이 올바르지 않아요.' : SAFE_HTTP_ERROR_MESSAGE, {
      cause,
      code: response.ok ? 'invalid-response' : 'http',
      status: response.status,
    })
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith('/')) {
    throw new ApiError('API 요청은 상대 경로를 사용해야 해요.', { code: 'invalid-response' })
  }

  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  const sendsFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (init.body != null && !sendsFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!CSRF_SAFE_METHODS.has(init.method?.toUpperCase() ?? 'GET')) {
    const csrfToken = readCsrfToken()
    if (csrfToken) headers.set(CSRF_HEADER, csrfToken)
  }

  let response: Response
  try {
    response = await fetch(path, { ...init, credentials: 'include', headers })
  } catch (cause) {
    throw new ApiError('서버에 연결하지 못했어요.', { cause, code: 'network' })
  }

  if (response.status === 204) return undefined as T

  const payload = await readJson(response)
  if (!response.ok) {
    throw new ApiError(readErrorMessage(payload), { code: 'http', status: response.status, serverCode: readServerCode(payload) })
  }

  return payload as T
}
