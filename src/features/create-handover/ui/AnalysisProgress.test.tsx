import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AnalysisProgress } from './AnalysisProgress'

afterEach(() => vi.useRealTimers())

const attachments = [
  { id: 'file-1', name: '가을_할인전_준비_메모.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 2_400_000 },
  { id: 'file-2', name: '주간_주문현황_양식.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 840_000 },
  { id: 'file-3', name: '문제상황_대응방법.pdf', mimeType: 'application/pdf', size: 1_800_000 },
]

describe('AnalysisProgress', () => {
  it('shows the uploaded files and the DEMO analysis states', () => {
    render(<AnalysisProgress attachments={attachments} onComplete={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /업무의 흐름을\s*정리하고 있어요/ })).toBeInTheDocument()
    expect(screen.getByText('반복되는 일, 진행 중인 업무, 꼭 알아야 할 기준을 찾아 인수인계 문서로 구성합니다.')).toBeInTheDocument()
    expect(screen.getByText('가을_할인전_준비_메모.docx')).toBeInTheDocument()
    expect(screen.getByText('주간_주문현황_양식.xlsx')).toBeInTheDocument()
    expect(screen.getByText('문제상황_대응방법.pdf')).toBeInTheDocument()
    expect(screen.getByText('업무와 일정 찾는 중')).toBeInTheDocument()
    expect(screen.getByText('반복 업무 정리 중')).toBeInTheDocument()
    expect(screen.getByText('예외 상황 확인 중')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '업무 자료 분석 중' })).toBeInTheDocument()
  })

  it('completes once after 7.2 seconds', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<AnalysisProgress attachments={attachments} onComplete={onComplete} />)

    await vi.advanceTimersByTimeAsync(7_199)
    expect(onComplete).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(onComplete).toHaveBeenCalledOnce()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('cancels completion after unmount', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    const view = render(<AnalysisProgress attachments={attachments.slice(0, 2)} onComplete={onComplete} />)

    view.unmount()
    await vi.advanceTimersByTimeAsync(7_200)

    expect(onComplete).not.toHaveBeenCalled()
  })
})
