import type { User } from '@/entities/user'
import { ApiError, apiRequest, refreshCsrfToken } from '@/shared/api'

export interface LoginInput {
  email: string
  password: string
}

export interface SignupInput {
  email: string
  password: string
  name: string
  team: string
  position: string
}

async function requestWithCsrfRecovery<T>(request: () => Promise<T>) {
  try {
    return await request()
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 403) throw error

    // 초기 세션 확인과 사용자의 제출이 엇갈리면 XSRF 쿠키가 아직 없을 수 있다.
    // 토큰을 한 번 새로 받고 같은 요청을 재시도한다.
    await refreshCsrfToken()
    return request()
  }
}

export const authApi = {
  getCurrentUser() {
    return apiRequest<User>('/api/v1/auth/me')
  },
  login(input: LoginInput) {
    return requestWithCsrfRecovery(() => apiRequest<User>('/api/v1/auth/login', {
      body: JSON.stringify(input),
      method: 'POST',
    }))
  },
  logout() {
    return apiRequest<void>('/api/v1/auth/logout', { method: 'POST' })
  },
  signup(input: SignupInput) {
    return requestWithCsrfRecovery(() => apiRequest<User>('/api/v1/auth/signup', {
      body: JSON.stringify(input),
      method: 'POST',
    }))
  },
}
