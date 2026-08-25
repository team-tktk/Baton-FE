import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppHeader } from './AppHeader'

describe('AppHeader', () => {
  it('uses the BATON brand', () => {
    render(<MemoryRouter><AppHeader /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'BATON 홈' })).toBeInTheDocument()
    expect(screen.getByText('BATON')).toBeInTheDocument()
  })
})
