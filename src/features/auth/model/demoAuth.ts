import type { User } from '@/entities/user'

export const DEMO_SESSION_KEY = 'baton-demo-session'
export const DEMO_ROLE_KEY = 'baton-scenario-role'

export type DemoRole = 'owner' | 'recipient' | 'reviewer'

export const demoUser: User = {
  createdAt: '2025-03-04T00:00:00Z',
  email: 'seoyun.choi@moastore.co.kr',
  id: 'user-choi-seoyun',
  name: '최서윤',
  position: '매니저',
  team: '운영팀',
}

export const demoUsers: Record<DemoRole, User> = {
  owner: demoUser,
  recipient: {
    createdAt: '2025-07-01T00:00:00Z',
    email: 'haneul.jung@moastore.co.kr',
    id: 'user-jung-haneul',
    name: '정하늘',
    position: '주임',
    team: '운영팀',
  },
  reviewer: {
    createdAt: '2024-11-18T00:00:00Z',
    email: 'dohyeon.lee@moastore.co.kr',
    id: 'user-lee-dohyeon',
    name: '이도현',
    position: '팀장',
    team: '운영팀',
  },
}
