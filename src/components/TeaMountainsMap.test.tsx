import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TeaMountainsMap } from './TeaMountainsMap'

describe('TeaMountainsMap', () => {
  it('reveals a sourced field note when a mountain is selected', async () => {
    const user = userEvent.setup()
    render(<TeaMountainsMap />)

    await user.click(screen.getByRole('button', { name: /ибан/i }))

    expect(screen.getByRole('heading', { name: /ибан/i })).toBeInTheDocument()
    expect(screen.getByText(/исторический центр производства/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /чжао сюэминь/i })).toBeInTheDocument()
  })
})
