import { ApiError } from './ApiError'

const SAFE_HTTP_ERROR_MESSAGE = '요청을 처리하지 못했어요.'

function readErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return SAFE_HTTP_ERROR_MESSAGE
  const message = Reflect.get(payload, 'message')
  return typeof message === 'string' && message.trim() ? message : SAFE_HTTP_ERROR_MESSAGE
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
  if (init.body != null && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(path, { ...init, credentials: 'include', headers })
  } catch (cause) {
    throw new ApiError('서버에 연결하지 못했어요.', { cause, code: 'network' })
  }

  if (response.status === 204) return undefined as T

  const payload = await readJson(response)
  if (!response.ok) {
    throw new ApiError(readErrorMessage(payload), { code: 'http', status: response.status })
  }

  return payload as T
}
