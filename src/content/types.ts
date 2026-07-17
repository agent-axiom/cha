export type SourceGroup =
  | 'primary-asian'
  | 'research-asian'
  | 'research-western'
  | 'guidance'

export interface Source {
  id: string
  title: string
  author: string
  year: string
  href: string
  group: SourceGroup
  origin: string
  note: string
}

export type HistoryKind = 'legend' | 'source' | 'modern'

export interface HistoryEntry {
  id: string
  sortYear: number
  date: string
  title: string
  summary: string
  detail: string
  kind: HistoryKind
  sourceIds: string[]
}

export type TeaPath = 'sheng' | 'shou'

export interface ProcessStep {
  id: string
  path: TeaPath
  order: number
  title: string
  chinese?: string
  summary: string
  transformation: string
  sourceIds: string[]
}

export type MedicalKind = 'historical' | 'research' | 'safety'

export interface MedicalClaim {
  id: string
  title: string
  summary: string
  evidenceLevel: 1 | 2 | 3 | 4 | 5
  evidenceLabel: string
  kind: MedicalKind
  sourceIds: string[]
}

export interface MythEntry {
  id: string
  title: string
  chinese: string
  story: string
  reading: string
  sourceIds: string[]
}

export interface Region {
  id: string
  name: string
  chinese: string
  category: 'city' | 'mountain' | 'landscape'
  x: number
  y: number
  description: string
  sourceIds: string[]
}

export interface FermentationLayer {
  id: 'microbes' | 'climate' | 'chemistry'
  title: string
  eyebrow: string
  description: string
  sourceIds: string[]
}

export interface SourcedEntry {
  id: string
  sourceIds: string[]
}
