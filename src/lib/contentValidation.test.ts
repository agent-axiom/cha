import { describe, expect, it } from 'vitest'
import rawSources from '../../book/data/sources.json'
import { history } from '../content/history'
import { medicineClaims } from '../content/medicine'
import { myths } from '../content/mythology'
import { fermentationLayers, processSteps } from '../content/process'
import { regions } from '../content/regions'
import {
  parseBookSources,
  selectSiteSources,
  sources,
  type BookSource,
} from '../content/sources'
import { findBrokenSourceRefs, findDuplicateIds } from './contentValidation'

function makeBookSource(overrides: Partial<BookSource> = {}): BookSource {
  return {
    id: 'visible-checked',
    title: 'Visible checked source',
    author: 'Test Author',
    year: '2026',
    href: 'https://example.com/visible-checked',
    group: 'guidance',
    origin: 'Test registry',
    note: 'Included by the site policy.',
    status: 'checked',
    siteVisible: true,
    bookUse: 'core',
    ...overrides,
  }
}

describe('content integrity', () => {
  it('selects only checked visible non-rejected sources and strips book metadata', () => {
    const selected = selectSiteSources([
      { ...makeBookSource(), edition: 'First' },
      makeBookSource({ id: 'candidate', status: 'candidate' }),
      makeBookSource({ id: 'hidden', siteVisible: false }),
      makeBookSource({ id: 'rejected', bookUse: 'rejected' }),
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

  it('requires the shared source registry to be an array of records', () => {
    expect(() => parseBookSources({})).toThrow(
      'source registry must be an array',
    )
    expect(() => parseBookSources([null])).toThrow(
      'source registry entry 0 must be an object',
    )
  })

  it('rejects missing or invalid public source fields with field context', () => {
    expect(() =>
      parseBookSources([{ ...makeBookSource(), author: undefined }]),
    ).toThrow(
      'source registry entry 0 field "author" must be a non-empty string',
    )
    expect(() =>
      parseBookSources([{ ...makeBookSource(), year: 2026 }]),
    ).toThrow(
      'source registry entry 0 field "year" must be a non-empty string',
    )
    expect(() =>
      parseBookSources([{ ...makeBookSource(), group: 'other' }]),
    ).toThrow(
      'source registry entry 0 field "group" must be one of: primary-asian, research-asian, research-western, guidance',
    )
  })

  it('rejects invalid source policy values with field context', () => {
    expect(() =>
      parseBookSources([{ ...makeBookSource(), status: 'draft' }]),
    ).toThrow(
      'source registry entry 0 field "status" must be one of: candidate, checked, rejected',
    )
    expect(() =>
      parseBookSources([{ ...makeBookSource(), siteVisible: 'yes' }]),
    ).toThrow(
      'source registry entry 0 field "siteVisible" must be a boolean',
    )
    expect(() =>
      parseBookSources([{ ...makeBookSource(), bookUse: 'optional' }]),
    ).toThrow(
      'source registry entry 0 field "bookUse" must be one of: core, supporting, access-copy, rejected',
    )
  })

  it('does not mutate registry input and returns new source objects', () => {
    const input = [
      { ...makeBookSource(), edition: 'First' },
      makeBookSource({ id: 'candidate', status: 'candidate' }),
    ]
    const originalInput = structuredClone(input)

    const selected = selectSiteSources(input)

    expect(input).toEqual(originalInput)
    expect(selected[0]).not.toBe(input[0])
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
    const actualIds = sources.map((source) => source.id)

    expect(actualIds).toHaveLength(expectedIds.length)
    expect(actualIds).toEqual(expectedIds)
  })

  it('links every factual claim to a known source', () => {
    expect(
      findBrokenSourceRefs(
        [
          ...history,
          ...medicineClaims,
          ...myths,
          ...processSteps,
          ...fermentationLayers,
          ...regions,
        ],
        sources,
      ),
    ).toEqual([])
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
