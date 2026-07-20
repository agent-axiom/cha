import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { sourceById } from '../content/sources'
import { SourceCitation } from './SourceCitation'

describe('short human citation labels', () => {
  it('uses a literal word-boundary short title for a known long source', () => {
    const source = sourceById.get('jensen-2016')
    expect(source).toBeDefined()
    expect(source?.title).toBe(
      'Reduction of body fat and improved lipid profile associated with daily consumption of a Puer tea extract in a hyperlipidemic population: a randomized placebo-controlled trial',
    )

    render(source ? <SourceCitation source={source} /> : null)
    expect(screen.getByRole('link').firstChild?.textContent).toBe(
      'Gitte S. Jensen, Joni L. Beaman, Yi He, Zhixin Guo, Henry Sun · 2016 · Reduction of body fat and improved lipid profile associated with daily… · 367–376',
    )
  })

  it('preserves an already short title exactly', () => {
    const source = sourceById.get('benn-2015')
    render(source ? <SourceCitation source={source} /> : null)

    expect(screen.getByRole('link').firstChild?.textContent).toBe(
      'James A. Benn · 2015 · Tea in China: A Religious and Cultural History · 21–31, 200',
    )
  })

  it('keeps every rendered citation chip below 170 visible characters', () => {
    const { container } = render(<App />)
    const labels = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('.source-links a'),
      (citation) => citation.firstChild?.textContent ?? '',
    )

    expect(labels.length).toBeGreaterThan(0)
    expect(labels.every((label) => label.length < 170)).toBe(true)
  })
})
