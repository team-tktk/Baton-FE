import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AnalysisProgress } from './AnalysisProgress'

afterEach(() => vi.useRealTimers())

describe('AnalysisProgress', () => {
  it('completes once after 7.2 seconds', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<AnalysisProgress fileCount={3} onComplete={onComplete} />)

    await vi.advanceTimersByTimeAsync(7_199)
    expect(onComplete).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(onComplete).toHaveBeenCalledOnce()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('cancels completion after unmount', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    const view = render(<AnalysisProgress fileCount={2} onComplete={onComplete} />)

    view.unmount()
    await vi.advanceTimersByTimeAsync(7_200)

    expect(onComplete).not.toHaveBeenCalled()
  })
})
