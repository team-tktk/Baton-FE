import type { SentSummary } from '../../../model/types'

export const sentSummaryFixtures: SentSummary[] = [
  {
    id: 'handover-moastore-operations',
    title: '모아스토어 운영팀 업무 인수인계',
    scope: '가을 정기 할인전 준비',
    date: '오늘 14:30',
    status: 'submitted',
    tasks: 3,
    files: 3,
    recipients: 1,
  },
  {
    id: 'handover-brand-campaign',
    title: '브랜드 캠페인 운영 인수인계',
    scope: '9월 신규 캠페인 세팅',
    date: '어제 11:05',
    status: 'draft',
    tasks: 4,
    files: 2,
    recipients: 2,
  },
  {
    id: 'handover-press-kit',
    title: '홍보 자료 배포 인수인계',
    scope: '보도자료 배포 채널 정리',
    date: '8월 20일',
    status: 'approved',
    tasks: 2,
    files: 5,
    recipients: 1,
  },
]
