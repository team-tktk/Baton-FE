import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { getPrimaryHandover } from '@/test/handoverFactory'

import { HandoverDocument } from './HandoverDocument'

describe('HandoverDocument', () => {
  it('emits trimmed editable document fields on blur', async () => {
    const onFieldChange = vi.fn()
    render(<HandoverDocument handover={await getPrimaryHandover()} mode="edit" onFieldChange={onFieldChange} />)

    const scope = screen.getByLabelText('인계 범위 편집')
    scope.textContent = '  프로모션 운영과 주문 관리  '
    fireEvent.blur(scope)

    expect(onFieldChange).toHaveBeenCalledWith('scope', '프로모션 운영과 주문 관리')
  })
})
