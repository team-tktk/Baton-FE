import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HandoverProgress } from './HandoverProgress'

describe('HandoverProgress', () => {
  it('uses the six-step flow for the interview stage', () => {
    render(<HandoverProgress current={3} />)

    expect(screen.getByText('3 / 6')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'AI 질문 단계' })).toHaveAttribute('aria-valuemax', '6')
  })

  it('labels the completed handover as the sixth stage', () => {
    render(<HandoverProgress current={6} />)

    expect(screen.getByText('6 / 6')).toBeInTheDocument()
    expect(screen.getByText('전달 완료')).toBeInTheDocument()
  })
})
