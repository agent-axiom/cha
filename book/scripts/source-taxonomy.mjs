import fs from 'node:fs'
import path from 'node:path'

const pairKey = (documentClass, evidenceRole) => `${documentClass}\u0000${evidenceRole}`

const compileLabels = (entries, label) => {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error(`source taxonomy requires ${label}`)
  const labels = new Map()
  for (const entry of entries) {
    if (!entry || typeof entry.id !== 'string' || !entry.id.trim()) throw new Error(`source taxonomy has invalid ${label} id`)
    if (labels.has(entry.id)) throw new Error(`source taxonomy has duplicate ${label} id: ${entry.id}`)
    if (typeof entry.readerLabel !== 'string' || !entry.readerLabel.trim()) {
      throw new Error(`source taxonomy has invalid ${label} reader label: ${entry.id}`)
    }
    labels.set(entry.id, entry.readerLabel.trim())
  }
  return labels
}

export const compileSourceTaxonomy = (taxonomy) => {
  if (!taxonomy || typeof taxonomy !== 'object' || Array.isArray(taxonomy)) {
    throw new Error('source taxonomy must be an object')
  }
  const documentClassLabels = compileLabels(taxonomy.documentClasses, 'document class')
  const evidenceRoleLabels = compileLabels(taxonomy.evidenceRoles, 'evidence role')
  if (!Array.isArray(taxonomy.allowedPairs) || taxonomy.allowedPairs.length === 0) {
    throw new Error('source taxonomy requires allowed pairs')
  }
  const allowedPairs = new Set()
  for (const pair of taxonomy.allowedPairs) {
    const { documentClass, evidenceRole } = pair ?? {}
    if (!documentClassLabels.has(documentClass)) throw new Error(`source taxonomy pair has unknown document class: ${documentClass}`)
    if (!evidenceRoleLabels.has(evidenceRole)) throw new Error(`source taxonomy pair has unknown evidence role: ${evidenceRole}`)
    const key = pairKey(documentClass, evidenceRole)
    if (allowedPairs.has(key)) throw new Error(`source taxonomy has duplicate allowed pair: ${documentClass}+${evidenceRole}`)
    allowedPairs.add(key)
  }
  return { documentClassLabels, evidenceRoleLabels, allowedPairs }
}

export const loadSourceTaxonomy = (root) => compileSourceTaxonomy(
  JSON.parse(fs.readFileSync(path.join(root, 'data', 'source-taxonomy.json'), 'utf8')),
)

export const assertSourceClassification = (source, taxonomy) => {
  if (!taxonomy.documentClassLabels.has(source.documentClass)) {
    throw new Error(`invalid source document class: ${source.documentClass}`)
  }
  if (!taxonomy.evidenceRoleLabels.has(source.evidenceRole)) {
    throw new Error(`invalid source evidence role: ${source.evidenceRole}`)
  }
  if (!taxonomy.allowedPairs.has(pairKey(source.documentClass, source.evidenceRole))) {
    throw new Error(`invalid source classification pair: ${source.documentClass}+${source.evidenceRole}`)
  }
}
