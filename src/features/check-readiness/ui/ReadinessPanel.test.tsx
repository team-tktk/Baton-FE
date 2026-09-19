import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MockHandoverRepository } from '@/entities/handover'

import { ReadinessPanel } from './ReadinessPanel'

const ID = 'handover-moastore-operations'

async function evaluated() {
  const repository = new MockHandoverRepository()
  const { document } = await repository.getDocument(ID)
  const readiness = await repository.evaluateReadiness(ID)
  return { document, readiness, evidence: readiness.areas[0]!.evidence[0]! }
}

describe('ReadinessPanel', () => {
  it('lists the items to check instead of a score and starts a fix for the chosen ones', async () => {
    const user = userEvent.setup()
    const { document, readiness } = await evaluated()
    const onFix = vi.fn()
    render(<ReadinessPanel document={document} error={null} phase="ready" readiness={readiness} onFix={onFix} onLocate={vi.fn()} onReevaluate={vi.fn()} />)

    expect(screen.getByText('보완 필요')).toBeInTheDocument()
    expect(screen.getByText('3개').closest('p')).toHaveTextContent('확인할 항목 3개')
    expect(screen.queryByText('75')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /다시 점검/ })).not.toBeInTheDocument()

    const list = within(screen.getByRole('region', { name: '확인할 항목' }))
    expect(list.getAllByRole('checkbox').map((box) => (box as HTMLInputElement).checked)).toEqual([true, true, true])
    await user.click(list.getByRole('button', { name: '확인할 항목 3개 AI로 보완하기' }))
    expect(onFix.mock.calls[0]![0].map((area: { area: string }) => area.area)).toEqual(['PROCEDURE', 'EXCEPTION', 'CONTACTS'])

    await user.click(list.getByRole('checkbox', { name: '실행 절차 보완에 포함' }))
    await user.click(list.getByRole('button', { name: '선택한 2개 AI로 보완하기' }))
    expect(onFix.mock.calls[1]![0].map((area: { area: string }) => area.area)).toEqual(['EXCEPTION', 'CONTACTS'])
  })

  it('shows the details of the selected item and fixes just that one', async () => {
    const user = userEvent.setup()
    const { document, evidence, readiness } = await evaluated()
    const onFix = vi.fn()
    const onLocate = vi.fn()
    const onOpenEvidence = vi.fn()
    render(<ReadinessPanel document={document} error={null} phase="ready" readiness={readiness} onFix={onFix} onLocate={onLocate} onOpenEvidence={onOpenEvidence} />)

    const list = within(screen.getByRole('region', { name: '확인할 항목' }))
    expect(list.getAllByRole('button', { pressed: true })).toHaveLength(1)
    expect(screen.getByRole('article', { name: '실행 절차 자세히' })).toHaveTextContent('고칠 곳반복 업무')

    await user.click(list.getByRole('button', { name: /담당자/ }))
    const detail = within(screen.getByRole('article', { name: '담당자 자세히' }))
    expect(detail.getByText('보완할 때 물어볼 질문 1개')).toBeInTheDocument()
    await user.click(detail.getByRole('button', { name: new RegExp(evidence.fileName) }))
    expect(onOpenEvidence).toHaveBeenCalledWith(evidence)
    await user.click(detail.getByRole('button', { name: '이 항목만 AI로 보완' }))
    expect(onFix).toHaveBeenCalledWith([expect.objectContaining({ area: 'CONTACTS' })])
    await user.click(detail.getByRole('button', { name: '문서에서 수정하기' }))
    expect(onLocate).toHaveBeenCalledWith('STAKEHOLDERS')
  })

  it('shows questions deferred during the interview', async () => {
    const { document, readiness } = await evaluated()
    const withDeferred = {
      ...readiness,
      deferredQuestionCount: 1,
      areas: readiness.areas.map((area) => area.area === 'PROCEDURE'
        ? { ...area, deferredQuestions: [{ id: 'cq-1', question: '주간 현황은 언제 공유하나요?', reason: '' }] }
        : area),
    }
    render(<ReadinessPanel document={document} error={null} phase="ready" readiness={withDeferred} onFix={vi.fn()} />)

    expect(screen.getByText('나중에 답하기 1개')).toBeInTheDocument()
    const detail = within(screen.getByRole('article', { name: '실행 절차 자세히' }))
    expect(detail.getByText('나중에 답하기로 미룬 질문 1개')).toBeInTheDocument()
    expect(detail.getByText('주간 현황은 언제 공유하나요?')).toBeInTheDocument()
    expect(detail.getByText('AI로 보완할 때 함께 물어봐요.')).toBeInTheDocument()
  })

  it('asks to save and check again, and blocks fixes until then', async () => {
    const user = userEvent.setup()
    const { document, readiness } = await evaluated()
    const onReevaluate = vi.fn()
    const { rerender } = render(<ReadinessPanel dirty fixBlocked document={document} error={null} phase="ready" readiness={readiness} onFix={vi.fn()} onReevaluate={onReevaluate} />)

    expect(screen.getByText(/고친 내용은 아직 점검에 반영되지 않았어요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /AI로 보완하기/ })).toBeDisabled()
    expect(screen.getAllByRole('checkbox').every((box) => (box as HTMLInputElement).disabled)).toBe(true)
    await user.click(screen.getByRole('button', { name: '저장하고 다시 점검' }))
    expect(onReevaluate).toHaveBeenCalledTimes(1)

    rerender(<ReadinessPanel document={document} error="평가 서버가 바빠요" phase="evaluating" readiness={{ ...readiness, stale: true }} onReevaluate={onReevaluate} />)
    expect(screen.getByRole('status')).toHaveTextContent('다시 점검하고 있어요')
    expect(screen.getByRole('alert')).toHaveTextContent('평가 서버가 바빠요')
    expect(screen.queryByRole('button', { name: '저장하고 다시 점검' })).not.toBeInTheDocument()
  })

  it('explains the first check and lets a failed one be retried', async () => {
    const user = userEvent.setup()
    const { document } = await evaluated()
    const onReevaluate = vi.fn()
    const { rerender } = render(<ReadinessPanel document={document} error={null} phase="evaluating" readiness={null} onReevaluate={onReevaluate} />)
    expect(screen.getByRole('status')).toHaveTextContent('문서를 점검하고 있어요')

    rerender(<ReadinessPanel document={document} error="초안이 아직 없어요" phase="error" readiness={null} onReevaluate={onReevaluate} />)
    expect(screen.getByRole('alert')).toHaveTextContent('초안이 아직 없어요')
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onReevaluate).toHaveBeenCalled()
  })

  it('renders read-only without checkboxes or actions', async () => {
    const { document, evidence, readiness } = await evaluated()
    render(<ReadinessPanel dirty document={document} error={null} phase="ready" readiness={readiness} />)

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /다시 점검|문서에서|AI로/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: new RegExp(evidence.fileName) })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: '실행 절차 자세히' })).toHaveTextContent(evidence.fileName)
  })

  it('says there is nothing to check when every area is sufficient', async () => {
    const { document, readiness } = await evaluated()
    const ready = { ...readiness, grade: 'ready' as const, gradeLabel: '인수인계 가능', areas: readiness.areas.map((area) => ({ ...area, status: 'sufficient' as const, statusLabel: '충분' })) }
    render(<ReadinessPanel document={document} error={null} phase="ready" readiness={ready} onFix={vi.fn()} />)

    expect(screen.getByText('확인할 항목이 없어요')).toBeInTheDocument()
    expect(screen.getByText('모든 영역이 충분해요. 바로 전달해도 좋아요.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '확인할 항목' })).not.toBeInTheDocument()
  })
})
