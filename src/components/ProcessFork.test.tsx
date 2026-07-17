import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProcessFork } from './ProcessFork'

describe('ProcessFork', () => {
  it('keeps wet piling exclusive to the shou path', () => {
    render(<ProcessFork selectedPath="sheng" />)

    const sheng = screen.getByRole('list', { name: /этапы шэн/i })
    const shou = screen.getByRole('list', { name: /этапы шу/i })

    expect(within(sheng).queryByText(/влажное кучевание/i)).not.toBeInTheDocument()
    expect(within(shou).getByText(/влажное кучевание/i)).toBeInTheDocument()
  })
})

