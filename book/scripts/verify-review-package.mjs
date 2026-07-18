import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  buildReviewPackage,
  reviewCorpusClaimIds,
} from './build-review-package.mjs'

export { reviewCorpusClaimIds }

const defaultBookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const roles = ['historian', 'technologist', 'medical']
const shaPattern = /^[a-f0-9]{64}$/u

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'))

const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const listFiles = (root) => {
  const files = []
  const visit = (folder) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const filename = path.join(folder, entry.name)
      if (entry.isDirectory()) visit(filename)
      else if (entry.isFile()) files.push(path.relative(root, filename).split(path.sep).join('/'))
    }
  }
  visit(root)
  return files.sort((left, right) => left.localeCompare(right, 'en'))
}

const sameJson = (left, right) => canonicalJson(left) === canonicalJson(right)

const assertExactKeys = (label, value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`)
  const actual = Object.keys(value).sort((left, right) => left.localeCompare(right, 'en'))
  const wanted = [...expected].sort((left, right) => left.localeCompare(right, 'en'))
  if (!sameJson(actual, wanted)) throw new Error(`${label} must contain exactly: ${wanted.join(', ')}`)
}

const safeRelativePath = (relative, label) => {
  if (typeof relative !== 'string' || relative.length === 0 || relative.includes('\\')) {
    throw new Error(`unsafe ${label}: ${String(relative)}`)
  }
  const normalized = path.posix.normalize(relative)
  if (normalized !== relative || path.posix.isAbsolute(relative) || relative === '..' || relative.startsWith('../')) {
    throw new Error(`unsafe ${label}: ${relative}`)
  }
  return relative
}

const validateHash = (value, label) => {
  if (!shaPattern.test(value ?? '')) throw new Error(`invalid SHA-256 for ${label}`)
}

const assertUniqueSortedPaths = (items, label) => {
  if (!Array.isArray(items)) throw new Error(`${label} must be an array`)
  const paths = items.map((item) => safeRelativePath(item?.path, `${label} path`))
  const unique = new Set(paths)
  if (unique.size !== paths.length) throw new Error(`duplicate path in ${label}`)
  const sorted = [...paths].sort((left, right) => left.localeCompare(right, 'en'))
  if (!sameJson(paths, sorted)) throw new Error(`${label} paths must be sorted`)
  return paths
}

const expectedPackageFiles = () => [
  'README.md',
  'bibliography.md',
  'data/claim-page-index.json',
  'data/claims-frozen.json',
  'data/reviews-baseline.json',
  'data/sources-frozen.json',
  'manifest.json',
  ...roles.flatMap((role) => [
    `requests/${role}.json`,
    `requests/${role}.md`,
    `responses/${role}.template.json`,
  ]),
].sort((left, right) => left.localeCompare(right, 'en'))

const verifyPackageFiles = (packageDir, manifest) => {
  const actual = listFiles(packageDir)
  const expected = expectedPackageFiles()
  const missing = expected.filter((relative) => !actual.includes(relative))
  const extra = actual.filter((relative) => !expected.includes(relative))
  if (missing.length || extra.length) {
    const details = [
      ...(missing.length ? [`missing ${missing.join(', ')}`] : []),
      ...(extra.length ? [`extra ${extra.join(', ')}`] : []),
    ]
    throw new Error(`package file set mismatch: ${details.join('; ')}`)
  }

  const manifestPaths = assertUniqueSortedPaths(manifest.files, 'manifest.files')
  const expectedManifestPaths = expected.filter((relative) => relative !== 'manifest.json')
  if (!sameJson(manifestPaths, expectedManifestPaths)) {
    throw new Error('manifest.files does not describe the exact canonical package file set')
  }
  for (const entry of manifest.files) {
    validateHash(entry.sha256, `package file ${entry.path}`)
    const actualHash = sha256(fs.readFileSync(path.join(packageDir, entry.path)))
    if (actualHash !== entry.sha256) throw new Error(`package file hash mismatch: ${entry.path}`)
  }
  return actual.length
}

const verifyDispatch = ({ dispatchPath, manifest, manifestBytes }) => {
  const dispatch = readJson(dispatchPath)
  validateHash(dispatch.manifestSha256, 'dispatch manifest')
  const actualManifestHash = sha256(manifestBytes)
  if (dispatch.manifestSha256 !== actualManifestHash) throw new Error('dispatch manifest hash mismatch')
  for (const field of ['cycleId', 'frozenAt', 'deadline', 'deadlineStatus', 'gitCommit', 'proofSetSha256', 'snapshotSha256']) {
    if (dispatch[field] !== manifest[field]) throw new Error(`dispatch ${field} differs from manifest`)
  }
  if (dispatch.status !== 'prepared-not-dispatched' || dispatch.externalApprovals !== 0) {
    throw new Error('dispatch must remain prepared-not-dispatched with zero external approvals')
  }
  if (!sameJson(dispatch.roles, manifest.roles)) throw new Error('dispatch roles differ from manifest')
}

const verifySnapshot = ({ repoRoot, manifest }) => {
  const snapshotPaths = assertUniqueSortedPaths(manifest.snapshotFiles, 'manifest.snapshotFiles')
  for (const [index, entry] of manifest.snapshotFiles.entries()) {
    validateHash(entry.sha256, `snapshot file ${entry.path}`)
    const filename = path.resolve(repoRoot, snapshotPaths[index])
    if (!filename.startsWith(`${path.resolve(repoRoot)}${path.sep}`)) throw new Error(`unsafe snapshot path: ${entry.path}`)
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) throw new Error(`snapshot file missing: ${entry.path}`)
    if (sha256(fs.readFileSync(filename)) !== entry.sha256) throw new Error(`snapshot file hash mismatch: ${entry.path}`)
  }
  validateHash(manifest.snapshotSha256, 'snapshotSha256')
  const composite = sha256(Buffer.from(canonicalJson(manifest.snapshotFiles)))
  if (composite !== manifest.snapshotSha256) throw new Error('snapshotSha256 mismatch')
}

const verifyCycleCrossLinks = ({ bookRoot, manifest }) => {
  const cycle = readJson(path.join(bookRoot, 'config/review-cycle.json'))
  if (Array.isArray(manifest.proofs)) {
    const repoRoot = path.dirname(bookRoot)
    const resolved = manifest.proofs.map((proof) => path.resolve(
      repoRoot,
      safeRelativePath(proof.path, `proof path ${proof.id}`),
    ))
    if (new Set(resolved).size !== resolved.length) throw new Error('proof paths must be distinct')
  }
  for (const field of ['schemaVersion', 'cycleId', 'status', 'frozenAt', 'deadline', 'deadlineStatus', 'gitCommit']) {
    if (manifest[field] !== cycle[field]) throw new Error(`manifest ${field} differs from review cycle`)
  }
  if (!sameJson(manifest.proofs, cycle.proofs)) throw new Error('manifest proofs differ from review cycle')
}

const verifyPdfSignature = (filename, proofId) => {
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) throw new Error(`frozen proof missing: ${proofId}`)
  const bytes = fs.readFileSync(filename)
  if (bytes.length < 16 || !bytes.subarray(0, 5).equals(Buffer.from('%PDF-')) || !bytes.subarray(-2048).includes(Buffer.from('%%EOF'))) {
    throw new Error(`invalid PDF signature: ${proofId}`)
  }
  return bytes
}

const verifyProofs = ({ bookRoot, repoRoot, manifest, pythonBinary }) => {
  if (!Array.isArray(manifest.proofs) || manifest.proofs.length !== 2) throw new Error('manifest must contain exactly two proofs')
  const proofIds = manifest.proofs.map(({ id }) => id)
  if (!sameJson(proofIds, ['album', 'guide'])) throw new Error('proofs must be ordered album, guide')
  const publication = readJson(path.join(bookRoot, 'config/publication.json'))
  const resolvedProofPaths = manifest.proofs.map((proof) => {
    const relative = safeRelativePath(proof.path, `proof path ${proof.id}`)
    const filename = path.resolve(repoRoot, relative)
    if (!filename.startsWith(`${path.resolve(repoRoot)}${path.sep}`)) throw new Error(`unsafe proof path: ${proof.id}`)
    return filename
  })
  if (new Set(resolvedProofPaths).size !== resolvedProofPaths.length) throw new Error('proof paths must be distinct')
  const proofPaths = []
  for (const [index, proof] of manifest.proofs.entries()) {
    validateHash(proof.sha256, `proof ${proof.id}`)
    const expectedPages = publication[proof.id]?.pages
    if (!Number.isInteger(proof.pages) || proof.pages !== expectedPages) throw new Error(`proof page count mismatch: ${proof.id}`)
    const filename = resolvedProofPaths[index]
    const bytes = verifyPdfSignature(filename, proof.id)
    if (sha256(bytes) !== proof.sha256) throw new Error(`proof hash mismatch: ${proof.id}`)
    proofPaths.push(filename)
  }
  const proofSet = manifest.proofs.map(({ id, sha256: hash }) => ({ id, sha256: hash }))
  validateHash(manifest.proofSetSha256, 'proofSetSha256')
  if (sha256(Buffer.from(canonicalJson(proofSet))) !== manifest.proofSetSha256) throw new Error('proofSetSha256 mismatch')

  const configuredPython = pythonBinary ?? process.env.PUER_REVIEW_PYTHON
  const venvPython = path.join(bookRoot, '.venv/bin/python')
  const executable = configuredPython ?? (fs.existsSync(venvPython) ? venvPython : 'python3')
  const verifier = path.join(bookRoot, 'scripts/verify_pdf.py')
  const result = spawnSync(executable, [verifier, ...proofPaths], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  if (result.error) throw new Error(`proof structure verifier could not run: ${result.error.message}`)
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    throw new Error(`proof structure verification failed${detail ? `: ${detail}` : ''}`)
  }
  return manifest.proofs.length
}

const ids = (items, label) => {
  if (!Array.isArray(items)) throw new Error(`${label} must be an array`)
  const values = items.map(({ claimId }) => claimId)
  if (values.some((value) => typeof value !== 'string') || new Set(values).size !== values.length) {
    throw new Error(`invalid or duplicate claim ID in ${label}`)
  }
  return values
}

const assertRequestMetadata = (request, manifest, role) => {
  if (request.schemaVersion !== 1 || request.status !== 'blank-review-request' || request.role !== role) {
    throw new Error(`invalid blank review request: ${role}`)
  }
  for (const field of ['cycleId', 'gitCommit', 'frozenAt', 'deadline', 'deadlineStatus', 'proofSetSha256', 'snapshotSha256']) {
    if (request[field] !== manifest[field]) throw new Error(`request ${field} differs: ${role}`)
  }
  if (!sameJson(request.proofs, manifest.proofs)) throw new Error(`request proofs differ: ${role}`)
}

const assertBlankTemplate = ({ template, manifest, role, activeIds }) => {
  const templateKeys = [
    'schemaVersion', 'status', 'cycleId', 'role', 'proofSetSha256', 'snapshotSha256',
    'deadline', 'reviewer', 'decisions', 'excludedDecisions', 'overallDecision',
    'submittedAt', 'signature',
  ]
  const reviewerKeys = [
    'name', 'affiliation', 'qualification', 'credentialEvidence',
    'conflictOfInterest', 'funding',
  ]
  const decisionKeys = [
    'claimId', 'pageIdsToReview', 'pageIdsReviewed', 'decisionOptions', 'decision',
    'comment', 'proposedWording', 'additionalSources',
  ]
  const excludedDecisionKeys = ['claimId', 'decisionOptions', 'decision', 'comment']
  const activeDecisionOptions = ['approve-wording', 'changes-requested', 'not-in-scope']
  const excludedDecisionOptions = ['confirm-exclusion', 'reopen-excluded', 'not-in-scope']
  const exactKeys = (value, expected) => value
    && typeof value === 'object'
    && !Array.isArray(value)
    && sameJson(Object.keys(value).sort((left, right) => left.localeCompare(right, 'en')), [...expected].sort((left, right) => left.localeCompare(right, 'en')))
  const metadataMatches = exactKeys(template, templateKeys)
    && template.schemaVersion === 1
    && template.status === 'blank-template'
    && template.role === role
    && template.cycleId === manifest.cycleId
    && template.deadline === manifest.deadline
    && template.proofSetSha256 === manifest.proofSetSha256
    && template.snapshotSha256 === manifest.snapshotSha256
  const reviewerBlank = exactKeys(template.reviewer, reviewerKeys)
    && Object.values(template.reviewer).every((value) => value === null)
  const decisionIds = ids(template.decisions, `response decisions ${role}`)
  const decisionsBlank = sameJson(decisionIds, activeIds)
    && template.decisions.every((decision) => (
      exactKeys(decision, decisionKeys)
      && decision.decision === null
      && decision.comment === null
      && decision.proposedWording === null
      && Array.isArray(decision.pageIdsToReview)
      && Array.isArray(decision.pageIdsReviewed)
      && decision.pageIdsReviewed.length === 0
      && sameJson(decision.decisionOptions, activeDecisionOptions)
      && Array.isArray(decision.additionalSources)
      && decision.additionalSources.length === 0
    ))
  const excludedBlank = Array.isArray(template.excludedDecisions)
    && template.excludedDecisions.every((decision) => (
      exactKeys(decision, excludedDecisionKeys)
      && sameJson(decision.decisionOptions, excludedDecisionOptions)
      && decision.decision === null
      && decision.comment === null
    ))
  const conclusionBlank = template.overallDecision === null && template.submittedAt === null && template.signature === null
  if (!metadataMatches || !reviewerBlank || !decisionsBlank || !excludedBlank || !conclusionBlank) {
    throw new Error(`response template is not blank: ${role}`)
  }
}

const verifyRoles = ({ packageDir, manifest }) => {
  assertExactKeys('manifest.roles', manifest.roles, roles)
  const frozenClaims = readJson(path.join(packageDir, 'data/claims-frozen.json'))
  const claimIndex = readJson(path.join(packageDir, 'data/claim-page-index.json'))
  if (!Array.isArray(frozenClaims) || !Array.isArray(claimIndex)) {
    throw new Error('frozen claims and claim page index must be arrays')
  }
  const frozenById = new Map(frozenClaims.map((claim) => [claim.id, claim]))
  if (frozenById.size !== frozenClaims.length || claimIndex.length !== frozenClaims.length) {
    throw new Error('frozen claims and claim page index differ')
  }
  for (const claim of claimIndex) {
    const frozen = frozenById.get(claim.claimId)
    if (!frozen || frozen.status !== claim.claimStatus || !Array.isArray(claim.occurrences)) {
      throw new Error(`claim page index differs from frozen claim: ${claim.claimId}`)
    }
  }
  const activeIds = ids(
    reviewCorpusClaimIds(claimIndex).map((claimId) => ({ claimId })),
    'active frozen claims',
  )
  if (activeIds.length === 0 || frozenClaims.some(({ status }) => !['draft', 'checked', 'verified', 'rejected'].includes(status))) {
    throw new Error('frozen claims contain no active corpus or an invalid status')
  }
  if (manifest.corpus?.activeClaims !== activeIds.length) {
    throw new Error('manifest active corpus count differs')
  }
  const activeIdSet = new Set(activeIds)
  const baseline = readJson(path.join(packageDir, 'data/reviews-baseline.json'))
  if (!Array.isArray(baseline) || baseline.some(({ status }) => status !== 'pending')) {
    throw new Error('baseline reviews contain an external approval')
  }

  for (const role of roles) {
    const request = readJson(path.join(packageDir, `requests/${role}.json`))
    assertRequestMetadata(request, manifest, role)
    const requestActiveIds = ids(request.activeClaims, `active claims ${role}`)
    if (!sameJson(requestActiveIds, activeIds)) throw new Error(`active claim IDs differ: ${role}`)
    if (request.activeClaims.some(({ claimId }) => !activeIdSet.has(claimId))) throw new Error(`non-active claim in request: ${role}`)
    if (manifest.roles[role].activeClaims !== activeIds.length
      || manifest.roles[role].primaryFocus !== request.primaryFocus.length
      || manifest.roles[role].excludedFocus !== request.excludedFocus.length) {
      throw new Error(`manifest role counts differ: ${role}`)
    }
    const template = readJson(path.join(packageDir, `responses/${role}.template.json`))
    assertBlankTemplate({ template, manifest, role, activeIds })
  }
  return activeIds.length
}

const verifyDeterministicFreeze = ({ bookRoot, packageDir }) => {
  const expected = buildReviewPackage({ root: bookRoot, verifyProofs: false })
  for (const [relative, contents] of expected.files) {
    if (relative === 'manifest.json') continue
    const actual = fs.readFileSync(path.join(packageDir, relative))
    if (!actual.equals(Buffer.from(contents))) {
      throw new Error(`package differs from deterministic frozen source: ${relative}`)
    }
  }
  const actualManifestBytes = fs.readFileSync(path.join(packageDir, 'manifest.json'))
  const actualManifest = JSON.parse(actualManifestBytes.toString('utf8'))
  const expectedManifestBytes = Buffer.from(
    expected.files.get('manifest.json') ?? `${JSON.stringify(expected.manifest, null, 2)}\n`,
  )
  if (!sameJson(actualManifest, expected.manifest) || !actualManifestBytes.equals(expectedManifestBytes)) {
    throw new Error('manifest differs from deterministic frozen source')
  }
}

export const verifyReviewPackage = ({
  bookRoot = defaultBookRoot,
  packageDir: suppliedPackageDir = null,
  dispatchPath: suppliedDispatchPath = null,
  pythonBinary = null,
} = {}) => {
  const resolvedBookRoot = path.resolve(bookRoot)
  const repoRoot = path.dirname(resolvedBookRoot)
  const dispatchPath = path.resolve(suppliedDispatchPath ?? path.join(resolvedBookRoot, 'production/review-dispatch.json'))
  if (!fs.existsSync(dispatchPath) || !fs.statSync(dispatchPath).isFile()) throw new Error(`review dispatch missing: ${dispatchPath}`)
  const initialDispatch = readJson(dispatchPath)
  const packageDir = path.resolve(suppliedPackageDir ?? path.resolve(repoRoot, safeRelativePath(initialDispatch.packagePath, 'dispatch packagePath')))
  if (!fs.existsSync(packageDir) || !fs.statSync(packageDir).isDirectory()) throw new Error(`review package missing: ${packageDir}`)

  const manifestPath = path.join(packageDir, 'manifest.json')
  if (!fs.existsSync(manifestPath) || !fs.statSync(manifestPath).isFile()) throw new Error('package file set mismatch: missing manifest.json')
  const manifestBytes = fs.readFileSync(manifestPath)
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  if (manifest.schemaVersion !== 1 || manifest.status !== 'prepared-not-dispatched') throw new Error('invalid frozen review manifest status or schema')
  const fileCount = verifyPackageFiles(packageDir, manifest)
  verifyDispatch({ dispatchPath, manifest, manifestBytes })
  verifySnapshot({ repoRoot, manifest })
  verifyCycleCrossLinks({ bookRoot: resolvedBookRoot, manifest })
  const proofCount = verifyProofs({
    bookRoot: resolvedBookRoot,
    repoRoot,
    manifest,
    pythonBinary,
  })
  const activeClaims = verifyRoles({ packageDir, manifest })
  verifyDeterministicFreeze({ bookRoot: resolvedBookRoot, packageDir })
  return {
    cycleId: manifest.cycleId,
    files: fileCount,
    roles: roles.length,
    activeClaims,
    proofs: proofCount,
    proofStructureVerified: true,
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const packageDir = process.argv[2] ? path.resolve(process.argv[2]) : null
    const report = verifyReviewPackage({ packageDir })
    console.log(`review package verification passed: ${report.cycleId}`)
    console.log(`${report.files} exact files; ${report.activeClaims} active claims × ${report.roles} roles; ${report.proofs} proofs structurally verified`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
