import rawSources from '../../book/data/sources.json'
import type { Source } from './types'

const sourceGroups = [
  'primary-asian',
  'research-asian',
  'research-western',
  'guidance',
] as const
const sourcePublicationClasses = [
  'primary-text',
  'facsimile',
  'critical-edition',
  'print-edition-catalog',
  'manuscript-catalog',
  'access-copy',
  'retrospective',
  'research',
  'standard-guidance',
  'trial-registration',
  'provenance-only',
] as const
const sourceStatuses = ['candidate', 'checked', 'rejected'] as const
const sourceBookUses = [
  'core',
  'supporting',
  'access-copy',
  'rejected',
] as const

export type BookSource = Source & {
  status: 'candidate' | 'checked' | 'rejected'
  siteVisible: boolean
  bookUse: 'core' | 'supporting' | 'access-copy' | 'rejected'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNonBlankString(
  source: Record<string, unknown>,
  index: number,
  field: keyof Source,
): string {
  const value = source[field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `source registry entry ${index} field "${field}" must be a non-empty string`,
    )
  }
  return value
}

function isOneOf<Value extends string>(
  value: string,
  allowed: readonly Value[],
): value is Value {
  return allowed.some((allowedValue) => allowedValue === value)
}

function readOneOf<Value extends string>(
  source: Record<string, unknown>,
  index: number,
  field: string,
  allowed: readonly Value[],
): Value {
  const value = source[field]
  if (typeof value !== 'string' || !isOneOf(value, allowed)) {
    throw new Error(
      `source registry entry ${index} field "${field}" must be one of: ${allowed.join(', ')}`,
    )
  }
  return value
}

function readBoolean(
  source: Record<string, unknown>,
  index: number,
  field: string,
): boolean {
  const value = source[field]
  if (typeof value !== 'boolean') {
    throw new Error(
      `source registry entry ${index} field "${field}" must be a boolean`,
    )
  }
  return value
}

export function parseBookSources(input: unknown): BookSource[] {
  if (!Array.isArray(input)) {
    throw new Error('source registry must be an array')
  }

  return input.map((source, index) => {
    if (!isRecord(source)) {
      throw new Error(`source registry entry ${index} must be an object`)
    }

    return {
      id: readNonBlankString(source, index, 'id'),
      title: readNonBlankString(source, index, 'title'),
      author: readNonBlankString(source, index, 'author'),
      year: readNonBlankString(source, index, 'year'),
      href: readNonBlankString(source, index, 'href'),
      group: readOneOf(source, index, 'group', sourceGroups),
      publicationClass: readOneOf(
        source,
        index,
        'publicationClass',
        sourcePublicationClasses,
      ),
      origin: readNonBlankString(source, index, 'origin'),
      note: readNonBlankString(source, index, 'note'),
      status: readOneOf(source, index, 'status', sourceStatuses),
      siteVisible: readBoolean(source, index, 'siteVisible'),
      bookUse: readOneOf(source, index, 'bookUse', sourceBookUses),
    }
  })
}

export function selectSiteSources(input: unknown): Source[] {
  return parseBookSources(input)
    .filter(
      (source) =>
        source.siteVisible &&
        source.status === 'checked' &&
        source.bookUse !== 'rejected',
    )
    .map(({ id, title, author, year, href, group, publicationClass, origin, note }) => ({
      id,
      title,
      author,
      year,
      href,
      group,
      publicationClass,
      origin,
      note,
    }))
}

export const sources: Source[] = selectSiteSources(rawSources)

export const sourceById = new Map(sources.map((source) => [source.id, source]))
