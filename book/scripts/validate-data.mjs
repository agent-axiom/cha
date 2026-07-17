import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'))
const oneOf = (value, values, label) => {
  if (!values.includes(value)) throw new Error(`${label}: ${value}`)
}
const requireNonblankId = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} requires nonblank id`)
}

export function validateSources(sources) {
  const seen = new Set()
  for (const source of sources) {
    requireNonblankId(source.id, 'source')
    if (!source.title || !source.href) throw new Error('source requires id, title, and href')
    if (seen.has(source.id)) throw new Error(`duplicate source id: ${source.id}`)
    seen.add(source.id)
    oneOf(source.group, ['primary-asian', 'research-asian', 'research-western', 'guidance'], 'invalid source group')
    oneOf(source.status, ['candidate', 'checked', 'rejected'], 'invalid source status')
    oneOf(source.bookUse, ['core', 'supporting', 'access-copy', 'rejected'], 'invalid source book use')
    if (typeof source.siteVisible !== 'boolean') throw new Error(`source siteVisible must be boolean: ${source.id}`)
  }
  return seen
}

export function validateClaims(claims, sourceIds) {
  const seen = new Set()
  for (const claim of claims) {
    requireNonblankId(claim.id, 'claim')
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
  const seen = new Set()
  for (const review of reviews) {
    if (!claimIds.has(review.claimId)) throw new Error(`review references unknown claim ${review.claimId}`)
    oneOf(review.role, required, 'invalid review role')
    oneOf(review.status, ['pending', 'approved', 'changes-requested'], 'invalid review status')
    const key = JSON.stringify([review.claimId, review.role])
    if (seen.has(key)) throw new Error(`duplicate review: ${review.claimId}/${review.role}`)
    seen.add(key)
  }
  for (const claimId of verifiedClaimIds) {
    for (const role of required) {
      if (!reviews.some((review) => review.claimId === claimId && review.role === role && review.status === 'approved')) {
        throw new Error(`missing required review: ${claimId}/${role}`)
      }
    }
  }
}

const assetKinds = ['photo', 'archive', 'illustration', 'map', 'diagram']
const rasterKinds = ['photo', 'archive', 'illustration']
const assetRights = ['owned', 'licensed', 'public-domain', 'pending', 'rejected']
const assetStatuses = ['concept', 'preview', 'print-ready', 'rejected']
const clearedRights = ['owned', 'licensed', 'public-domain']
const requiredAssetMetadata = [
  'id',
  'kind',
  'title',
  'creator',
  'createdAt',
  'location',
  'sourceUrl',
  'rights',
  'licenseFile',
  'creditLine',
  'path',
  'pixelWidth',
  'pixelHeight',
  'effectiveDpi',
  'status',
  'spreadIds',
]

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const nullableString = (value) => value === null || (typeof value === 'string' && value.trim().length > 0)
const positiveNumber = (value) => Number.isFinite(value) && value > 0
const viewBoxNumber = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?`
const viewBoxSeparator = String.raw`(?:\s*,\s*|\s+)`
const viewBoxPattern = new RegExp(
  `^(${viewBoxNumber})${viewBoxSeparator}(${viewBoxNumber})${viewBoxSeparator}(${viewBoxNumber})${viewBoxSeparator}(${viewBoxNumber})$`,
)
const parseViewBox = (value) => {
  if (typeof value !== 'string') return null
  const match = value.trim().match(viewBoxPattern)
  if (!match) return null
  const numbers = match.slice(1).map(Number)
  if (!numbers.every(Number.isFinite) || numbers[2] <= 0 || numbers[3] <= 0) return null
  return numbers
}
const validViewBox = (value) => parseViewBox(value) !== null
const dpiRegistrationTolerance = 0.050000001
const rasterExtensions = new Set(['.tif', '.tiff', '.png', '.jpg', '.jpeg', '.webp'])
const vectorExtensions = new Set(['.svg'])
const rightsEvidenceExtensions = new Set(['.md', '.pdf', '.txt', '.json', '.eml'])

export const effectiveDpi = (pixels, millimetres) => pixels / (millimetres / 25.4)

