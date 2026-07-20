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

function makeBookSource(
  overrides: Partial<BookSource> & Record<string, unknown> = {},
): BookSource {
  return {
    id: 'visible-checked',
    title: 'Visible checked source',
    author: 'Test Author',
    year: '2026',
    href: 'https://example.com/visible-checked',
    group: 'guidance',
    publicationClass: 'standard-guidance',
    documentClass: 'standard',
    evidenceRole: 'normative-standard',
    origin: 'Test registry',
    note: 'Included by the site policy.',
    status: 'checked',
    siteVisible: true,
    bookUse: 'core',
    ...overrides,
  } as BookSource
}

describe('content integrity', () => {
  it('selects only checked visible non-rejected sources and keeps semantic source fields', () => {
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
        citationTitle: 'Visible checked source',
        author: 'Test Author',
        year: '2026',
        href: 'https://example.com/visible-checked',
        group: 'guidance',
        documentClass: 'standard',
        evidenceRole: 'normative-standard',
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
    expect(() =>
      parseBookSources([{ ...makeBookSource(), documentClass: 'misc' }]),
    ).toThrow('source registry entry 0 field "documentClass" must be one of:')
    expect(() =>
      parseBookSources([{ ...makeBookSource(), evidenceRole: 'misc' }]),
    ).toThrow('source registry entry 0 field "evidenceRole" must be one of:')
  })

  it('rejects document-class and evidence-role pairs outside the canonical taxonomy', () => {
    expect(() =>
      parseBookSources([
        makeBookSource({
          documentClass: 'catalog-record',
          evidenceRole: 'primary-text',
        }),
      ]),
    ).toThrow(
      'source registry entry 0 has unsupported documentClass/evidenceRole pair: catalog-record/primary-text',
    )
  })

  it('ignores contradictory legacy publication classes', () => {
    const source = makeBookSource()
    const baseline = selectSiteSources([source])
    const mutated = selectSiteSources([
      { ...source, publicationClass: 'provenance-only' },
    ])

    expect(mutated).toEqual(baseline)
    expect(mutated[0]).not.toHaveProperty('publicationClass')
  })

  it('preserves optional locator and claim relations while rejecting blank values', () => {
    const [selected] = selectSiteSources([
      makeBookSource({
        pages: 'с. 21–31, 200',
        claimId: 'hist-shennong-legend',
      }),
    ])

    expect(selected).toMatchObject({
      locator: 'с. 21–31, 200',
      claimId: 'hist-shennong-legend',
    })
    expect(() =>
      parseBookSources([makeBookSource({ locator: '   ' })]),
    ).toThrow('field "locator" must be a non-empty string when present')
    expect(() =>
      parseBookSources([makeBookSource({ claimId: '' })]),
    ).toThrow('field "claimId" must be a non-empty string when present')
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

  it('pairs preliminary medical evidence with explicit product and inference limits', () => {
    const preliminaryTypes = new Set(['chemistry', 'preclinical', 'human'])
    const preliminaryClaims = medicineClaims.filter((claim) =>
      preliminaryTypes.has(claim.evidenceType),
    )

    expect(new Set(preliminaryClaims.map((claim) => claim.evidenceType))).toEqual(
      preliminaryTypes,
    )
    expect(
      preliminaryClaims.every(
        (claim) =>
          claim.kind === 'research' &&
          claim.productForm.trim().length > 0 &&
          claim.applicability.trim().length > 0 &&
          claim.limitations.trim().length > 0,
      ),
    ).toBe(true)
  })
})
