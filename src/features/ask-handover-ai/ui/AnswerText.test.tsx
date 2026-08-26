import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AnswerText } from './AnswerText'

describe('AnswerText', () => {
  it('renders markdown bold instead of showing the asterisks', () => {
    render(<AnswerText text="정산 마감은 **매월 15일**입니다." />)

    expect(screen.getByText('매월 15일').tagName).toBe('STRONG')
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument()
  })

  it('keeps line breaks from the answer', () => {
    const { container } = render(<AnswerText text={'첫째 줄\n둘째 줄'} />)

    expect(container.querySelectorAll('br')).toHaveLength(1)
    expect(container.textContent).toBe('첫째 줄둘째 줄')
  })

  it('leaves an unmatched asterisk pair alone', () => {
    const { container } = render(<AnswerText text="별표 하나 * 는 그대로" />)

    expect(container.textContent).toBe('별표 하나 * 는 그대로')
    expect(container.querySelector('strong')).toBeNull()
  })

  it('handles several bold spans in one line', () => {
    render(<AnswerText text="**첫째**와 **둘째**를 확인하세요" />)

    expect(screen.getByText('첫째').tagName).toBe('STRONG')
    expect(screen.getByText('둘째').tagName).toBe('STRONG')
  })
})
