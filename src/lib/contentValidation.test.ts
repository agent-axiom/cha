import { describe, expect, it } from 'vitest'
import rawSources from '../../book/data/sources.json'
import { history } from '../content/history'
import { medicineClaims } from '../content/medicine'
import { selectSiteSources, sources } from '../content/sources'
import type { Source } from '../content/types'
import { findBrokenSourceRefs, findDuplicateIds } from './contentValidation'

type TestBookSource = Source & {
  edition: string | null
  pages: string | null
  doi: string | null
  accessedAt: string
  status: 'candidate' | 'checked' | 'rejected'
  siteVisible: boolean
  bookUse: 'core' | 'supporting' | 'access-copy' | 'rejected'
}

const visibleCheckedSource: TestBookSource = {
  id: 'visible-checked',
  title: 'Visible checked source',
  author: 'Test Author',
  year: '2026',
  href: 'https://example.com/visible-checked',
  group: 'guidance',
  origin: 'Test registry',
  note: 'Included by the site policy.',
  edition: 'First',
  pages: '1–10',
  doi: '10.0000/example',
  accessedAt: '2026-07-17',
  status: 'checked',
  siteVisible: true,
  bookUse: 'core',
}

describe('content integrity', () => {
  it('selects only checked visible non-rejected sources and strips book metadata', () => {
    const selected = selectSiteSources([
      visibleCheckedSource,
      { ...visibleCheckedSource, id: 'candidate', status: 'candidate' },
      { ...visibleCheckedSource, id: 'hidden', siteVisible: false },
      { ...visibleCheckedSource, id: 'rejected', bookUse: 'rejected' },
    ])

    expect(selected).toEqual([
      {
        id: 'visible-checked',
        title: 'Visible checked source',
        author: 'Test Author',
        year: '2026',
        href: 'https://example.com/visible-checked',
        group: 'guidance',
        origin: 'Test registry',
        note: 'Included by the site policy.',
      },
    ])
  })

  it('derives the real site sources from the book registry policy', () => {
    const expectedIds = rawSources
      .filter(
        (source) =>
          source.siteVisible &&
          source.status === 'checked' &&
          source.bookUse !== 'rejected',
      )
      .map((source) => source.id)

    expect(expectedIds).toHaveLength(17)
    expect(sources.map((source) => source.id)).toEqual(expectedIds)
  })

  it('links every factual claim to a known source', () => {
    expect(findBrokenSourceRefs([...history, ...medicineClaims], sources)).toEqual([])
  })

  it('keeps every content id unique', () => {
    expect(findDuplicateIds([...history, ...medicineClaims])).toEqual([])
  })

  it('never presents preliminary medical evidence as treatment', () => {
    expect(
      medicineClaims.every(
        (claim) => claim.evidenceLevel < 5 || claim.kind === 'safety',
      ),
    ).toBe(true)
  })
})
