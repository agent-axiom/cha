import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SiteHeader } from './SiteHeader'

describe('SiteHeader', () => {
  it('provides an explicit mobile contents control and closes after navigation', () => {
    render(<SiteHeader />)

    const control = screen.getByRole('button', { name: 'Содержание' })
    const navigation = screen.getByRole('navigation', { name: 'Разделы' })

    expect(control).toHaveAttribute('aria-controls', 'site-sections')
    expect(control).toHaveAttribute('aria-expanded', 'false')
    expect(navigation).toHaveAttribute('id', 'site-sections')
    expect(navigation).toHaveAttribute('data-open', 'false')

    fireEvent.click(control)
    expect(control).toHaveAttribute('aria-expanded', 'true')
    expect(navigation).toHaveAttribute('data-open', 'true')

    fireEvent.click(screen.getByRole('link', { name: 'Время' }))
    expect(control).toHaveAttribute('aria-expanded', 'false')
    expect(navigation).toHaveAttribute('data-open', 'false')
  })
})
