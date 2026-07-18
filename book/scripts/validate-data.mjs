import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'))
const readFlatplan = (name) => JSON.parse(fs.readFileSync(path.join(root, 'flatplan', name), 'utf8'))
const readProduction = (name) => JSON.parse(fs.readFileSync(path.join(root, 'production', name), 'utf8'))
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
    oneOf(source.publicationClass, [
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
    ], 'invalid source publication class')
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

const sha256Pattern = /^[a-f0-9]{64}$/u
const fullTimestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/u
const substantiveString = (value, minimumLength) => typeof value === 'string' && [...value.trim()].length >= minimumLength
const placeholderPattern = /^(?:x+|n\/?a|none|unknown|pending|tbd|null|undefined)$/iu
const meaningfulString = (value, minimumLength = 2) => (
  substantiveString(value, minimumLength) && !placeholderPattern.test(value.trim())
)
const validTimestamp = (value) => {
  const match = String(value ?? '').match(fullTimestampPattern)
  if (!match || !Number.isFinite(Date.parse(value))) return false
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText = '0', offsetMinuteText = '0'] = match
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = [
    yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText,
  ].map(Number)
  const calendarDate = new Date(Date.UTC(year, month - 1, day))
  return (
    calendarDate.getUTCFullYear() === year
    && calendarDate.getUTCMonth() === month - 1
    && calendarDate.getUTCDate() === day
    && hour <= 23
    && minute <= 59
    && second <= 59
    && offsetHour <= 23
    && offsetMinute <= 59
  )
}
const validCredentialEvidence = (value) => {
  if (!substantiveString(value, 12)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.includes('.') && !['example.com', 'example.org', 'example.net'].includes(url.hostname)
  } catch {
    return false
  }
}

const evidenceValue = (collection, key) => (
  collection instanceof Map ? collection.get(key) : collection?.[key]
)
const evidenceContains = (collection, key) => (
  collection instanceof Set
    ? collection.has(key)
    : Array.isArray(collection)
      ? collection.includes(key)
      : collection?.[key] === true
)

