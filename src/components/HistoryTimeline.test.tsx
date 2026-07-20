import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sourceById } from '../content/sources'
import type { Source } from '../content/types'
import { HistoryTimeline } from './HistoryTimeline'

describe('HistoryTimeline', () => {
  it('keeps legends, documents and modern knowledge visibly distinct', () => {
    render(<HistoryTimeline />)

    expect(screen.getAllByText('Легенда').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Письменный источник').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Поздняя реконструкция').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Современное знание').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/мань шу/i).length).toBeGreaterThan(0)
  })

  it('shows both institutional branches of the modern shou chronology', () => {
    render(<HistoryTimeline />)

    expect(
      screen.getByRole('heading', { name: /гуандунская линия шу/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/техническую группу.*1955/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /юньнаньская адаптация шу/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/куньмин.*1973/i)).toBeInTheDocument()
  })

  it('uses a human citation label and keeps claim relations out of visible text', () => {
    const source = sourceById.get('benn-2015') as Source & { claimId?: string }
    source.claimId = 'hist-shennong-legend'

    try {
      render(<HistoryTimeline />)

      const citation = screen.getAllByRole('link', {
        name: /James A\. Benn · 2015 · Tea in China: A Religious and Cultural History · 21–31, 200/i,
      })[0]
      expect(citation).toHaveAttribute('data-claim-id', 'hist-shennong-legend')
      expect(citation).not.toHaveTextContent('hist-shennong-legend')
    } finally {
      delete source.claimId
    }
  })

  it('keeps date, title, and summary outside a closed details disclosure', () => {
    const { container } = render(<HistoryTimeline />)

    const entries = Array.from(container.querySelectorAll<HTMLElement>('.timeline__item'))
    expect(entries).not.toHaveLength(0)
    for (const entry of entries) {
      const article = entry.querySelector('article')
      const disclosure = entry.querySelector('details')
      expect(article).not.toBeNull()
      expect(disclosure).not.toBeNull()
      expect(disclosure).not.toHaveAttribute('open')
      expect(article?.querySelector(':scope > .timeline__meta')).not.toBeNull()
      expect(article?.querySelector(':scope > h3')).not.toBeNull()
      expect(article?.querySelector(':scope > .timeline__summary')).not.toBeNull()
      expect(disclosure?.querySelector('.timeline__detail')).not.toBeNull()
      expect(disclosure?.querySelector('.source-links')).not.toBeNull()
      expect(within(disclosure as HTMLElement).getByText(/подробнее и источники/i)).toBeInTheDocument()
    }
  })

  it('removes internal draft wording from the disputed Ruan retrospective', () => {
    render(<HistoryTimeline />)

    expect(screen.queryByText(/draft/i)).not.toBeInTheDocument()
    expect(screen.getByText(/спорно приписываем.*поздн.*ретроспектив/i)).toBeInTheDocument()
  })
})
