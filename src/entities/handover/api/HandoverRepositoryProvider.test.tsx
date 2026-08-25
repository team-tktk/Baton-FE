import type { PropsWithChildren } from 'react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MockHandoverRepository } from './mock/MockHandoverRepository'
import { HandoverRepositoryProvider } from './HandoverRepositoryProvider'
import { useHandoverRepository } from './useHandoverRepository'

describe('HandoverRepositoryProvider', () => {
  it('fails clearly when the provider is missing', () => {
    expect(() => renderHook(() => useHandoverRepository())).toThrow(
      'HandoverRepositoryProvider is missing',
    )
  })

  it('returns the exact repository injected by the app', () => {
    const repository = new MockHandoverRepository()
    const wrapper = ({ children }: PropsWithChildren) => (
      <HandoverRepositoryProvider repository={repository}>
        {children}
      </HandoverRepositoryProvider>
    )

    const { result } = renderHook(() => useHandoverRepository(), { wrapper })

    expect(result.current).toBe(repository)
  })
})
