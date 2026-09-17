import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HandoverProgress } from './HandoverProgress'

describe('HandoverProgress', () => {
  it('lists all six steps and marks the current one', () => {
    render(<HandoverProgress current={3} />)

    const steps = within(screen.getByRole('navigation', { name: '인수인계 진행 상황' })).getAllByRole('listitem')
    const labels = ['기본 정보', '파일 업로드', '민감정보 확인', 'AI 분석', 'AI 질문', '초안 확인']
    expect(steps).toHaveLength(labels.length)
    steps.forEach((step, index) => expect(step).toHaveTextContent(labels[index]))
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('민감정보 확인')
  })

  it('announces the steps already passed as done', () => {
    render(<HandoverProgress current={3} />)

    const [setup, upload, masking] = screen.getAllByRole('listitem')
    expect(setup).toHaveTextContent('기본 정보 완료')
    expect(upload).toHaveTextContent('파일 업로드 완료')
    expect(masking).not.toHaveTextContent('완료')
  })

  it('puts the draft review last', () => {
    render(<HandoverProgress current={6} />)

    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('초안 확인')
  })
})
