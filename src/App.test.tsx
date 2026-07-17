import { render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('application shell', () => {
  it('introduces the story and exposes its main navigation', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /две судьбы одного листа/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /разделы/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /перейти к истории/i })).toHaveAttribute(
      'href',
      '#history',
    )
    expect(screen.getByRole('button', { name: /шэн/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /шу/i })).toBeInTheDocument()
  })

  it('lets keyboard users skip directly to the main story', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: /перейти к основному содержанию/i })).toHaveAttribute(
      'href',
      '#content',
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'content')
  })

  it('has no automatically detectable accessibility violations', async () => {
    render(<App />)

    const results = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })

    expect(results.violations).toEqual([])
  })
})
