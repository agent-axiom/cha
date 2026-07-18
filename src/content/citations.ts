import { history } from './history'
import { medicineClaims } from './medicine'
import { myths } from './mythology'
import { fermentationLayers, processSteps } from './process'
import { regions } from './regions'
import { sources } from './sources'
import type { SourcedEntry } from './types'

const siteContentEntries: readonly SourcedEntry[] = [
  ...history,
  ...myths,
  ...regions,
  ...processSteps,
  ...fermentationLayers,
  ...medicineClaims,
]

export const siteCitedSourceIds: ReadonlySet<string> = new Set(
  siteContentEntries.flatMap((entry) => entry.sourceIds),
)

export const citedSources = sources.filter((source) =>
  siteCitedSourceIds.has(source.id),
)

export const furtherReadingSources = sources.filter(
  (source) => !siteCitedSourceIds.has(source.id),
)
