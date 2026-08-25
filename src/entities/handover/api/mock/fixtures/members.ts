import type { HandoverParticipant } from '../../../model/types'

export const memberFixtures = [
  { id: 'user-choi-seoyun', name: '최서윤', position: '매니저', team: '운영팀' },
  { id: 'user-jung-haneul', name: '정하늘', position: '주임', team: '운영팀' },
  { id: 'user-lee-dohyeon', name: '이도현', position: '팀장', team: '운영팀' },
  { id: 'user-kim-minjun', name: '김민준', position: '매니저', team: '상품팀' },
  { id: 'user-yoon-yerin', name: '윤예린', position: '매니저', team: '마케팅팀' },
  { id: 'user-oh-sejin', name: '오세진', position: '주임', team: '물류팀' },
  { id: 'user-park-jimin', name: '박지민', position: '매니저', team: 'CS팀' },
  { id: 'user-lee-seojin', name: '이서진', position: '주임', team: '운영지원팀' },
] satisfies HandoverParticipant[]