export function validateAssets(assets) {
  const seen = new Set()
  for (const asset of assets) {
    requireNonblankId(asset.id, 'asset')
    const fail = (reason) => {
      throw new Error(`asset ${asset.id}: ${reason}`)
    }
    if (seen.has(asset.id)) fail('duplicate asset id')
    seen.add(asset.id)

    if (asset.status === 'print-ready' && ['pending', 'rejected'].includes(asset.rights)) {
      fail(`print-ready asset requires cleared rights: ${asset.rights}`)
    }

    for (const field of requiredAssetMetadata) {
      if (!hasOwn(asset, field)) fail(`missing required metadata: ${field}`)
    }

    if (!assetKinds.includes(asset.kind)) fail(`invalid asset kind: ${asset.kind}`)
    if (!assetRights.includes(asset.rights)) fail(`invalid asset rights: ${asset.rights}`)
    if (!assetStatuses.includes(asset.status)) fail(`invalid asset status: ${asset.status}`)
    if (typeof asset.title !== 'string' || !asset.title.trim()) fail('title must be a nonblank string')
    if (!nullableString(asset.creator)) fail('creator must be a nonblank string or null')
    if (!nullableString(asset.createdAt)) fail('createdAt must be a nonblank string or null')
    if (!nullableString(asset.location)) fail('location must be a nonblank string or null')
    if (!nullableString(asset.sourceUrl)) fail('sourceUrl must be a nonblank string or null')
    if (asset.sourceUrl !== null) {
      try {
        const source = new URL(asset.sourceUrl)
        if (!['http:', 'https:'].includes(source.protocol)) fail('sourceUrl must use http or https')
      } catch {
        fail('sourceUrl must be a valid URL or null')
      }
    }
    if (!nullableString(asset.licenseFile)) fail('licenseFile must be a nonblank string or null')
    if (!nullableString(asset.creditLine)) fail('creditLine must be a nonblank string or null')
    if (typeof asset.path !== 'string' || !asset.path.trim()) fail('path must be a nonblank string')
    const spreadIdsValid = Array.isArray(asset.spreadIds)
      && asset.spreadIds.every((id) => typeof id === 'string' && id.trim())
      && new Set(asset.spreadIds).size === asset.spreadIds.length
    if (asset.status !== 'rejected' && (!spreadIdsValid || asset.spreadIds.length === 0)) {
      fail('active asset requires nonempty unique spreadIds')
    }
    if (asset.status === 'rejected' && !spreadIdsValid) {
      fail('spreadIds must contain unique nonblank strings')
    }

    const raster = rasterKinds.includes(asset.kind)
    if (raster) {
      const pixelValues = [asset.pixelWidth, asset.pixelHeight]
      const nullPixelCount = pixelValues.filter((value) => value === null).length
      if (nullPixelCount !== 0 && nullPixelCount !== 2) fail('pixel dimensions must both be positive integers or both be null')
      if (nullPixelCount === 0 && pixelValues.some((value) => !Number.isInteger(value) || value <= 0)) {
        fail('pixel dimensions must both be positive integers or both be null')
      }
      if (asset.effectiveDpi !== null && !positiveNumber(asset.effectiveDpi)) {
        fail('effectiveDpi must be null or a positive finite number')
      }
    } else if (asset.pixelWidth !== null || asset.pixelHeight !== null || asset.effectiveDpi !== null) {
      fail('vector pixel dimensions and effectiveDpi must be null')
    }

    if (asset.status === 'print-ready' && !clearedRights.includes(asset.rights)) {
      fail(`print-ready asset requires cleared rights: ${asset.rights}`)
    }

    if (raster) {
      const hasPlacement = hasOwn(asset, 'placementWidthMm') || hasOwn(asset, 'placementHeightMm')
      if (asset.status === 'print-ready' && !hasPlacement) {
        fail('print-ready raster requires positive pixel and placement dimensions')
      }
      if (asset.effectiveDpi !== null && !hasPlacement) {
        fail('effectiveDpi requires registered placement dimensions')
      }
      if (hasPlacement) {
        const dimensions = ['pixelWidth', 'pixelHeight', 'placementWidthMm', 'placementHeightMm']
        if (dimensions.some((field) => !positiveNumber(asset[field]))) {
          fail('print-ready raster requires positive pixel and placement dimensions')
        }
        if (!positiveNumber(asset.effectiveDpi)) fail('registered placement requires positive effectiveDpi')

        const calculated = Math.min(
          effectiveDpi(asset.pixelWidth, asset.placementWidthMm),
          effectiveDpi(asset.pixelHeight, asset.placementHeightMm),
        )
        if (asset.status === 'print-ready' && calculated < 300) {
          fail(`effective dpi below 300 (${Number(calculated.toFixed(3))})`)
        }
        if (Math.abs(asset.effectiveDpi - calculated) > dpiRegistrationTolerance) {
          fail(`registered effectiveDpi ${asset.effectiveDpi} does not match calculated ${Number(calculated.toFixed(3))}`)
        }
      }
    }
    if (asset.status === 'print-ready' && !raster && !validViewBox(asset.viewBox)) {
      fail('print-ready vector requires valid viewBox')
    }
    if (asset.status === 'print-ready' && (!asset.creditLine || !asset.licenseFile)) {
      fail('print-ready asset requires creditLine and licenseFile')
    }
  }
  return seen
}

