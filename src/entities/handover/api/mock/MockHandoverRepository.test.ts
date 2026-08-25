// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { RepositoryError } from '@/shared/lib/async'

import { primaryHandoverFixture } from './fixtures/handovers'
import { MockHandoverRepository } from './MockHandoverRepository'

describe('MockHandoverRepository', () => {
  it('returns cloned members so callers cannot mutate repository state', async () => {
    const repository = new MockHandoverRepository()
    const first = await repository.listMembers()

    first[0]!.name = '변경된 이름'

    expect((await repository.listMembers())[0]!.name).toBe('최서윤')
  })

  it('keeps mutations isolated between repository instances', async () => {
    const first = new MockHandoverRepository()
    const second = new MockHandoverRepository()

    await first.approveHandover('handover-moastore-operations')

    expect((await first.getHandover('handover-moastore-operations')).status).toBe('approved')
    expect((await second.getHandover('handover-moastore-operations')).status).toBe('submitted')
  })

  it('updates submitted state without mutating exported fixtures', async () => {
    const repository = new MockHandoverRepository()
    await repository.createDraft({
      recipientIds: ['user-jung-haneul'],
      reviewerIds: [],
      workItems: ['프로모션 운영'],
    })

    const result = await repository.submitHandover('handover-moastore-operations')

    expect(result.status).toBe('submitted')
    expect((await repository.getHandover(result.id)).status).toBe('submitted')
    expect(primaryHandoverFixture.status).toBe('submitted')
  })

  it('reuses the primary demo id instead of adding a duplicate row', async () => {
    const repository = new MockHandoverRepository()

    await repository.createDraft({
      recipientIds: ['user-jung-haneul'],
      reviewerIds: [],
      workItems: ['프로모션 운영', '배송업체 협업'],
    })

    const rows = await repository.listReceivedHandovers()
    expect(rows.filter((row) => row.id === 'handover-moastore-operations')).toHaveLength(1)
  })

  it('matches a sourced answer for coupon questions and a safe fallback otherwise', async () => {
    const repository = new MockHandoverRepository()

    await expect(repository.askQuestion('handover-moastore-operations', '왜 12% 쿠폰인가요?')).resolves.toMatchObject({
      grounded: true,
      citations: [{ title: '가을 할인전 준비 메모 · 팀 대화 · 8월 21일' }],
    })
    await expect(repository.askQuestion('handover-moastore-operations', '사내 와이파이 비밀번호는?')).resolves.toEqual({
      text: '자료에서 답을 찾지 못했어요. 이도현 팀장님께 물어볼 질문으로 정리해드릴게요.',
      grounded: false,
      citations: [],
    })
  })

  it('trims and stores a manager comment', async () => {
    const repository = new MockHandoverRepository()

    const comment = await repository.addReviewComment(
      'handover-moastore-operations',
      '  첨부 자료 권한을 확인해 주세요.  ',
    )

    expect(comment.text).toBe('첨부 자료 권한을 확인해 주세요.')
    expect((await repository.getHandover('handover-moastore-operations')).review.comments).toContainEqual(comment)
  })

  it('rejects a blank manager comment', async () => {
    const repository = new MockHandoverRepository()

    await expect(repository.addReviewComment('handover-moastore-operations', '   ')).rejects.toMatchObject({
      code: 'VALIDATION',
    })
  })

  it('throws a typed not-found error for an unknown id', async () => {
    const repository = new MockHandoverRepository()

    await expect(repository.getHandover('missing')).rejects.toEqual(
      new RepositoryError('NOT_FOUND', '인수인계를 찾을 수 없어요.'),
    )
  })
})
