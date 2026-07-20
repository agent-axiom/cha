import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sources } from '../content/sources'
import {
  citedSources,
  furtherReadingSources,
  siteCitedSourceIds,
  siteContentEntries,
} from '../content/citations'
import { formatSourceCount } from '../lib/formatSourceCount'
import { SourcesSection } from './SourcesSection'

describe('source bibliography', () => {
  it('derives cited IDs from every sourced site-content module', () => {
    const expectedIds = new Set(
      siteContentEntries.flatMap((entry) => entry.sourceIds),
    )

    expect(siteContentEntries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        'shennong-myth',
        'myth-wuhou',
        'puer-city',
        'fresh-leaf',
        'microbes',
        'caffeine-safety',
      ]),
    )

    expect([...siteCitedSourceIds].sort()).toEqual([...expectedIds].sort())
    expect(citedSources.map((source) => source.id).sort()).toEqual(
      [...expectedIds].sort(),
    )
  })

  it('declines source counts in Russian', () => {
    expect(formatSourceCount(1)).toBe('1 источник')
    expect(formatSourceCount(2)).toBe('2 источника')
    expect(formatSourceCount(4)).toBe('4 источника')
    expect(formatSourceCount(5)).toBe('5 источников')
    expect(formatSourceCount(11)).toBe('11 источников')
    expect(formatSourceCount(21)).toBe('21 источник')
    expect(formatSourceCount(22)).toBe('22 источника')
    expect(formatSourceCount(25)).toBe('25 источников')
  })

  it('partitions every visible source exactly once', () => {
    const citedIds = new Set(citedSources.map((source) => source.id))
    const furtherReadingIds = new Set(
      furtherReadingSources.map((source) => source.id),
    )

    expect([...citedIds].filter((id) => furtherReadingIds.has(id))).toEqual([])
    expect([...citedIds, ...furtherReadingIds].sort()).toEqual(
      sources.map((source) => source.id).sort(),
    )
  })

  it('renders accessible citation strata, groups, counts, and methodology', () => {
    const { container } = render(<SourcesSection />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Проверяйте нас по источникам' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Цитируются на этой странице' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Дальнейшее чтение' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Как мы работаем с источниками' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/18 июля 2026/i)).toBeInTheDocument()
    expect(screen.getByText(/доступность материалов меняется/i)).toBeInTheDocument()
    expect(
      screen.getByText(/ссылки на источники открываются в новой вкладке/i),
    ).toBeInTheDocument()
    expect(
      container.querySelectorAll('.source-group a'),
    ).toHaveLength(sources.length)

    const renderedIds = Array.from(
      container.querySelectorAll<HTMLElement>('[data-source-id]'),
    ).map((entry) => entry.dataset.sourceId)
    expect(renderedIds).toHaveLength(sources.length)
    expect([...renderedIds].sort()).toEqual(
      sources.map((source) => source.id).sort(),
    )

    const citedStratum = screen
      .getByRole('heading', { level: 3, name: 'Цитируются на этой странице' })
      .closest('details')
    const furtherReadingStratum = screen
      .getByRole('heading', { level: 3, name: 'Дальнейшее чтение' })
      .closest('details')
    expect(within(citedStratum as HTMLElement).getByText(formatSourceCount(citedSources.length))).toBeInTheDocument()
    expect(within(furtherReadingStratum as HTMLElement).getByText(formatSourceCount(furtherReadingSources.length))).toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { level: 4, name: /китайские исторические тексты, издания и копии/i }),
    ).not.toHaveLength(0)

    for (const id of ['dayi-history-1973', 'puer-wuhou', 'yunnan-agri-2018-shou']) {
      const entry = container.querySelector<HTMLElement>(`[data-source-id="${id}"]`)
      expect(entry).toHaveTextContent(/ретроспектива/i)
      expect(
        within(entry?.closest('details') as HTMLElement).getByRole('heading', {
          level: 4,
          name: /институциональные ретроспективы/i,
        }),
      ).toBeInTheDocument()
    }
    expect(container.querySelector('[data-source-id="zhao-facsimile-pku"]')).toHaveTextContent(/факсимиле/i)
    expect(container.querySelector('[data-source-id="ruan-dianbi-catalog"]')).toHaveTextContent(/каталог рукописи/i)
  })

  it('renders canonical document and evidence-role labels for disputed and institutional records', () => {
    const { container } = render(<SourcesSection />)

    expect(
      container.querySelector('[data-source-id="guangzhou-db4401-258-2024"]'),
    ).toHaveTextContent(/Стандарт[\s\S]*Институциональная ретроспектива/u)
    expect(
      container.querySelector('[data-source-id="unesco-jingmai"]'),
    ).toHaveTextContent(
      /Институциональная запись о наследии[\s\S]*Контекстная институциональная запись/u,
    )
    expect(
      container.querySelector('[data-source-id="ruan-puer-cha-ji-access"]'),
    ).toHaveTextContent(
      /Копия исторического текста[\s\S]*Спорная поздняя атрибуция/u,
    )
  })

  it('keeps semantic grouping and labels unchanged under a contradictory legacy class', () => {
    const source = sources.find(
      ({ id }) => id === 'guangzhou-db4401-258-2024',
    ) as (typeof sources)[number] & { publicationClass?: string }
    const baselineRender = render(<SourcesSection />)
    const baselineEntry = baselineRender.container.querySelector(
      '[data-source-id="guangzhou-db4401-258-2024"]',
    )
    const baseline = {
      group: baselineEntry?.closest('.source-group')
        ?.querySelector('[role="heading"][aria-level="4"]')?.textContent,
      labels: baselineEntry?.textContent,
    }
    baselineRender.unmount()

    source.publicationClass = 'provenance-only'
    try {
      const mutatedRender = render(<SourcesSection />)
      const mutatedEntry = mutatedRender.container.querySelector(
        '[data-source-id="guangzhou-db4401-258-2024"]',
      )
      expect({
        group: mutatedEntry?.closest('.source-group')
          ?.querySelector('[role="heading"][aria-level="4"]')?.textContent,
        labels: mutatedEntry?.textContent,
      }).toEqual(baseline)
    } finally {
      delete source.publicationClass
    }
  })

  it('opens cited strata and groups while keeping further reading collapsed', () => {
    render(<SourcesSection />)

    const citedHeading = screen.getByRole('heading', {
      level: 3,
      name: 'Цитируются на этой странице',
    })
    const furtherHeading = screen.getByRole('heading', {
      level: 3,
      name: 'Дальнейшее чтение',
    })
    const cited = citedHeading.closest('details')
    const further = furtherHeading.closest('details')
    expect(cited).toHaveAttribute('open')
    expect(further).not.toHaveAttribute('open')
    expect(cited?.querySelector('summary')).toHaveTextContent(/цитируются на этой странице/i)
    expect(further?.querySelector('summary')).toHaveTextContent(/дальнейшее чтение/i)

    const citedGroups = Array.from(
      cited?.querySelectorAll<HTMLDetailsElement>('.source-group') ?? [],
    )
    expect(citedGroups.length).toBeGreaterThan(0)
    expect(citedGroups.every((group) => group.open)).toBe(true)
    const furtherGroups = Array.from(
      further?.querySelectorAll<HTMLDetailsElement>('.source-group') ?? [],
    )
    expect(furtherGroups.length).toBeGreaterThan(0)
    expect(furtherGroups.every((group) => !group.open)).toBe(true)
  })

  it('uses phrasing content inside every native disclosure summary', () => {
    const { container } = render(<SourcesSection />)
    const summaries = Array.from(
      container.querySelectorAll('.source-stratum > summary, .source-group > summary'),
    )

    expect(summaries.length).toBeGreaterThan(0)
    expect(
      summaries.every((summary) =>
        Array.from(summary.children).every(({ tagName }) => tagName === 'SPAN'),
      ),
    ).toBe(true)
  })

  it('keeps internal source IDs out of reader-visible bibliography labels', () => {
    const { container } = render(<SourcesSection />)
    const visibleCopy = container.textContent ?? ''

    for (const source of sources) {
      expect(visibleCopy).not.toContain(`Ключ источника: ${source.id}`)
    }
  })
})
