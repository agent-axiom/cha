import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fermentationLayers, processSteps } from '../content/process'
import { history } from '../content/history'
import { medicineClaims } from '../content/medicine'
import { myths } from '../content/mythology'
import { regions } from '../content/regions'
import { sources } from '../content/sources'
import {
  citedSources,
  furtherReadingSources,
  siteCitedSourceIds,
} from '../content/citations'
import { SourcesSection } from './SourcesSection'

describe('source bibliography', () => {
  it('derives cited IDs from every sourced site-content module', () => {
    const expectedIds = new Set(
      [
        ...history,
        ...myths,
        ...regions,
        ...processSteps,
        ...fermentationLayers,
        ...medicineClaims,
      ].flatMap((entry) => entry.sourceIds),
    )

    expect([...siteCitedSourceIds].sort()).toEqual([...expectedIds].sort())
    expect(citedSources.map((source) => source.id).sort()).toEqual(
      [...expectedIds].sort(),
    )
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
      screen.getByRole('heading', { level: 3, name: 'Цитируются на этой странице' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Дальнейшее чтение' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Как мы работаем с источниками' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/18 июля 2026/i)).toBeInTheDocument()

    const renderedIds = Array.from(
      container.querySelectorAll<HTMLElement>('[data-source-id]'),
    ).map((entry) => entry.dataset.sourceId)
    expect(renderedIds).toHaveLength(sources.length)
    expect([...renderedIds].sort()).toEqual(
      sources.map((source) => source.id).sort(),
    )

    expect(screen.getByText(`${citedSources.length} источников`)).toBeInTheDocument()
    expect(
      screen.getByText(`${furtherReadingSources.length} источников`),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { level: 4, name: /китайские первоисточники/i }),
    ).not.toHaveLength(0)
  })
})
