import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../App'

describe('native disclosure affordances', () => {
  it('adds a reader-visible, accessibility-hidden chevron to process, history, and source summaries', () => {
    const { container } = render(<App />)
    const summaries = Array.from(
      container.querySelectorAll<HTMLElement>([
        '.timeline__disclosure > summary',
        '.process-shared details > summary',
        '.process-path details > summary',
        '.source-stratum > summary',
        '.source-group > summary',
      ].join(', ')),
    )

    expect(summaries.length).toBeGreaterThan(0)
    for (const summary of summaries) {
      const chevron = summary.querySelector(':scope > .disclosure-chevron')
      expect(chevron).toHaveAttribute('aria-hidden', 'true')
    }
  })
})
