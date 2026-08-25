import type { User } from '@/entities/user'
import { apiRequest } from '@/shared/api'

export interface LoginInput {
  email: string
  password: string
}

export const authApi = {
  getCurrentUser() {
    return apiRequest<User>('/api/v1/auth/me')
  },
  login(input: LoginInput) {
    return apiRequest<User>('/api/v1/auth/login', {
      body: JSON.stringify(input),
      method: 'POST',
    })
  },
  logout() {
    return apiRequest<void>('/api/v1/auth/logout', { method: 'POST' })
  },
}