const insideDirectory = (directory, target) => {
  const relative = path.relative(directory, target)
  return relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)
}

const resolveAssetPath = (repoRoot, asset, field, label) => {
  const value = asset[field]
  const fail = (reason) => {
    throw new Error(`asset ${asset.id}: ${reason}: ${value}`)
  }
  if (typeof value !== 'string' || !value.trim() || path.isAbsolute(value) || value.includes('\\')) {
    fail(`unsafe ${label} path`)
  }
  const segments = value.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    fail(`unsafe ${label} path`)
  }
  const assetsRoot = path.resolve(repoRoot, 'book/assets')
  const resolved = path.resolve(repoRoot, ...segments)
  if (!value.startsWith('book/assets/') || !insideDirectory(assetsRoot, resolved)) {
    fail(`unsafe ${label} path`)
  }
  return { assetsRoot, resolved, value }
}

const requireRegularFile = (repoRoot, asset, field, label) => {
  const resolvedPath = resolveAssetPath(repoRoot, asset, field, label)
  let fileStatus
  try {
    fileStatus = fs.lstatSync(resolvedPath.resolved)
  } catch {
    throw new Error(`asset ${asset.id}: ${label} file missing or not regular: ${resolvedPath.value}`)
  }
  if (!fileStatus.isFile()) {
    throw new Error(`asset ${asset.id}: ${label} file missing or not regular: ${resolvedPath.value}`)
  }
  const realAssetsRoot = fs.realpathSync(resolvedPath.assetsRoot)
  const realFile = fs.realpathSync(resolvedPath.resolved)
  if (!insideDirectory(realAssetsRoot, realFile)) {
    throw new Error(`asset ${asset.id}: unsafe ${label} path: ${resolvedPath.value}`)
  }
  return resolvedPath
}

const extensionAllowed = (filename, extensions) => (
  typeof filename === 'string' && extensions.has(path.extname(filename).toLowerCase())
)

const svgRootViewBox = (filename) => {
  const svg = fs.readFileSync(filename, 'utf8')
  const root = svg.match(/^\uFEFF?\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?<svg\b([^>]*)>/)
  if (!root) return null
  const attribute = root[1].match(/(?:^|\s)viewBox\s*=\s*(["'])([^"']*)\1/)
  return attribute ? parseViewBox(attribute[2]) : null
}

export function validateAssetFiles(assets, repoRoot) {
  const ready = new Set()
  for (const asset of assets) {
    if (asset.status !== 'print-ready') continue
    const fail = (reason, value) => {
      throw new Error(`asset ${asset.id}: ${reason}: ${value}`)
    }
    const raster = rasterKinds.includes(asset.kind)
    const masterExtensions = raster ? rasterExtensions : vectorExtensions
    if (!extensionAllowed(asset.path, masterExtensions)) fail('invalid master extension', asset.path)
    if (!extensionAllowed(asset.licenseFile, rightsEvidenceExtensions)) {
      fail('invalid rights evidence extension', asset.licenseFile)
    }

    const master = requireRegularFile(repoRoot, asset, 'path', 'master')
    requireRegularFile(repoRoot, asset, 'licenseFile', 'rights evidence')

    if (!raster) {
      const actual = svgRootViewBox(master.resolved)
      const registered = parseViewBox(asset.viewBox)
      if (!actual) throw new Error(`asset ${asset.id}: SVG root requires valid viewBox for ${asset.path}`)
      if (!registered || actual.some((value, index) => value !== registered[index])) {
        throw new Error(`asset ${asset.id}: SVG viewBox mismatch for ${asset.path}`)
      }
    }
    ready.add(asset.id)
  }
  return ready
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
  validateAssetFiles(assets, path.resolve(root, '..'))
  return { sources: sources.length, claims: claims.length, assets: assets.length }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const totals = validateAll()
  console.log(`book data ok: ${totals.sources} sources, ${totals.claims} claims, ${totals.assets} assets`)
}
