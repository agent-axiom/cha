import type { Source, SourcedEntry } from '../content/types'

export function findBrokenSourceRefs(
  entries: SourcedEntry[],
  sources: Source[],
): string[] {
  const sourceIds = new Set(sources.map((source) => source.id))

  return entries.flatMap((entry) =>
    entry.sourceIds
      .filter((sourceId) => !sourceIds.has(sourceId))
      .map((sourceId) => `${entry.id}:${sourceId}`),
  )
}

export function findDuplicateIds(entries: Pick<SourcedEntry, 'id'>[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  entries.forEach((entry) => {
    if (seen.has(entry.id)) {
      duplicates.add(entry.id)
    }
    seen.add(entry.id)
  })

  return [...duplicates]
}