const validateExternalApproval = (review, frozenCycle, approvalEvidence) => {
  const label = `${review.claimId}/${review.role}`
  if (!['approve-wording', 'confirm-exclusion'].includes(review.decision)) {
    throw new Error(`approved review requires decision: ${label}`)
  }
  if (!frozenCycle || !substantiveString(frozenCycle.cycleId, 1)) {
    throw new Error(`approved review requires frozen external cycle: ${label}`)
  }
  if (
    !['dispatched', 'responses-received', 'closed'].includes(frozenCycle.status)
    || frozenCycle.deadlineStatus !== 'confirmed'
    || !validTimestamp(frozenCycle.deadline)
    || !validTimestamp(frozenCycle.frozenAt)
  ) {
    throw new Error(`approved review requires a dispatched cycle with confirmed deadline: ${label}`)
  }
  for (const field of ['cycleId', 'proofSetSha256', 'snapshotSha256']) {
    if (review[field] !== frozenCycle[field]) {
      throw new Error(`approved review ${field} does not match frozen cycle: ${label}`)
    }
  }
  if (!sha256Pattern.test(frozenCycle.proofSetSha256 ?? '') || !sha256Pattern.test(frozenCycle.snapshotSha256 ?? '')) {
    throw new Error(`frozen review cycle requires valid proof hashes: ${label}`)
  }
  const reviewer = review.reviewer
  if (
    !reviewer
    || typeof reviewer !== 'object'
    || Array.isArray(reviewer)
    || !meaningfulString(reviewer.name)
    || !meaningfulString(reviewer.affiliation)
    || !meaningfulString(reviewer.qualification)
    || !validCredentialEvidence(reviewer.credentialEvidence)
    || !meaningfulString(reviewer.conflictOfInterest)
    || !meaningfulString(reviewer.funding)
  ) {
    throw new Error(`approved review requires valid reviewer metadata: ${label}`)
  }
  if (
    !validTimestamp(review.reviewedAt)
    || !validTimestamp(review.submittedAt)
    || Date.parse(review.submittedAt) < Date.parse(review.reviewedAt)
  ) {
    throw new Error(`approved review requires valid timestamps: ${label}`)
  }
  if (!sha256Pattern.test(review.responseSha256 ?? '')) {
    throw new Error(`approved review requires valid responseSha256: ${label}`)
  }
  if (!approvalEvidence || typeof approvalEvidence !== 'object' || Array.isArray(approvalEvidence)) {
    throw new Error(`approved review requires approval evidence context: ${label}`)
  }
  if (Date.parse(review.reviewedAt) < Date.parse(frozenCycle.frozenAt)) {
    throw new Error(`approved review predates frozen cycle: ${label}`)
  }
  const claimStatus = evidenceValue(approvalEvidence.claimStatusById, review.claimId)
  const expectedDecision = ['checked', 'verified'].includes(claimStatus)
    ? 'approve-wording'
    : claimStatus === 'rejected'
      ? 'confirm-exclusion'
      : null
  if (review.decision !== expectedDecision) {
    throw new Error(`approved review decision does not match claim status: ${label}`)
  }
  const storedResponseSha256 = evidenceValue(approvalEvidence.responseSha256ByRole, review.role)
  if (!sha256Pattern.test(storedResponseSha256 ?? '') || review.responseSha256 !== storedResponseSha256) {
    throw new Error(`approved review responseSha256 does not match stored response: ${label}`)
  }
  const pageIds = review.pageIdsReviewed
  if (claimStatus === 'rejected') {
    if (!Array.isArray(pageIds) || pageIds.length !== 0) {
      throw new Error(`excluded claim review must not invent proof pages: ${label}`)
    }
    if (!evidenceContains(approvalEvidence.excludedClaimIds, review.claimId)) {
      throw new Error(`excluded claim is absent from frozen exclusion ledger: ${label}`)
    }
  } else {
    if (
      !Array.isArray(pageIds)
      || pageIds.length === 0
      || new Set(pageIds).size !== pageIds.length
      || pageIds.some((pageId) => !/^[AG]-P\d{3}$/u.test(pageId))
    ) {
      throw new Error(`approved review requires valid pageIdsReviewed: ${label}`)
    }
    const allowedPageIds = evidenceValue(approvalEvidence.allowedPageIdsByClaim, review.claimId)
    const allowed = allowedPageIds instanceof Set ? allowedPageIds : new Set(allowedPageIds ?? [])
    if (allowed.size === 0 || pageIds.some((pageId) => !allowed.has(pageId))) {
      throw new Error(`approved review references pages outside frozen claim evidence: ${label}`)
    }
  }
  if (Date.parse(review.submittedAt) > Date.parse(frozenCycle.deadline)) {
    const waiver = review.lateWaiver
    if (
      !waiver
      || typeof waiver !== 'object'
      || Array.isArray(waiver)
      || !meaningfulString(waiver.reason)
      || !meaningfulString(waiver.authorizedBy)
    ) {
      throw new Error(`late approved review requires an explicit waiver: ${label}`)
    }
  }
}

