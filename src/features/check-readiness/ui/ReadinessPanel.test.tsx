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
  it('shows the score and the key issues with their evidence', async () => {
    const user = userEvent.setup()
    const { document, evidence, readiness } = await evaluated()
    const onLocate = vi.fn()
    const onOpenEvidence = vi.fn()
    const onReevaluate = vi.fn()
    render(<ReadinessPanel document={document} error={null} phase="ready" readiness={readiness} onLocate={onLocate} onOpenEvidence={onOpenEvidence} onReevaluate={onReevaluate} />)

    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('보완 필요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '저장하고 다시 점검' })).not.toBeInTheDocument()
    // 점검이 최신이면 다시 점검해도 같은 결과라 버튼을 두지 않는다.
    expect(screen.queryByRole('button', { name: /다시 점검/ })).not.toBeInTheDocument()
    expect(onReevaluate).not.toHaveBeenCalled()

    const areas = within(screen.getByRole('region', { name: '영역별 준비도' }))
    expect(areas.getByRole('heading', { name: '영역별 점검 결과' })).toBeInTheDocument()
    const rows = areas.getAllByRole('button', { name: /실행 절차|예외 대응|담당자/ })
    expect(rows.slice(0, 3).map((row) => row.textContent)).toEqual(['실행 절차20점일부 부족', '예외 대응15점일부 부족', '담당자10점충돌'])
    expect(rows[0]).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('article', { name: '실행 절차 자세히' })).not.toBeInTheDocument()

    await user.click(rows[0]!)
    expect(screen.getByRole('article', { name: '실행 절차 자세히' })).toHaveTextContent('주간 주문 현황')

    await user.click(rows[1]!)
    expect(rows[1]).toHaveAttribute('aria-expanded', 'true')
    expect(rows[0]).toHaveAttribute('aria-expanded', 'false')
    const detail = within(screen.getByRole('article', { name: '예외 대응 자세히' }))
    await user.click(detail.getByRole('button', { name: new RegExp(evidence.fileName) }))
    expect(onOpenEvidence).toHaveBeenCalledWith(evidence)
    await user.click(detail.getByRole('button', { name: '문서에서 수정하기' }))
    expect(onLocate).toHaveBeenCalledWith('RULES_AND_EXCEPTIONS')

    await user.click(rows[1]!)
    expect(rows[1]).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('article', { name: '예외 대응 자세히' })).not.toBeInTheDocument()
  })

  it('shows a repeated evidence file only once', async () => {
    const user = userEvent.setup()
    const { document, readiness } = await evaluated()
    const area = readiness.areas.find((item) => item.keyIssue)!
    const duplicateEvidence = [...area.evidence, { ...area.evidence[0]!, locator: '4쪽' }]
    render(<ReadinessPanel document={document} error={null} phase="ready" readiness={{ ...readiness, areas: readiness.areas.map((item) => item.area === area.area ? { ...item, evidence: duplicateEvidence } : item) }} />)

    await user.click(screen.getByRole('button', { name: new RegExp(area.label) }))
    expect(screen.getAllByText(area.evidence[0]!.fileName)).toHaveLength(1)
    expect(screen.getByText(`${area.evidence[0]!.locator} · 4쪽`)).toBeInTheDocument()
  })

  it('offers locating instead of editing for a section the editor cannot change', async () => {
    const user = userEvent.setup()
    const { document, readiness } = await evaluated()
    const access = { ...readiness.areas.find((area) => area.area === 'ACCESS')!, status: 'missing' as const, statusLabel: '누락', percent: 0, keyIssue: true }
    render(<ReadinessPanel document={document} error={null} phase="ready" readiness={{ ...readiness, areas: [access] }} onLocate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: new RegExp(access.label) }))
    expect(screen.getByRole('button', { name: '문서에서 위치 보기' })).toBeInTheDocument()
  })

  it('asks to save and re-evaluate when the evaluation is outdated', async () => {
    const user = userEvent.setup()
    const { document, readiness } = await evaluated()
    const onReevaluate = vi.fn()
    const { rerender } = render(<ReadinessPanel dirty document={document} error={null} phase="ready" readiness={readiness} onReevaluate={onReevaluate} />)

    expect(screen.getByText(/고친 내용은 아직 점검에 반영되지 않았어요/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '저장하고 다시 점검' }))
    expect(onReevaluate).toHaveBeenCalledTimes(1)

    rerender(<ReadinessPanel document={document} error="평가 서버가 바빠요" phase="evaluating" readiness={{ ...readiness, stale: true }} onReevaluate={onReevaluate} />)
    expect(screen.getByRole('status')).toHaveTextContent('다시 점검하고 있어요')
    expect(screen.getByRole('alert')).toHaveTextContent('평가 서버가 바빠요')
    expect(screen.queryByRole('button', { name: '저장하고 다시 점검' })).not.toBeInTheDocument()
  })

  it('explains the first evaluation and lets a failed one be retried', async () => {
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

  it('renders read-only without actions that change or open anything', async () => {
    const user = userEvent.setup()
    const { document, evidence, readiness } = await evaluated()
    render(<ReadinessPanel dirty document={document} error={null} phase="ready" readiness={readiness} />)

    expect(screen.queryByRole('button', { name: /다시 점검|문서에서|다시 시도/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: new RegExp(evidence.fileName) })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /실행 절차/ }))
    expect(screen.getByRole('article', { name: '실행 절차 자세히' })).toHaveTextContent(evidence.fileName)
  })
})
