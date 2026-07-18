import { render, screen, within } from '@testing-library/react'
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

  it('orders the story and navigation as a learning path', () => {
    render(<App />)

    const mainSectionIds = Array.from(screen.getByRole('main').children).map(
      (section) => section.id,
    )
    expect(mainSectionIds).toEqual([
      'top',
      'history',
      'myths',
      'geography',
      'craft',
      'science',
      'medicine',
      'sources',
    ])
    expect(
      Array.from(screen.getByRole('main').children)
        .slice(1)
        .map((section) => section.querySelector('.eyebrow')?.textContent),
    ).toEqual([
      '01 · Корни',
      '02 · Мифология',
      '03 · Терруар',
      '04 · Ремесло',
      '05 · Взаимодействующая система',
      '06 · Медицина',
      '07 · Библиография',
    ])

    const navigationLinks = within(
      screen.getByRole('navigation', { name: /разделы/i }),
    ).getAllByRole('link')
    expect(
      navigationLinks.map((link) => ({
        label: link.textContent,
        href: link.getAttribute('href'),
      })),
    ).toEqual([
      { label: 'Время', href: '#history' },
      { label: 'Мифология', href: '#myths' },
      { label: 'Горы', href: '#geography' },
      { label: 'Два пути', href: '#craft' },
      { label: 'Водуй', href: '#science' },
      { label: 'Медицина', href: '#medicine' },
      { label: 'Источники', href: '#sources' },
    ])
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
