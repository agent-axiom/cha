import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { InlineDefinition } from './InlineDefinition'

describe('inline glossary affordances', () => {
  it('defines specialist terms at first use with keyboard-operable controls', async () => {
    const user = userEvent.setup()
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
    await user.click(control)
    expect(control).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('note', { name: 'Определение термина «хэй ча»' })).toHaveTextContent(
      /китайская категория тёмных чаёв/i,
    )
  })

  it('keeps one definition open and dismisses it by Escape, outside pointer, or outside focus', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <InlineDefinition term="первый термин" definition="Первое определение." />
        <InlineDefinition term="второй термин" definition="Второе определение." />
        <button type="button">Внешняя кнопка</button>
      </div>,
    )

    const first = screen.getByRole('button', { name: 'Определение: первый термин' })
    const second = screen.getByRole('button', { name: 'Определение: второй термин' })
    const outside = screen.getByRole('button', { name: 'Внешняя кнопка' })

    await user.click(first)
    await user.click(second)
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(second).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('note', { name: 'Определение термина «первый термин»' })).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(second).toHaveAttribute('aria-expanded', 'false')
    expect(second).toHaveFocus()

    await user.click(first)
    await user.click(outside)
    expect(first).toHaveAttribute('aria-expanded', 'false')

    await user.click(first)
    await user.tab()
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(second).toHaveFocus()
  })
})
