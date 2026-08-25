import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HandoverProgress } from './HandoverProgress'

describe('HandoverProgress', () => {
  it('uses the five-step flow for the interview stage', () => {
    render(<HandoverProgress current={3} />)

    expect(screen.getByText('3 / 5')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'AI 질문 단계' })).toHaveAttribute('aria-valuemax', '5')
  })

  it('labels the completed handover as the fifth stage', () => {
    render(<HandoverProgress current={5} />)

    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByText('전달 완료')).toBeInTheDocument()
  })
})
