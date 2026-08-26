import type { ReviewComment } from '../../../model/types'

/** 인수인계 id별 책임자 코멘트(작성 시각 오름차순). 목록에 없는 id는 코멘트가 없는 것으로 본다. */
export const commentFixtures: Record<string, ReviewComment[]> = {
  'handover-moastore-operations': [
    { id: 'comment-1', authorName: '정하늘', text: '가을 할인전 쿠폰 승인 순서가 명확해서 좋아요. 배송업체 회신 기준만 한 줄 더 보완해 주세요.', createdAtLabel: '오늘 15:10' },
    { id: 'comment-2', authorName: '한다인', text: '첨부한 사업계획서 최신본 맞는지 확인 부탁드려요.', createdAtLabel: '오늘 16:02' },
  ],
  'handover-press-kit': [
    { id: 'comment-3', authorName: '김민성', text: '보도자료 배포 채널 목록 잘 정리됐습니다. 승인할게요.', createdAtLabel: '8월 20일' },
  ],
}
