import rawSources from '../../book/data/sources.json'
import rawSourceTaxonomy from '../../book/data/source-taxonomy.json'
import type {
  Source,
  SourceDocumentClass,
  SourceEvidenceRole,
} from './types'

const sourceGroups = [
  'primary-asian',
  'research-asian',
  'research-western',
  'guidance',
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

interface SourceTaxonomyEntry<Value extends string> {
  id: Value
  readerLabel: string
}

interface SourceTaxonomy {
  documentClasses: SourceTaxonomyEntry<SourceDocumentClass>[]
  evidenceRoles: SourceTaxonomyEntry<SourceEvidenceRole>[]
  allowedPairs: Array<{
    documentClass: SourceDocumentClass
    evidenceRole: SourceEvidenceRole
  }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseTaxonomyEntries<Value extends string>(
  value: unknown,
  field: string,
): SourceTaxonomyEntry<Value>[] {
  if (!Array.isArray(value)) throw new Error(`source taxonomy field "${field}" must be an array`)
  const seen = new Set<string>()
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`source taxonomy ${field} entry ${index} must be an object`)
    }
    const id = entry.id
    const readerLabel = entry.readerLabel
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error(`source taxonomy ${field} entry ${index} requires an id`)
    }
    if (seen.has(id)) throw new Error(`source taxonomy ${field} has duplicate id: ${id}`)
    seen.add(id)
    if (typeof readerLabel !== 'string' || readerLabel.trim() === '') {
      throw new Error(`source taxonomy ${field} entry ${index} requires a readerLabel`)
    }
    return { id: id as Value, readerLabel }
  })
}

function parseSourceTaxonomy(input: unknown): SourceTaxonomy {
  if (!isRecord(input)) throw new Error('source taxonomy must be an object')
  const documentClasses = parseTaxonomyEntries<SourceDocumentClass>(
    input.documentClasses,
    'documentClasses',
  )
  const evidenceRoles = parseTaxonomyEntries<SourceEvidenceRole>(
    input.evidenceRoles,
    'evidenceRoles',
  )
  const documentClassIds = new Set(documentClasses.map(({ id }) => id))
  const evidenceRoleIds = new Set(evidenceRoles.map(({ id }) => id))
  if (!Array.isArray(input.allowedPairs)) {
    throw new Error('source taxonomy field "allowedPairs" must be an array')
  }
  const pairIds = new Set<string>()
  const allowedPairs = input.allowedPairs.map((pair, index) => {
    if (!isRecord(pair)) {
      throw new Error(`source taxonomy allowedPairs entry ${index} must be an object`)
    }
    const documentClass = pair.documentClass
    const evidenceRole = pair.evidenceRole
    if (
      typeof documentClass !== 'string'
      || !documentClassIds.has(documentClass as SourceDocumentClass)
    ) {
      throw new Error(`source taxonomy allowedPairs entry ${index} has unknown documentClass`)
    }
    if (
      typeof evidenceRole !== 'string'
      || !evidenceRoleIds.has(evidenceRole as SourceEvidenceRole)
    ) {
      throw new Error(`source taxonomy allowedPairs entry ${index} has unknown evidenceRole`)
    }
    const pairId = `${documentClass}/${evidenceRole}`
    if (pairIds.has(pairId)) {
      throw new Error(`source taxonomy has duplicate allowed pair: ${pairId}`)
    }
    pairIds.add(pairId)
    return {
      documentClass: documentClass as SourceDocumentClass,
      evidenceRole: evidenceRole as SourceEvidenceRole,
    }
  })
  return { documentClasses, evidenceRoles, allowedPairs }
}

export const sourceTaxonomy = parseSourceTaxonomy(rawSourceTaxonomy)
const sourceDocumentClasses = sourceTaxonomy.documentClasses.map(({ id }) => id)
const sourceEvidenceRoles = sourceTaxonomy.evidenceRoles.map(({ id }) => id)
const allowedSourcePairs = new Set(
  sourceTaxonomy.allowedPairs.map(
    ({ documentClass, evidenceRole }) => `${documentClass}/${evidenceRole}`,
  ),
)
export const sourceDocumentClassLabels = new Map(
  sourceTaxonomy.documentClasses.map(({ id, readerLabel }) => [id, readerLabel]),
)
export const sourceEvidenceRoleLabels = new Map(
  sourceTaxonomy.evidenceRoles.map(({ id, readerLabel }) => [id, readerLabel]),
)

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

function readOptionalNonBlankString(
  source: Record<string, unknown>,
  index: number,
  field: 'locator' | 'claimId' | 'pages',
): string | undefined {
  const value = source[field]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `source registry entry ${index} field "${field}" must be a non-empty string when present`,
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

    const documentClass = readOneOf(
      source,
      index,
      'documentClass',
      sourceDocumentClasses,
    )
    const evidenceRole = readOneOf(
      source,
      index,
      'evidenceRole',
      sourceEvidenceRoles,
    )
    const pairId = `${documentClass}/${evidenceRole}`
    if (!allowedSourcePairs.has(pairId)) {
      throw new Error(
        `source registry entry ${index} has unsupported documentClass/evidenceRole pair: ${pairId}`,
      )
    }
    const locator = readOptionalNonBlankString(source, index, 'locator')
      ?? readOptionalNonBlankString(source, index, 'pages')
    const claimId = readOptionalNonBlankString(source, index, 'claimId')
    return {
      id: readNonBlankString(source, index, 'id'),
      title: readNonBlankString(source, index, 'title'),
      author: readNonBlankString(source, index, 'author'),
      year: readNonBlankString(source, index, 'year'),
      href: readNonBlankString(source, index, 'href'),
      group: readOneOf(source, index, 'group', sourceGroups),
      documentClass,
      evidenceRole,
      origin: readNonBlankString(source, index, 'origin'),
      note: readNonBlankString(source, index, 'note'),
      status: readOneOf(source, index, 'status', sourceStatuses),
      siteVisible: readBoolean(source, index, 'siteVisible'),
      bookUse: readOneOf(source, index, 'bookUse', sourceBookUses),
      ...(locator ? { locator } : {}),
      ...(claimId ? { claimId } : {}),
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
    .map(
      ({
        id,
        title,
        author,
        year,
        href,
        group,
        documentClass,
        evidenceRole,
        origin,
        note,
        locator,
        claimId,
      }) => ({
        id,
        title,
        author,
        year,
        href,
        group,
        documentClass,
        evidenceRole,
        origin,
        note,
        ...(locator ? { locator } : {}),
        ...(claimId ? { claimId } : {}),
      }),
    )
}

export const sources: Source[] = selectSiteSources(rawSources)

export const sourceById = new Map(sources.map((source) => [source.id, source]))
