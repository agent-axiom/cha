import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'))
const oneOf = (value, values, label) => {
  if (!values.includes(value)) throw new Error(`${label}: ${value}`)
}

export function validateSources(sources) {
  const seen = new Set()
  for (const source of sources) {
    if (!source.id || !source.title || !source.href) throw new Error('source requires id, title, and href')
    if (seen.has(source.id)) throw new Error(`duplicate source id: ${source.id}`)
    seen.add(source.id)
    oneOf(source.status, ['candidate', 'checked', 'rejected'], 'invalid source status')
  }
  return seen
}

export function validateClaims(claims, sourceIds) {
  const seen = new Set()
  for (const claim of claims) {
    if (seen.has(claim.id)) throw new Error(`duplicate claim id: ${claim.id}`)
    seen.add(claim.id)
    oneOf(claim.evidence, ['legend', 'source', 'retrospective', 'hypothesis', 'modern', 'medical-a', 'medical-b', 'medical-c', 'medical-d', 'medical-e'], 'invalid evidence')
    oneOf(claim.status, ['draft', 'checked', 'verified', 'rejected'], 'invalid claim status')
    for (const sourceId of claim.sourceIds ?? []) {
      if (!sourceIds.has(sourceId)) throw new Error(`claim ${claim.id} references unknown source ${sourceId}`)
    }
  }
  return seen
}

export function validateReviews(reviews, claimIds, verifiedClaimIds) {
  const required = ['historian', 'technologist', 'medical']
  for (const review of reviews) {
    if (!claimIds.has(review.claimId)) throw new Error(`review references unknown claim ${review.claimId}`)
    oneOf(review.role, required, 'invalid review role')
    oneOf(review.status, ['pending', 'approved', 'changes-requested'], 'invalid review status')
  }
  for (const claimId of verifiedClaimIds) {
    for (const role of required) {
      if (!reviews.some((review) => review.claimId === claimId && review.role === role && review.status === 'approved')) {
        throw new Error(`missing required review: ${claimId}/${role}`)
      }
    }
  }
}

export function validateAssets(assets) {
  const seen = new Set()
  for (const asset of assets) {
    if (seen.has(asset.id)) throw new Error(`duplicate asset id: ${asset.id}`)
    seen.add(asset.id)
    oneOf(asset.kind, ['photo', 'archive', 'illustration', 'map', 'diagram'], 'invalid asset kind')
    oneOf(asset.rights, ['owned', 'licensed', 'public-domain', 'pending', 'rejected'], 'invalid asset rights')
    oneOf(asset.status, ['concept', 'preview', 'print-ready', 'rejected'], 'invalid asset status')
    if (asset.status === 'print-ready' && !['owned', 'licensed', 'public-domain'].includes(asset.rights)) {
      throw new Error(`print-ready asset requires cleared rights: ${asset.id}`)
    }
  }
  return seen
}

export function validateAll() {
  const sources = read('sources.json')
  const claims = read('claims.json')
  const reviews = read('reviews.json')
  const assets = read('assets.json')
  const sourceIds = validateSources(sources)
  const claimIds = validateClaims(claims, sourceIds)
  const verified = new Set(claims.filter((claim) => claim.status === 'verified').map((claim) => claim.id))
  validateReviews(reviews, claimIds, verified)
  validateAssets(assets)
  return { sources: sources.length, claims: claims.length, assets: assets.length }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const totals = validateAll()
  console.log(`book data ok: ${totals.sources} sources, ${totals.claims} claims, ${totals.assets} assets`)
}
