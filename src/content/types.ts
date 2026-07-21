export type SourceGroup =
  | 'primary-asian'
  | 'research-asian'
  | 'research-western'
  | 'guidance'

export type SourceDocumentClass =
  | 'research-publication'
  | 'historical-access-copy'
  | 'critical-edition'
  | 'facsimile'
  | 'catalog-record'
  | 'manuscript-catalog'
  | 'community-excerpt'
  | 'institutional-record'
  | 'corporate-record'
  | 'standard'
  | 'guidance'
  | 'institutional-heritage-record'
  | 'trial-registration'

export type SourceEvidenceRole =
  | 'primary-text'
  | 'textual-witness'
  | 'catalog-provenance'
  | 'disputed-retrospective-attribution'
  | 'research-evidence'
  | 'institutional-retrospective'
  | 'corporate-retrospective'
  | 'normative-standard'
  | 'safety-guidance'
  | 'contextual-institutional-record'
  | 'trial-registry-record'
  | 'provenance-only'

export interface Source {
  id: string
  title: string
  citationTitle: string
  author: string
  year: string
  href: string
  group: SourceGroup
  documentClass: SourceDocumentClass
  evidenceRole: SourceEvidenceRole
  origin: string
  note: string
  locator?: string
  claimId?: string
}

export type HistoryKind = 'legend' | 'source' | 'retrospective' | 'modern'

export interface HistoryEntry {
  id: string
  sortYear: number | null
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
  path: TeaPath | 'shared'
  order: number
  title: string
  chinese?: string
  summary: string
  transformation: string
  sourceIds: string[]
}

export type MedicalKind = 'historical' | 'research' | 'safety'

export type MedicalEvidenceType =
  | 'historical'
  | 'chemistry'
  | 'preclinical'
  | 'human'
  | 'guidance'
  | 'quality-control'

export interface MedicalClaim {
  id: string
  title: string
  summary: string
  evidenceType: MedicalEvidenceType
  evidenceLabel: string
  productForm: string
  applicability: string
  limitations: string
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
