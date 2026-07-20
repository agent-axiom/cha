import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../App'

describe('inline glossary affordances', () => {
  it('defines specialist terms at first use with keyboard-operable controls', () => {
    render(<App />)

    for (const term of [
      'хэй ча',
      'шацин',
      'шайцин',
      'таксон',
      'суррогатный исход',
    ]) {
      expect(screen.getByRole('button', { name: `Определение: ${term}` })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    }

    const control = screen.getByRole('button', { name: 'Определение: хэй ча' })
    fireEvent.click(control)
    expect(control).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('note', { name: 'Определение термина «хэй ча»' })).toHaveTextContent(
      /китайская категория тёмных чаёв/i,
    )
  })
})