export function validateReviews(reviews, claimIds, verifiedClaimIds, frozenCycle = null, approvalEvidence = null) {
  const required = ['historian', 'technologist', 'medical']
  const seen = new Set()
  for (const review of reviews) {
    if (!claimIds.has(review.claimId)) throw new Error(`review references unknown claim ${review.claimId}`)
    oneOf(review.role, required, 'invalid review role')
    oneOf(review.status, ['pending', 'approved', 'changes-requested'], 'invalid review status')
    const key = JSON.stringify([review.claimId, review.role])
    if (seen.has(key)) throw new Error(`duplicate review: ${review.claimId}/${review.role}`)
    seen.add(key)
    if (review.status === 'approved') validateExternalApproval(review, frozenCycle, approvalEvidence)
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
const requiredFlatplanTemplateIds = [
  'chapter-gate',
  'full-bleed-photo',
  'photo-plus-essay',
  'source-window',
  'map',
  'process',
  'scientific-plate',
  'object-atlas',
  'quiet-text',
  'bibliography',
  'guide-recipe',
  'guide-troubleshooting',
  'guide-safety',
]
const apparatusKinds = ['chronology', 'glossary', 'bibliography', 'publication-notes']

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

const flatplanTemplateKeys = [
  'id',
  'label',
  'purpose',
  'constraints',
  'expectedContent',
  'requiresVisual',
  'compatiblePageTemplates',
]
const flatplanPlanKeys = ['id', 'title', 'pagePrefix', 'signatureSize', 'totalPages', 'sections', 'pages']
const flatplanSectionKeys = ['id', 'title', 'pageCount', 'start', 'end', 'allowedLeftStart', 'requiredTopics']
const flatplanTopicKeys = ['id', 'title', 'expectedMethodIds']
const flatplanPageKeys = [
  'number',
  'id',
  'spreadId',
  'sectionId',
  'topicId',
  'spreadTitle',
  'role',
  'spreadTemplate',
  'template',
  'assetIds',
  'chapterStart',
  'crossSectionSpread',
  'visualPlaceholder',
  'apparatus',
  'recipe',
]
const recipeKeys = [
  'recipeId',
  'title',
  'methodId',
  'teaStyle',
  'vesselVolumeMl',
  'leafMassG',
  'temperatureRangeC',
  'firstInfusionRangeSec',
  'adjustmentNote',
]
const visualPlaceholderKeys = ['status', 'kind', 'brief']
const genericRolePattern = /(?:полоса|шаг|страница)\s+\d+|\b\d+\s+из\s+\d+/iu
const topicIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const expectedGuideRecipeCounts = new Map([
  ['tools-water', 2],
  ['sheng', 4],
  ['shou', 4],
  ['simple-methods', 6],
])
const requiredSimpleMethodIds = [
  'mug-sheng',
  'mug-shou',
  'large-pot-sheng',
  'large-pot-shou',
  'thermos-sheng',
  'thermos-shou',
]

const requireExactKeys = (object, allowedKeys, requiredKeys, label, fail) => {
  for (const key of Object.keys(object)) {
    if (!allowedKeys.includes(key)) fail(`${label} unexpected key: ${key}`)
  }
  for (const key of requiredKeys) {
    if (!hasOwn(object, key)) fail(`${label} missing required key: ${key}`)
  }
}

const validateFlatplanTemplates = (templates, planId) => {
  const fail = (reason) => {
    throw new Error(`flatplan ${planId}: ${reason}`)
  }
  if (!Array.isArray(templates)) fail('templates must be an array')
  const byId = new Map()
  for (const template of templates) {
    if (!template || typeof template !== 'object' || Array.isArray(template)) fail('template must be an object')
    requireExactKeys(template, flatplanTemplateKeys, flatplanTemplateKeys, `template ${template.id ?? 'unknown'}`, fail)
    if (typeof template.id !== 'string' || !template.id.trim()) fail('template requires nonblank id')
    if (byId.has(template.id)) throw new Error(`duplicate template id: ${template.id}`)
    if (!requiredFlatplanTemplateIds.includes(template.id)) throw new Error(`unexpected template id: ${template.id}`)
    byId.set(template.id, template)
    for (const field of ['label', 'purpose']) {
      if (typeof template[field] !== 'string' || !template[field].trim()) {
        throw new Error(`template ${template.id}: ${field} must be nonblank`)
      }
    }
    for (const field of ['constraints', 'expectedContent']) {
      if (
        !Array.isArray(template[field])
        || template[field].length === 0
        || template[field].some((value) => typeof value !== 'string' || !value.trim())
      ) {
        throw new Error(`template ${template.id}: ${field} must contain nonblank strings`)
      }
    }
    if (typeof template.requiresVisual !== 'boolean') {
      throw new Error(`template ${template.id}: requiresVisual must be boolean`)
    }
    if (
      !Array.isArray(template.compatiblePageTemplates)
      || template.compatiblePageTemplates.length === 0
      || template.compatiblePageTemplates.some((id) => typeof id !== 'string' || !id.trim())
      || new Set(template.compatiblePageTemplates).size !== template.compatiblePageTemplates.length
    ) {
      throw new Error(`template ${template.id}: compatiblePageTemplates must contain unique template ids`)
    }
  }
  for (const templateId of requiredFlatplanTemplateIds) {
    if (!byId.has(templateId)) throw new Error(`missing required template: ${templateId}`)
  }
  for (const template of byId.values()) {
    for (const pageTemplateId of template.compatiblePageTemplates) {
      if (!byId.has(pageTemplateId)) {
        throw new Error(`template ${template.id}: unknown compatible page template ${pageTemplateId}`)
      }
    }
  }
  return byId
}

const boundedRange = (value, minimum, maximum) => (
  Array.isArray(value)
  && value.length === 2
  && value.every(Number.isFinite)
  && value[0] >= minimum
  && value[0] <= value[1]
  && value[1] <= maximum
)

const validateGuideRecipe = (page, fail) => {
  const recipe = page.recipe
  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) fail('recipe must be an object')
  requireExactKeys(recipe, recipeKeys, [], 'recipe', fail)
  for (const field of ['recipeId', 'title', 'methodId', 'teaStyle', 'adjustmentNote']) {
    if (typeof recipe[field] !== 'string' || !recipe[field].trim()) fail(`${field} must be nonblank`)
  }
  if (!['calibration', 'sheng', 'shou'].includes(recipe.teaStyle)) {
    fail('teaStyle must be calibration, sheng, or shou')
  }
  if (!Number.isFinite(recipe.vesselVolumeMl) || recipe.vesselVolumeMl < 50 || recipe.vesselVolumeMl > 1000) {
    fail('vesselVolumeMl must be between 50 and 1000')
  }
  if (!Number.isFinite(recipe.leafMassG) || recipe.leafMassG < 1 || recipe.leafMassG > 20) {
    fail('leafMassG must be between 1 and 20')
  }
  if (!boundedRange(recipe.temperatureRangeC, 60, 100)) {
    fail('temperatureRangeC must be an ordered range between 60 and 100')
  }
  if (!boundedRange(recipe.firstInfusionRangeSec, 1, 1800)) {
    fail('firstInfusionRangeSec must be a positive ascending range between 1 and 1800')
  }
  return recipe
}

const validateVisualPlaceholder = (placeholder, fail) => {
  if (!placeholder || typeof placeholder !== 'object' || Array.isArray(placeholder)) {
    fail('visualPlaceholder must be an object')
  }
  requireExactKeys(placeholder, visualPlaceholderKeys, visualPlaceholderKeys, 'visualPlaceholder', fail)
  if (placeholder.status !== 'commission-brief') fail('visualPlaceholder status must be commission-brief')
  if (!assetKinds.includes(placeholder.kind)) fail(`visualPlaceholder kind is invalid: ${placeholder.kind}`)
  if (typeof placeholder.brief !== 'string' || placeholder.brief.trim().length < 20) {
    fail('visualPlaceholder brief must be nonblank and actionable')
  }
}

export function validateFlatplan(plan, expectedPages, templates, assetIds) {
  const planId = plan?.id
  const fail = (reason) => {
    throw new Error(`flatplan ${planId ?? 'unknown'}: ${reason}`)
  }
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) fail('plan must be an object')
  requireExactKeys(plan, flatplanPlanKeys, flatplanPlanKeys, 'plan', fail)
  if (typeof planId !== 'string' || !planId.trim()) fail('id must be nonblank')
  if (typeof plan.title !== 'string' || !plan.title.trim()) fail('title must be nonblank')
  if (typeof plan.pagePrefix !== 'string' || !/^[A-Z][A-Z0-9]*$/.test(plan.pagePrefix)) {
    fail('pagePrefix must be uppercase alphanumeric')
  }
  if (!Number.isInteger(expectedPages) || expectedPages <= 0) fail('expectedPages must be a positive integer')
  if (plan.totalPages !== expectedPages) fail(`totalPages must equal ${expectedPages}`)
  if (plan.signatureSize !== 16 || plan.totalPages % plan.signatureSize !== 0) {
    fail('totalPages must use complete 16-page signatures')
  }
  if (!(assetIds instanceof Set)) fail('assetIds must be a Set')
  const templateById = validateFlatplanTemplates(templates, planId)

  if (!Array.isArray(plan.sections) || plan.sections.length === 0) fail('sections must be a nonempty array')
  const sectionIds = new Set()
  const sectionByPage = new Map()
  const topicsBySection = new Map()
  const topicOwners = new Map()
  const methodTopicOwners = new Map()
  let nextSectionStart = 1
  for (const section of plan.sections) {
    if (!section || typeof section !== 'object' || typeof section.id !== 'string' || !section.id.trim()) {
      fail('section requires nonblank id')
    }
    requireExactKeys(section, flatplanSectionKeys, ['id', 'title', 'pageCount', 'start', 'end'], `section ${section.id}`, fail)
    if (sectionIds.has(section.id)) fail(`duplicate section id: ${section.id}`)
    sectionIds.add(section.id)
    if (typeof section.title !== 'string' || !section.title.trim()) fail(`section ${section.id} title must be nonblank`)
    if (section.allowedLeftStart !== undefined && typeof section.allowedLeftStart !== 'boolean') {
      fail(`section ${section.id} allowedLeftStart must be boolean`)
    }
    if (!Number.isInteger(section.start) || !Number.isInteger(section.end) || section.start !== nextSectionStart) {
      fail(`section ${section.id} must start at contiguous page ${nextSectionStart}`)
    }
    if (section.end < section.start || section.pageCount <= 0) {
      fail(`section ${section.id} must contain at least one page`)
    }
    if (!Number.isInteger(section.pageCount) || section.pageCount !== section.end - section.start + 1) {
      fail(`section ${section.id} pageCount does not match its range`)
    }
    if (section.start % 2 === 0 && section.allowedLeftStart !== true) {
      fail(`section ${section.id} must start recto/odd or declare allowedLeftStart`)
    }
    if (!Array.isArray(section.requiredTopics) || section.requiredTopics.length === 0) {
      fail(`section ${section.id} requiredTopics must be a nonempty array`)
    }
    const sectionTopics = new Map()
    for (const topic of section.requiredTopics) {
      if (!topic || typeof topic !== 'object' || Array.isArray(topic)) fail(`section ${section.id} topic must be an object`)
      requireExactKeys(topic, flatplanTopicKeys, ['id', 'title'], `section ${section.id} topic`, fail)
      if (typeof topic.id !== 'string' || !topicIdPattern.test(topic.id)) fail(`section ${section.id} topic id is invalid`)
      if (typeof topic.title !== 'string' || !topic.title.trim()) fail(`section ${section.id} topic title must be nonblank`)
      if (genericRolePattern.test(topic.title)) fail(`section ${section.id} generic counter topic title is forbidden`)
      if (hasOwn(topic, 'expectedMethodIds')) {
        if (
          !Array.isArray(topic.expectedMethodIds)
          || topic.expectedMethodIds.length === 0
          || topic.expectedMethodIds.some((methodId) => typeof methodId !== 'string' || !methodId.trim())
          || new Set(topic.expectedMethodIds).size !== topic.expectedMethodIds.length
        ) {
          fail(`section ${section.id} topic ${topic.id} expectedMethodIds must contain unique nonblank strings`)
        }
        for (const methodId of topic.expectedMethodIds) {
          if (methodTopicOwners.has(methodId)) {
            fail(`recipe methodId ${methodId} is mapped by multiple topics`)
          }
          methodTopicOwners.set(methodId, topic.id)
        }
      }
      if (sectionTopics.has(topic.id) || topicOwners.has(topic.id)) fail(`duplicate topic id: ${topic.id}`)
      sectionTopics.set(topic.id, topic)
      topicOwners.set(topic.id, section.id)
    }
    topicsBySection.set(section.id, sectionTopics)
    for (let number = section.start; number <= section.end; number += 1) sectionByPage.set(number, section)
    nextSectionStart = section.end + 1
  }
  if (nextSectionStart !== plan.totalPages + 1) fail('sections must cover every page exactly once')

  if (!Array.isArray(plan.pages) || plan.pages.length !== plan.totalPages) {
    fail(`pages array must contain ${plan.totalPages} entries`)
  }
  const pageIds = new Set()
  const spreadCounts = new Map()
  const pagesBySpread = new Map()
  const usedTopics = new Map([...sectionIds].map((sectionId) => [sectionId, new Set()]))
  const roles = new Set()
  const recipeIds = new Set()
  const recipeObjects = new Set()
  const recipePages = []
  const usedMethodIdsByTopic = new Map()
  const pad = (number) => String(number).padStart(3, '0')
  for (let index = 0; index < plan.pages.length; index += 1) {
    const page = plan.pages[index]
    const number = index + 1
    if (!page || typeof page !== 'object' || Array.isArray(page)) fail(`page ${number} must be an object`)
    const expectedPageId = `${plan.pagePrefix}-P${pad(number)}`
    const pageFail = (reason) => fail(`page ${page.id ?? expectedPageId}: ${reason}`)
    requireExactKeys(
      page,
      flatplanPageKeys,
      ['number', 'id', 'spreadId', 'sectionId', 'topicId', 'spreadTitle', 'role', 'spreadTemplate', 'template', 'assetIds'],
      `page ${page.id ?? expectedPageId}`,
      fail,
    )
    if (page.number !== number) fail(`page ${number} must have number ${number}`)
    if (page.id !== expectedPageId) fail(`page ${number} must have id ${expectedPageId}`)
    if (pageIds.has(page.id)) pageFail('duplicate page id')
    pageIds.add(page.id)

    const section = sectionByPage.get(number)
    if (!section || page.sectionId !== section.id) pageFail(`must belong to section ${section?.id ?? 'none'}`)
    if (typeof page.role !== 'string' || !page.role.trim()) pageFail('role must be nonblank')
    if (genericRolePattern.test(page.role)) pageFail('generic counter role is forbidden')
    if (roles.has(page.role)) pageFail('role must be distinct')
    roles.add(page.role)
    const sectionTopics = topicsBySection.get(section.id)
    if (typeof page.topicId !== 'string' || !sectionTopics.has(page.topicId)) {
      pageFail(`undeclared topic ${page.topicId}`)
    }
    const topic = sectionTopics.get(page.topicId)
    if (typeof page.spreadTitle !== 'string' || !page.spreadTitle.trim()) pageFail('spreadTitle must be nonblank')
    usedTopics.get(section.id).add(page.topicId)
    if (typeof page.spreadTemplate !== 'string' || !templateById.has(page.spreadTemplate)) {
      pageFail(`unknown spreadTemplate ${page.spreadTemplate}`)
    }
    if (typeof page.template !== 'string' || !templateById.has(page.template)) {
      pageFail(`unknown template ${page.template}`)
    }
    if (!templateById.get(page.spreadTemplate).compatiblePageTemplates.includes(page.template)) {
      pageFail(`template ${page.template} is incompatible with spreadTemplate ${page.spreadTemplate}`)
    }
    if (
      !Array.isArray(page.assetIds)
      || page.assetIds.some((id) => typeof id !== 'string' || !id.trim())
      || new Set(page.assetIds).size !== page.assetIds.length
    ) {
      pageFail('assetIds must contain unique nonblank strings')
    }
    for (const assetId of page.assetIds) {
      if (!assetIds.has(assetId)) pageFail(`unknown asset ${assetId}`)
    }
    if (page.chapterStart !== undefined && typeof page.chapterStart !== 'boolean') {
      pageFail('chapterStart must be boolean')
    }
    if (page.chapterStart === true && number % 2 === 0 && section.allowedLeftStart !== true) {
      fail(`chapter start ${page.id} must be recto/odd`)
    }
    const startsSection = number === section.start
    if ((page.chapterStart === true) !== startsSection) pageFail('chapterStart must match section start')
    if (page.crossSectionSpread !== undefined && typeof page.crossSectionSpread !== 'boolean') {
      pageFail('crossSectionSpread must be boolean')
    }
    if (hasOwn(page, 'visualPlaceholder')) validateVisualPlaceholder(page.visualPlaceholder, pageFail)

    const expectedSpreadId = `${plan.pagePrefix}-S${pad(Math.floor(number / 2) + 1)}`
    if (page.spreadId !== expectedSpreadId) fail(`page ${page.id} must use spread ${expectedSpreadId}`)
    spreadCounts.set(page.spreadId, (spreadCounts.get(page.spreadId) ?? 0) + 1)
    const spreadPages = pagesBySpread.get(page.spreadId) ?? []
    spreadPages.push(page)
    pagesBySpread.set(page.spreadId, spreadPages)

    const isAlbumApparatus = plan.id === 'album' && page.sectionId === 'apparatus'
    if (isAlbumApparatus && !apparatusKinds.includes(page.apparatus)) {
      fail(`apparatus page ${page.id} requires chronology, glossary, bibliography, or publication-notes`)
    }
    if (!isAlbumApparatus && hasOwn(page, 'apparatus')) {
      pageFail('apparatus is only allowed on album apparatus pages')
    }
    if (page.template === 'guide-recipe') {
      if (plan.id !== 'guide') pageFail('guide-recipe template is only allowed in the guide')
      const recipe = validateGuideRecipe(page, pageFail)
      if (!Array.isArray(topic.expectedMethodIds) || !topic.expectedMethodIds.includes(recipe.methodId)) {
        pageFail(`recipe methodId ${recipe.methodId} is not allowed by topic ${page.topicId}`)
      }
      const usedMethodIds = usedMethodIdsByTopic.get(page.topicId) ?? new Set()
      usedMethodIds.add(recipe.methodId)
      usedMethodIdsByTopic.set(page.topicId, usedMethodIds)
      if (recipeIds.has(recipe.recipeId)) pageFail(`duplicate recipe id: ${recipe.recipeId}`)
      recipeIds.add(recipe.recipeId)
      const serialized = JSON.stringify(recipe)
      if (recipeObjects.has(serialized)) pageFail('duplicate recipe object')
      recipeObjects.add(serialized)
      recipePages.push(page)
    } else if (hasOwn(page, 'recipe')) {
      pageFail('recipe is only allowed on guide-recipe pages')
    } else {
      if (hasOwn(topic, 'expectedMethodIds')) pageFail(`nonrecipe page cannot use method-mapped topic ${page.topicId}`)
      if (page.spreadTitle !== topic.title) pageFail(`spreadTitle must match declared topic ${page.topicId}`)
    }
  }

  for (const section of plan.sections) {
    for (const topicId of topicsBySection.get(section.id).keys()) {
      if (!usedTopics.get(section.id).has(topicId)) fail(`section ${section.id} required topic ${topicId} is not used`)
      const topic = topicsBySection.get(section.id).get(topicId)
      if (
        hasOwn(topic, 'expectedMethodIds')
        && JSON.stringify([...(usedMethodIdsByTopic.get(topicId) ?? [])].sort()) !== JSON.stringify([...topic.expectedMethodIds].sort())
      ) {
        fail(`section ${section.id} topic ${topicId} must use every expectedMethodId exactly as declared`)
      }
    }
  }

  if (plan.id === 'guide') {
    if (recipePages.length !== 16) fail('guide must contain exactly 16 guide-recipe pages')
    for (const [sectionId, expectedCount] of expectedGuideRecipeCounts) {
      const actual = recipePages.filter((page) => page.sectionId === sectionId).length
      if (actual !== expectedCount) fail(`guide recipe section ${sectionId} must contain ${expectedCount} recipes`)
    }
    if (recipePages.some((page) => !expectedGuideRecipeCounts.has(page.sectionId))) {
      fail('guide recipes occur outside the approved recipe sections')
    }
    const simpleMethods = recipePages
      .filter((page) => page.sectionId === 'simple-methods')
      .map((page) => page.recipe.methodId)
      .sort()
    if (JSON.stringify(simpleMethods) !== JSON.stringify([...requiredSimpleMethodIds].sort())) {
      fail('simple-methods recipes must cover all six required methodIds')
    }
    for (const sectionId of ['sheng', 'shou']) {
      const methods = recipePages.filter((page) => page.sectionId === sectionId).map((page) => page.recipe.methodId)
      if (!methods.some((id) => id.startsWith('gaiwan-')) || !methods.some((id) => id.startsWith('teapot-'))) {
        fail(`${sectionId} recipes must cover gaiwan and teapot methods`)
      }
    }
  }

  if (plan.id === 'album') {
    const expectedApparatus = [
      ...Array(6).fill('chronology'),
      ...Array(4).fill('glossary'),
      ...Array(5).fill('bibliography'),
      'publication-notes',
    ]
    const actualApparatus = plan.pages.slice(192, 208).map((page) => page.apparatus)
    if (
      plan.pages.slice(192, 208).some((page) => page.sectionId !== 'apparatus')
      || JSON.stringify(actualApparatus) !== JSON.stringify(expectedApparatus)
    ) {
      fail('album apparatus must be chronology 193-198, glossary 199-202, bibliography 203-207, publication-notes 208')
    }
  }

  const expectedSpreadCount = plan.totalPages / 2 + 1
  if (spreadCounts.size !== expectedSpreadCount) fail(`must contain ${expectedSpreadCount} reader spreads`)
  const firstPage = plan.pages[0]
  const lastPage = plan.pages.at(-1)
  if (spreadCounts.get(firstPage.spreadId) !== 1 || spreadCounts.get(lastPage.spreadId) !== 1) {
    fail('first and final pages must be singleton reader spreads')
  }
  if (firstPage.crossSectionSpread === true || lastPage.crossSectionSpread === true) {
    fail('singleton pages cannot be cross-section spreads')
  }
  const placeholderBriefs = new Set()
  for (const [spreadId, spreadPages] of pagesBySpread) {
    const spreadTemplate = spreadPages[0].spreadTemplate
    if (spreadPages.some((page) => page.spreadTemplate !== spreadTemplate)) {
      fail(`spread ${spreadId} must use one spreadTemplate`)
    }
    const assets = spreadPages.flatMap((page) => page.assetIds)
    const placeholders = spreadPages.filter((page) => hasOwn(page, 'visualPlaceholder')).map((page) => page.visualPlaceholder)
    const requiresVisual = templateById.get(spreadTemplate).requiresVisual
    if (requiresVisual && assets.length === 0 && placeholders.length === 0) {
      fail(`visual spread ${spreadId} requires assets or commission brief`)
    }
    if (requiresVisual && assets.length > 0 && placeholders.length > 0) {
      fail(`visual spread ${spreadId} cannot combine assets and visualPlaceholder`)
    }
    if (requiresVisual && assets.length === 0 && placeholders.length > 0) {
      if (
        placeholders.length !== spreadPages.length
        || placeholders.some((placeholder) => JSON.stringify(placeholder) !== JSON.stringify(placeholders[0]))
      ) {
        fail(`spread ${spreadId} must use one identical visualPlaceholder`)
      }
      if (placeholderBriefs.has(placeholders[0].brief)) fail(`duplicate visualPlaceholder brief: ${placeholders[0].brief}`)
      placeholderBriefs.add(placeholders[0].brief)
    }
    if (!requiresVisual && placeholders.length > 0) fail(`nonvisual spread ${spreadId} cannot use visualPlaceholder`)
  }

  for (let index = 1; index < plan.pages.length - 1; index += 2) {
    const left = plan.pages[index]
    const right = plan.pages[index + 1]
    if (left.spreadId !== right.spreadId || spreadCounts.get(left.spreadId) !== 2) {
      fail(`spread ${left.spreadId} must pair adjacent pages ${left.id} and ${right.id}`)
    }
    const crossesSection = left.sectionId !== right.sectionId
    if (crossesSection && (left.crossSectionSpread !== true || right.crossSectionSpread !== true)) {
      fail(`spread ${left.spreadId} crosses sections without two-sided crossSectionSpread`)
    }
    if (!crossesSection && (left.crossSectionSpread === true || right.crossSectionSpread === true)) {
      fail(`spread ${left.spreadId} marks crossSectionSpread within one section`)
    }
    if (!crossesSection && left.spreadTitle !== right.spreadTitle) {
      fail(`normal spread ${left.spreadId} must use one explicit spreadTitle`)
    }
    if (
      !crossesSection
      && left.topicId !== right.topicId
      && (left.template !== 'guide-recipe' || right.template !== 'guide-recipe')
    ) {
      fail(`normal spread ${left.spreadId} with distinct topics requires two guide-recipe pages`)
    }
  }
  return { pages: pageIds, spreads: new Set(spreadCounts.keys()), sections: sectionIds }
}

export function validateAll() {
  const sources = read('sources.json')
  const claims = read('claims.json')
  const reviews = read('reviews.json')
  const assets = read('assets.json')
  const templates = readFlatplan('templates.json').templates
  const album = readFlatplan('album.json')
  const guide = readFlatplan('guide.json')
  const reviewCycle = readProduction('review-dispatch.json')
  const sourceIds = validateSources(sources)
  const claimIds = validateClaims(claims, sourceIds)
  const verified = new Set(claims.filter((claim) => claim.status === 'verified').map((claim) => claim.id))
  validateReviews(reviews, claimIds, verified, reviewCycle)
  const assetIds = validateAssets(assets)
  validateAssetFiles(assets, path.resolve(root, '..'))
  validateFlatplan(album, 208, templates, assetIds)
  validateFlatplan(guide, 48, templates, assetIds)
  return { sources: sources.length, claims: claims.length, assets: assets.length }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const totals = validateAll()
  console.log(`book data ok: ${totals.sources} sources, ${totals.claims} claims, ${totals.assets} assets`)
}
