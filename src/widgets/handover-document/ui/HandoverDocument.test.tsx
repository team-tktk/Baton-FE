import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { primaryHandoverFixture } from '@/entities/handover/api/mock/fixtures/handovers'

import { HandoverDocument } from './HandoverDocument'

describe('HandoverDocument', () => {
  it('emits trimmed editable document fields on blur', () => {
    const onFieldChange = vi.fn()
    render(<HandoverDocument handover={primaryHandoverFixture} mode="edit" onFieldChange={onFieldChange} />)

    const scope = screen.getByLabelText('인계 범위 편집')
    scope.textContent = '  프로모션 운영과 주문 관리  '
    fireEvent.blur(scope)

    expect(onFieldChange).toHaveBeenCalledWith('scope', '프로모션 운영과 주문 관리')
  })
})
