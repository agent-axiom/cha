import { fireEvent, render, screen, within } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import { sourceById } from './content/sources'
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
    expect(screen.getByRole('link', { name: /сравнить два пути/i })).toHaveAttribute(
      'href',
      '#paths-overview',
    )
    expect(screen.getByRole('button', { name: /шэн/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /шу/i })).toBeInTheDocument()
  })

  it('places the novice reader contract in the hero with exactly three outcomes', () => {
    render(<App />)

    const hero = screen.getByRole('region', { name: /две судьбы одного листа/i })
    expect(within(hero).getByText(/онлайн-компаньон к книге «Пуэр\. Живая гора»/i)).toBeInTheDocument()
    expect(within(hero).getByText(/не требует специальной подготовки/i)).toBeInTheDocument()
    const outcomes = within(hero).getByRole('list', { name: /три результата чтения/i })
    expect(within(outcomes).getAllByRole('listitem')).toHaveLength(3)
    expect(outcomes).toHaveTextContent(/различать шэн и шу/i)
    expect(outcomes).toHaveTextContent(/легенду.*доказательств/i)
    expect(outcomes).toHaveTextContent(/утверждения о здоровье.*осторожно/i)
  })

  it('describes shou as a managed process rather than accelerated maturity', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /шу/i }))

    expect(screen.queryByText(/зрелость за недели/i)).not.toBeInTheDocument()
    expect(screen.getByText(/управляемое влажное преобразование.*недел/i)).toBeInTheDocument()
  })

  it('labels the path control as highlighting and keeps both craft branches present', () => {
    const { container } = render(<App />)

    const control = screen.getByRole('group', { name: /подсветить путь/i })
    fireEvent.click(within(control).getByRole('button', { name: /шу/i }))
    const craft = container.querySelector('#craft') as HTMLElement
    expect(within(craft).getByRole('list', { name: /этапы шэн/i })).toBeInTheDocument()
    expect(within(craft).getByRole('list', { name: /этапы шу/i })).toBeInTheDocument()
    expect(craft.querySelector('.process-path--sheng')).toHaveAttribute('data-highlighted', 'false')
    expect(craft.querySelector('.process-path--shou')).toHaveAttribute('data-highlighted', 'true')
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
      'paths-overview',
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
      'Перед началом · Два пути',
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

  it('puts a concise two-path overview immediately after the hero', () => {
    render(<App />)

    const main = screen.getByRole('main')
    const overview = main.children[1]
    expect(overview).toHaveAttribute('id', 'paths-overview')
    expect(within(overview as HTMLElement).getByRole('heading', {
      level: 2,
      name: /сначала — карта двух путей/i,
    })).toBeInTheDocument()
    expect(within(overview as HTMLElement).getByRole('heading', { level: 3, name: 'Шэн' })).toBeInTheDocument()
    expect(within(overview as HTMLElement).getByRole('heading', { level: 3, name: 'Шу' })).toBeInTheDocument()
    expect(overview).toHaveTextContent(/общая основа.*шайцин-маоча/i)
    expect(within(overview as HTMLElement).getByRole('link', {
      name: /перейти к полной технологической схеме/i,
    })).toHaveAttribute('href', '#craft')
  })

  it('connects the site, album, and brewing guide without claiming print readiness', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: /интерактивный сайт/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /подарочный альбом/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /краткий гид/i })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/готово к печати|print-ready/i)
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

  it('uses human-readable author, year, title, and locator labels for inline citations', () => {
    const { container } = render(<App />)

    const citations = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('.source-links a'),
    )
    expect(citations.length).toBeGreaterThan(0)
    for (const citation of citations) {
      const source = [...sourceById.values()].find(
        ({ href }) => href === citation.getAttribute('href'),
      )
      expect(source).toBeDefined()
      const visibleLabel = citation.firstChild?.textContent ?? ''
      expect(visibleLabel).toContain(source?.year)
      expect(visibleLabel).not.toContain(source?.id)
      if (source?.locator) expect(visibleLabel).toContain(source.locator)
      if (source?.claimId) expect(visibleLabel).not.toContain(source.claimId)
    }
  })
})
