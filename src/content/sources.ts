import rawSources from '../../book/data/sources.json'
import type { Source } from './types'

type BookSource = Source & {
  status: 'candidate' | 'checked' | 'rejected'
  siteVisible: boolean
  bookUse: 'core' | 'supporting' | 'access-copy' | 'rejected'
}

export function selectSiteSources(input: BookSource[]): Source[] {
  return input
    .filter(
      (source) =>
        source.siteVisible &&
        source.status === 'checked' &&
        source.bookUse !== 'rejected',
    )
    .map(({ id, title, author, year, href, group, origin, note }) => ({
      id,
      title,
      author,
      year,
      href,
      group,
      origin,
      note,
    }))
}

export const sources: Source[] = selectSiteSources(
  rawSources as unknown as BookSource[],
)

export const sourceById = new Map(sources.map((source) => [source.id, source]))
