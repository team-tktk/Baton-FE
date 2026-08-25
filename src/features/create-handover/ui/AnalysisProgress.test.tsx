import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { AnalysisJob, HandoverAttachment } from '@/entities/handover'

import { AnalysisProgress } from './AnalysisProgress'

const attachments: HandoverAttachment[] = [
  { id: 'file-1', name: '가을_할인전_준비_메모.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 0, status: 'ready' },
  { id: 'file-2', name: '주간_주문현황_양식.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 0, status: 'ready' },
  { id: 'file-3', name: '문제상황_대응방법.pdf', mimeType: 'application/pdf', size: 0, status: 'ready' },
]

const runningJob: AnalysisJob = { status: 'running', progress: 40, currentStep: '반복 업무를 정리하는 중', error: null }

describe('AnalysisProgress', () => {
  it('shows the uploaded files and the DEMO analysis states', () => {
    render(<AnalysisProgress attachments={attachments} job={null} onRetry={vi.fn()} />)

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

  it('reports the server progress and current step', () => {
    render(<AnalysisProgress attachments={attachments} job={runningJob} onRetry={vi.fn()} />)

    expect(screen.getByText('반복 업무를 정리하는 중')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
  })

  it('offers a retry with the server reason when the analysis fails', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const failed: AnalysisJob = { status: 'failed', progress: 60, currentStep: '초안 생성', error: '문서를 읽지 못했어요.' }

    render(<AnalysisProgress attachments={attachments} job={failed} onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('문서를 읽지 못했어요.')
    await user.click(screen.getByRole('button', { name: '다시 분석하기' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('keeps the indeterminate bar until the first status arrives', () => {
    render(<AnalysisProgress attachments={attachments} job={null} onRetry={vi.fn()} />)

    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
