import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  discoverMarkdownFiles,
  validateManuscript,
  validateText,
} from './validate-manuscript.mjs'

const defaultBookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const roles = ['historian', 'technologist', 'medical']
const rfc3339WithOffset = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|([+-])(\d{2}):(\d{2}))$/u
const shaPattern = /^[a-f0-9]{64}$/u
const commitPattern = /^[a-f0-9]{40}$/u
const publicationClaimStatuses = new Set(['checked', 'verified'])

const isReviewCorpusClaim = ({ claimStatus, occurrences }) => (
  publicationClaimStatuses.has(claimStatus)
  || (
    claimStatus !== 'rejected'
    && Array.isArray(occurrences)
    && occurrences.length > 0
  )
)

export const reviewCorpusClaimIds = (claimIndex) => claimIndex
  .filter(isReviewCorpusClaim)
  .map(({ claimId }) => claimId)

const primaryFocus = {
  historian: [
    'hist-shennong-legend',
    'hist-tu-ambiguity',
    'hist-early-tea-evidence',
    'hist-warring-states-remains',
    'hist-fan-chuo-yinsheng',
    'hist-zhao-six-mountains',
    'hist-zhao-hundred-illnesses',
    'hist-zhao-author-name',
    'hist-ruan-retrospective',
    'hist-wuhou-records-east-han',
    'hist-puer-1700-years',
    'hist-zhuge-liang-local-legend',
    'hist-xu-bowuzhi-western-fan',
    'hist-qing-puer-administration',
    'hist-qing-tribute-tea',
    'hist-tea-horse-road-framing',
    'hist-fantianlu-composite-quote',
    'hist-modern-authenticity',
    'hist-popular-antiquity-corrections',
    'hist-popular-text-attribution-corrections',
    'hist-pressing-transport-hypothesis',
    'hist-twentieth-century-category-change',
    'prod-shou-chronology-disagreement',
    'prod-shou-antecedents',
    'prod-modern-gi-definition',
    'storage-regional-labels',
    'mountain-jingmai-cultural-landscape',
    'mountain-managed-tea-forest',
    'medical-historical-hundred-illnesses',
  ],
  technologist: [
    'prod-maocha-process',
    'prod-sheng-shou-distinct',
    'prod-shou-wodui-operations',
    'prod-green-removal-scope',
    'prod-ten-percent-moisture',
    'prod-fire-drying-always-worse',
    'prod-age-rules',
    'prod-sheng-shortened-shou',
    'prod-shou-chronology-disagreement',
    'prod-shou-antecedents',
    'prod-other-provinces-gi',
    'prod-120-subspecies',
    'prod-modern-gi-definition',
    'prod-maocha-material-control',
    'prod-shaqing-enzyme-scope',
    'prod-steam-press-dry-functions',
    'prod-wodui-not-compressed-aging',
    'prod-material-attribution-boundaries',
    'prod-maocha-process-visual-hypotheses',
    'storage-controlled-conditions',
    'storage-gbt30375-current',
    'storage-mould-is-damage',
    'storage-rh-aw-distinction',
    'storage-regional-labels',
    'storage-no-guaranteed-improvement',
    'micro-method-boundaries',
    'micro-abe-timecourse',
    'micro-ma-lab-succession',
    'micro-ma-chemical-shifts',
    'micro-zhang-cross-sectional',
    'micro-zhao-metaomics',
    'micro-haas-market-safety',
    'micro-chau-market-safety',
    'micro-safety-method-dependent',
    'micro-wodui-physical-gradients',
    'micro-aroma-pathway-boundary',
    'micro-causal-testing-boundaries',
    'mountain-large-leaf-material',
    'mountain-managed-tea-forest',
    'mountain-tree-age-boundary',
    'hist-modern-authenticity',
    'hist-twentieth-century-category-change',
    'medical-chemistry-not-clinical-efficacy',
    'medical-microbiome-preclinical',
    'medical-antioxidant-assays-not-outcomes',
    'medical-food-storage-safety',
    'medical-mycotoxin-evidence-limited',
  ],
  medical: [
    'medical-human-efficacy-is-extract-evidence',
    'medical-weight-extract-evidence',
    'medical-lipid-extract-evidence',
    'medical-glycaemia-inconclusive',
    'medical-enzyme-review-not-clinical',
    'medical-caffeine-general-guidance',
    'medical-pregnancy-caffeine-guidance',
    'medical-caffeine-alertness-sleep',
    'medical-chemistry-not-clinical-efficacy',
    'medical-microbiome-preclinical',
    'medical-antioxidant-assays-not-outcomes',
    'medical-historical-hundred-illnesses',
    'medical-food-storage-safety',
    'medical-mycotoxin-evidence-limited',
    'medical-interactions-individualize',
    'medical-no-universal-cup-limit',
    'medical-tea-not-treatment',
    'medical-disease-claims-rejected',
    'storage-controlled-conditions',
    'storage-mould-is-damage',
    'storage-rh-aw-distinction',
    'micro-haas-market-safety',
    'micro-chau-market-safety',
    'micro-safety-method-dependent',
  ],
}

const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'))
const clone = (value) => structuredClone(value)
const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const walkFiles = (folder, predicate) => {
  const found = []
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const filename = path.join(current, entry.name)
      if (entry.isDirectory()) visit(filename)
      else if (entry.isFile() && predicate(filename)) found.push(filename)
    }
  }
  visit(folder)
  return found
}

const repoRelative = (repoRoot, filename) => path.relative(repoRoot, filename).split(path.sep).join('/')

const parseRfc3339 = (value, field) => {
  const match = String(value ?? '').match(rfc3339WithOffset)
  if (!match) throw new Error(`${field} must be RFC3339 with an explicit offset`)
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone, , offsetHourText, offsetMinuteText] = match
  const [year, month, day, hour, minute, second] = [
    yearText, monthText, dayText, hourText, minuteText, secondText,
  ].map(Number)
  const maximumDay = month >= 1 && month <= 12
    ? new Date(Date.UTC(year, month, 0)).getUTCDate()
    : 0
  const offsetHour = zone === 'Z' ? 0 : Number(offsetHourText)
  const offsetMinute = zone === 'Z' ? 0 : Number(offsetMinuteText)
  if (
    day < 1 || day > maximumDay
    || hour > 23 || minute > 59 || second > 59
    || offsetHour > 23 || offsetMinute > 59
  ) {
    throw new Error(`${field} is not a real RFC3339 date-time`)
  }
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) throw new Error(`${field} is not a real RFC3339 date-time`)
  return parsed
}

const validateCycle = (config) => {
  if (config.schemaVersion !== 1) throw new Error(`unsupported review cycle schema: ${config.schemaVersion}`)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(config.cycleId ?? '')) throw new Error('cycleId must be a slug')
  const frozenAt = parseRfc3339(config.frozenAt, 'frozenAt')
  const deadline = parseRfc3339(config.deadline, 'deadline')
  if (deadline <= frozenAt) throw new Error('deadline must be later than frozenAt')
  if (config.deadlineStatus !== 'proposed') throw new Error('prepared cycle deadlineStatus must be proposed')
  if (config.status !== 'prepared-not-dispatched') throw new Error('prepared cycle status must be prepared-not-dispatched')
  if (!commitPattern.test(config.gitCommit ?? '')) throw new Error('gitCommit must be a full lowercase commit SHA')
  if (!Array.isArray(config.proofs) || config.proofs.length !== 2) throw new Error('review cycle requires album and guide proofs')
  const proofIds = config.proofs.map(({ id }) => id).sort()
  if (proofIds.join(',') !== 'album,guide') throw new Error('review cycle proof ids must be album and guide')
  for (const proof of config.proofs) {
    if (!shaPattern.test(proof.sha256 ?? '')) throw new Error(`invalid proof hash: ${proof.id}`)
    if (!Number.isInteger(proof.pages) || proof.pages < 1) throw new Error(`invalid proof page count: ${proof.id}`)
  }
}

const runGit = (repoRoot, args) => spawnSync('git', ['-C', repoRoot, ...args], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

const verifyGitFreeze = (repoRoot, gitCommit) => {
  const commit = runGit(repoRoot, ['cat-file', '-e', `${gitCommit}^{commit}`])
  if (commit.status !== 0) throw new Error(`gitCommit is not an available commit: ${gitCommit}`)
  const ancestor = runGit(repoRoot, ['merge-base', '--is-ancestor', gitCommit, 'HEAD'])
  if (ancestor.status !== 0) throw new Error(`gitCommit is not an ancestor of HEAD: ${gitCommit}`)
  const frozenPaths = [
    'book/config/publication.json',
    'book/data',
    'book/flatplan',
    'book/manuscript',
  ]
  const changedSinceFreeze = runGit(repoRoot, ['diff', '--quiet', gitCommit, '--', ...frozenPaths])
  if (changedSinceFreeze.status !== 0) throw new Error('frozen review inputs differ from gitCommit')
  const workingChanges = runGit(repoRoot, ['status', '--porcelain', '--', ...frozenPaths])
  if (workingChanges.status !== 0 || workingChanges.stdout.trim()) {
    throw new Error('frozen review inputs have uncommitted changes')
  }
}

const validateProofDeclarations = (bookRoot, repoRoot, config) => {
  const publication = readJson(path.join(bookRoot, 'config', 'publication.json'))
  const resolvedPaths = new Set()
  for (const proof of config.proofs) {
    const expectedPages = publication[proof.id]?.pages
    if (proof.pages !== expectedPages) {
      throw new Error(`proof page count mismatch: ${proof.id}; ${proof.pages} != ${expectedPages}`)
    }
    const resolvedPath = resolveProofPath(repoRoot, proof.path)
    if (resolvedPaths.has(resolvedPath)) throw new Error('album and guide proofs must use distinct paths')
    resolvedPaths.add(resolvedPath)
  }
}

const resolveProofPath = (root, filename) => (path.isAbsolute(filename) ? filename : path.resolve(root, filename))

export const verifyFrozenProofs = ({ root, config }) => {
  const proofPaths = new Map()
  for (const proof of config.proofs ?? []) {
    const filename = resolveProofPath(root, proof.path)
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) throw new Error(`frozen proof missing: ${proof.id}`)
    const bytes = fs.readFileSync(filename)
    if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error(`frozen proof is not a PDF: ${proof.id}`)
    const actual = sha256(bytes)
    if (actual !== proof.sha256) throw new Error(`proof hash mismatch: ${proof.id}; ${actual} != ${proof.sha256}`)
    if ([...proofPaths.values()].includes(filename)) throw new Error('album and guide proofs must use distinct paths')
    proofPaths.set(proof.id, filename)
  }
  if (proofPaths.size === 2 && proofPaths.has('album') && proofPaths.has('guide')) {
    const python = path.join(root, 'book', '.venv', 'bin', 'python')
    const verifier = path.join(root, 'book', 'scripts', 'verify_pdf.py')
    if (!fs.existsSync(python)) throw new Error('book PDF verifier runtime is missing; run the documented book environment setup')
    const checked = spawnSync(python, [
      verifier,
      proofPaths.get('album'),
      proofPaths.get('guide'),
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    if (checked.status !== 0) {
      const detail = (checked.stderr || checked.stdout || '').trim()
      throw new Error(`frozen proof preflight failed${detail ? `: ${detail}` : ''}`)
    }
  }
}

const pageRegistry = (bookRoot) => {
  const registry = new Map()
  for (const [publication, flatplanName] of [['album', 'album.json'], ['guide', 'guide.json']]) {
    const flatplan = readJson(path.join(bookRoot, 'flatplan', flatplanName))
    for (const page of flatplan.pages) {
      if (registry.has(page.id)) throw new Error(`duplicate flatplan page: ${page.id}`)
      registry.set(page.id, {
        publication,
        pageNumber: page.number,
        spreadId: page.spreadId,
        sectionId: page.sectionId,
        topicId: page.topicId,
      })
    }
  }
  return registry
}

const claimOccurrences = (bookRoot, repoRoot, claimIds, pages) => {
  const occurrences = new Map([...claimIds].map((id) => [id, []]))
  const manuscriptRoot = path.join(bookRoot, 'manuscript')
  for (const filename of discoverMarkdownFiles(manuscriptRoot, { trustedRoot: bookRoot })) {
    let currentPageId = null
    const relative = repoRelative(repoRoot, filename)
    const validationFile = path.relative(manuscriptRoot, filename).split(path.sep).join('/')
    const parsed = validateText(fs.readFileSync(filename, 'utf8'), {
      file: validationFile,
      knownClaimIds: claimIds,
      expectedPageIds: new Set(pages.keys()),
    })
    if (parsed.errors.length) {
      throw new Error(`review package requires a valid manuscript: ${parsed.errors[0].message}`)
    }
    const events = [
      ...parsed.pageMarkers.map((marker) => ({ ...marker, kind: 'page' })),
      ...parsed.claimMarkers.map((marker) => ({ ...marker, kind: 'claim' })),
    ].sort((left, right) => left.line - right.line)
    for (const event of events) {
      if (event.kind === 'page') {
        currentPageId = event.id
        if (!pages.has(currentPageId)) throw new Error(`unknown manuscript page: ${currentPageId}`)
        continue
      }
      const claimId = event.id
      if (!occurrences.has(claimId)) throw new Error(`unknown manuscript claim: ${claimId}`)
      if (!currentPageId) throw new Error(`claim marker before page marker: ${claimId}`)
      const page = pages.get(currentPageId)
      occurrences.get(claimId).push({
        pageId: currentPageId,
        publication: page.publication,
        pageNumber: page.pageNumber,
        spreadId: page.spreadId,
        sectionId: page.sectionId,
        topicId: page.topicId,
        manuscriptPath: relative,
        markerLine: event.line,
        pdfAnchor: currentPageId,
      })
    }
  }
  for (const [claimId, items] of occurrences) {
    const seen = new Set()
    occurrences.set(
      claimId,
      items.filter(({ pageId }) => {
        if (seen.has(pageId)) return false
        seen.add(pageId)
        return true
      }).sort((left, right) => (
        left.publication.localeCompare(right.publication, 'en')
        || left.pageNumber - right.pageNumber
      )),
    )
  }
  return occurrences
}

const buildClaimIndex = ({ bookRoot, repoRoot, claims, sources, config }) => {
  const sourceById = new Map(sources.map((source) => [source.id, source]))
  if (sourceById.size !== sources.length) throw new Error('duplicate source id in review corpus')
  const claimIds = new Set(claims.map(({ id }) => id))
  if (claimIds.size !== claims.length) throw new Error('duplicate claim id in review corpus')
  const pages = pageRegistry(bookRoot)
  const occurrences = claimOccurrences(bookRoot, repoRoot, claimIds, pages)
  const exceptions = config.registryOnlyClaims ?? {}
  const index = claims.map((claim) => {
    const claimOccurrences = occurrences.get(claim.id)
    const reviewCorpusMember = isReviewCorpusClaim({
      claimStatus: claim.status,
      occurrences: claimOccurrences,
    })
    const claimSources = (claim.sourceIds ?? []).map((sourceId) => {
      const source = sourceById.get(sourceId)
      if (!source) throw new Error(`review claim ${claim.id} references unknown source ${sourceId}`)
      if (reviewCorpusMember && source.status !== 'checked') throw new Error(`active review claim ${claim.id} uses unchecked source ${sourceId}`)
      return clone(source)
    })
    if (claimSources.length === 0) throw new Error(`review claim has no sources: ${claim.id}`)
    const exception = exceptions[claim.id]
    if (publicationClaimStatuses.has(claim.status) && claimOccurrences.length === 0 && !exception?.reason) {
      throw new Error(`active review claim has no proof page or registry-only reason: ${claim.id}`)
    }
    const contextPageIds = clone(exception?.contextPageIds ?? [])
    for (const pageId of contextPageIds) {
      if (!pages.has(pageId)) throw new Error(`registry-only claim ${claim.id} has unknown context page ${pageId}`)
    }
    return {
      claimId: claim.id,
      claimText: claim.text,
      claimStatus: claim.status,
      evidence: claim.evidence,
      sourceIds: clone(claim.sourceIds ?? []),
      occurrences: clone(claimOccurrences),
      registryOnlyReason: exception?.reason ?? null,
      contextPageIds,
      sources: claimSources,
    }
  })
  for (const claimId of Object.keys(exceptions)) {
    const item = index.find((claim) => claim.claimId === claimId)
    if (!item) throw new Error(`registry-only exception references unknown claim: ${claimId}`)
    if (!publicationClaimStatuses.has(item.claimStatus) || item.occurrences.length !== 0) throw new Error(`stale registry-only exception: ${claimId}`)
  }
  return index
}

const snapshot = (bookRoot, repoRoot) => {
  const fixed = [
    'book/config/review-cycle.json',
    'book/data/claims.json',
    'book/data/sources.json',
    'book/data/reviews.json',
    'book/flatplan/album.json',
    'book/flatplan/guide.json',
  ].map((relative) => path.join(repoRoot, relative))
  const manuscript = walkFiles(path.join(bookRoot, 'manuscript'), (filename) => filename.endsWith('.md'))
  const files = [...fixed, ...manuscript].map((filename) => ({
    path: repoRelative(repoRoot, filename),
    sha256: sha256(fs.readFileSync(filename)),
  })).sort((left, right) => left.path.localeCompare(right.path, 'en'))
  return { files, sha256: sha256(Buffer.from(canonicalJson(files))) }
}

const sourceLine = (source) => {
  const locator = source.doi ? `https://doi.org/${String(source.doi).replace(/^https?:\/\/doi\.org\//iu, '')}` : source.href
  return `${source.id} — ${source.author}; «${source.title}» (${source.year}); ${locator}`
}

const completeBibliography = (manuscriptBibliography, sources) => {
  const sourceById = new Map(sources.map((source) => [source.id, source]))
  const markerIds = [...manuscriptBibliography.matchAll(/<!-- source:([^ ]+) -->/gu)]
    .map(([, id]) => id)
  if (new Set(markerIds).size !== markerIds.length) throw new Error('duplicate source marker in manuscript bibliography')
  for (const id of markerIds) {
    if (!sourceById.has(id)) throw new Error(`bibliography references unknown source: ${id}`)
  }
  const missing = sources.filter(({ id }) => !markerIds.includes(id))
  if (!missing.length) return manuscriptBibliography
  const supplement = [
    '# Дополнение к замороженному реестру источников',
    '',
    'Ниже перечислены проверенные источники реестра, не вошедшие в публикационную библиографию frozen proof. Provenance-only запись исключена из читательских библиографических полос, но передаётся рецензентам для полноты исследовательского корпуса и проверки происхождения отклонённых тезисов.',
    '',
    ...missing.flatMap((source) => [
      `<!-- source:${source.id} -->`,
      '',
      sourceLine(source),
      '',
    ]),
  ].join('\n')
  return `${manuscriptBibliography.trimEnd()}\n\n${supplement.trimEnd()}\n`
}

const renderClaim = (claim, focusIds, kind = 'active') => {
  const pages = claim.occurrences.map(({ pageId }) => pageId)
  const pageText = pages.length
    ? pages.join(', ')
    : claim.contextPageIds.length
      ? `registry-only; context: ${claim.contextPageIds.join(', ')}`
      : 'исключён из frozen proof'
  const decision = kind === 'excluded'
    ? '**Решение по исключению:** `[ ] confirm-exclusion` `[ ] reopen-excluded` `[ ] not-in-scope`'
    : '**Решение рецензента:** `[ ] approve-wording` `[ ] changes-requested` `[ ] not-in-scope`'
  return [
    `## ${claim.claimId}${focusIds.has(claim.claimId) ? ' · PRIMARY FOCUS' : ''}`,
    `- Статус: \`${claim.claimStatus}\`; evidence: \`${claim.evidence}\``,
    `- Страницы: ${pageText}`,
    ...(claim.registryOnlyReason ? [`- Причина отсутствия отдельного маркера: ${claim.registryOnlyReason}`] : []),
    `- Источники: ${claim.sources.map(({ id }) => `\`${id}\``).join(', ')}`,
    '',
    claim.claimText,
    '',
    ...claim.sources.map((source) => `- ${sourceLine(source)}`),
    '',
    decision,
    '',
    'Комментарий / предлагаемая замена / дополнительный источник:',
    '',
    '---',
  ].join('\n')
}

const renderRequest = (request) => {
  const focusIds = new Set(request.primaryFocus.map(({ claimId }) => claimId))
  return [
    `# Specialist review request — ${request.role}`,
    '',
    `Cycle: \`${request.cycleId}\``,
    `Frozen commit: \`${request.gitCommit}\``,
    `Deadline: \`${request.deadline}\` (${request.deadlineStatus})`,
    `Proof set SHA-256: \`${request.proofSetSha256}\``,
    `Snapshot SHA-256: \`${request.snapshotSha256}\``,
    '',
    '> Это пустой пакет запроса. Он не содержит внешнего одобрения. Проверяются точная формулировка, границы вывода, указанные страницы и источники.',
    '',
    `Все ${request.activeClaims.length} тезисов корпуса включены fail-closed: каждый напечатанный и не отклонённый claim marker, а также зарегистрированный тезис со статусом \`checked\` или \`verified\`, получает решение historian, technologist и medical. \`PRIMARY FOCUS\` обозначает профильную часть; \`not-in-scope\` не считается одобрением.`,
    '',
    ...request.activeClaims.map((claim) => renderClaim(claim, focusIds)),
    '',
    '# Журнал исключённых тезисов профильной области',
    '',
    ...request.excludedFocus.map((claim) => renderClaim(claim, focusIds, 'excluded')),
  ].join('\n')
}

const responseTemplate = (request) => ({
  schemaVersion: 1,
  status: 'blank-template',
  cycleId: request.cycleId,
  role: request.role,
  proofSetSha256: request.proofSetSha256,
  snapshotSha256: request.snapshotSha256,
  deadline: request.deadline,
  reviewer: {
    name: null,
    affiliation: null,
    qualification: null,
    credentialEvidence: null,
    conflictOfInterest: null,
    funding: null,
  },
  decisions: request.activeClaims.map((claim) => ({
    claimId: claim.claimId,
    pageIdsToReview: claim.occurrences.length
      ? claim.occurrences.map(({ pageId }) => pageId)
      : clone(claim.contextPageIds),
    pageIdsReviewed: [],
    decisionOptions: ['approve-wording', 'changes-requested', 'not-in-scope'],
    decision: null,
    comment: null,
    proposedWording: null,
    additionalSources: [],
  })),
  excludedDecisions: request.excludedFocus.map((claim) => ({
    claimId: claim.claimId,
    decisionOptions: ['confirm-exclusion', 'reopen-excluded', 'not-in-scope'],
    decision: null,
    comment: null,
  })),
  overallDecision: null,
  submittedAt: null,
  signature: null,
})

const packageReadme = (manifest) => [
  '# Frozen specialist review package',
  '',
  `Cycle: \`${manifest.cycleId}\``,
  `Status: \`${manifest.status}\``,
  `Deadline: \`${manifest.deadline}\` (${manifest.deadlineStatus})`,
  '',
  `Attach both proof PDFs named in \`manifest.json\`. Verify their SHA-256 before review. Every role receives the same ${manifest.corpus.activeClaims} active claims and full bibliography; role-specific primary focus is marked in its request.`,
  '',
  'A blank response template is not approval. Do not edit `claims.json` or `reviews.json` until a real named reviewer returns a response tied to this exact proof and snapshot hash.',
  '',
  'Any manuscript or data change creates a new freeze cycle. Approval of an older proof is not transferred automatically.',
].join('\n')

const closeoutText = (manifest) => [
  '# Specialist review closeout — NOT CLOSED',
  '',
  `Cycle: \`${manifest.cycleId}\``,
  `Frozen commit: \`${manifest.gitCommit}\``,
  `Proof set SHA-256: \`${manifest.proofSetSha256}\``,
  `Snapshot SHA-256: \`${manifest.snapshotSha256}\``,
  `Proposed deadline: \`${manifest.deadline}\``,
  '',
  '**External approvals: 0. Status: PREPARED, NOT DISPATCHED, NOT CLOSED.**',
  '',
  '| Role | Reviewer | Qualification checked | Response hash | Decision |',
  '| --- | --- | --- | --- | --- |',
  '| historian | — | no | — | pending |',
  '| technologist | — | no | — | pending |',
  '| medical | — | no | — | pending |',
  '',
  '## Resolution log',
  '',
  'No external comments have been received. Record every future change by claim ID, page ID, old wording, new wording, source and reviewer disposition. After any change, build a new proof cycle and obtain approval for its new hashes.',
].join('\n')

export const buildReviewPackage = ({ root = defaultBookRoot, config: suppliedConfig = null, verifyProofs = true } = {}) => {
  const bookRoot = path.resolve(root)
  const repoRoot = path.dirname(bookRoot)
  const onDiskConfig = readJson(path.join(bookRoot, 'config', 'review-cycle.json'))
  const config = clone(suppliedConfig ?? onDiskConfig)
  validateCycle(config)
  validateProofDeclarations(bookRoot, repoRoot, config)
  if (suppliedConfig && canonicalJson(config) !== canonicalJson(onDiskConfig)) {
    throw new Error('suppliedConfig must exactly match the frozen on-disk review cycle')
  }
  verifyGitFreeze(repoRoot, config.gitCommit)
  validateManuscript({ root: bookRoot, log: false })
  if (verifyProofs) verifyFrozenProofs({ root: repoRoot, config })

  const claims = readJson(path.join(bookRoot, 'data', 'claims.json'))
  const sources = readJson(path.join(bookRoot, 'data', 'sources.json'))
  const reviews = readJson(path.join(bookRoot, 'data', 'reviews.json'))
  const claimIndex = buildClaimIndex({ bookRoot, repoRoot, claims, sources, config })
  const claimById = new Map(claimIndex.map((claim) => [claim.claimId, claim]))
  const activeClaimIds = new Set(reviewCorpusClaimIds(claimIndex))
  const activeClaims = claimIndex.filter(({ claimId }) => activeClaimIds.has(claimId))
  const snapshotData = snapshot(bookRoot, repoRoot)
  const proofSetSha256 = sha256(Buffer.from(canonicalJson(
    config.proofs.map(({ id, sha256: hash }) => ({ id, sha256: hash })).sort((left, right) => left.id.localeCompare(right.id, 'en')),
  )))
  if (path.isAbsolute(config.bibliographyPath ?? '')) throw new Error('bibliographyPath must be repository-relative')
  const bibliographyPath = path.resolve(repoRoot, config.bibliographyPath)
  const bibliographyRelative = path.relative(repoRoot, bibliographyPath)
  if (bibliographyRelative === '..' || bibliographyRelative.startsWith(`..${path.sep}`)) {
    throw new Error('bibliographyPath escapes the repository')
  }
  const bibliographyStat = fs.lstatSync(bibliographyPath)
  if (!bibliographyStat.isFile() || bibliographyStat.isSymbolicLink()) {
    throw new Error('bibliographyPath must point to a regular repository file')
  }
  const bibliography = completeBibliography(fs.readFileSync(bibliographyPath, 'utf8'), sources)

  const requests = Object.fromEntries(roles.map((role) => {
    const focus = primaryFocus[role].map((claimId) => {
      const claim = claimById.get(claimId)
      if (!claim) throw new Error(`primary focus references unknown claim: ${role}/${claimId}`)
      return claim
    })
    return [role, {
      schemaVersion: 1,
      status: 'blank-review-request',
      cycleId: config.cycleId,
      role,
      gitCommit: config.gitCommit,
      frozenAt: config.frozenAt,
      deadline: config.deadline,
      deadlineStatus: config.deadlineStatus,
      proofs: clone(config.proofs),
      proofSetSha256,
      snapshotSha256: snapshotData.sha256,
      activeClaims: clone(activeClaims),
      primaryFocus: clone(focus.filter(({ claimId }) => activeClaimIds.has(claimId))),
      excludedFocus: clone(focus.filter(({ claimStatus }) => claimStatus === 'rejected')),
    }]
  }))

  const files = new Map()
  files.set('bibliography.md', bibliography)
  files.set('data/claims-frozen.json', jsonText(claims))
  files.set('data/sources-frozen.json', jsonText(sources))
  files.set('data/reviews-baseline.json', jsonText(reviews))
  files.set('data/claim-page-index.json', jsonText(claimIndex))
  for (const role of roles) {
    files.set(`requests/${role}.json`, jsonText(requests[role]))
    files.set(`requests/${role}.md`, `${renderRequest(requests[role]).trimEnd()}\n`)
    files.set(`responses/${role}.template.json`, jsonText(responseTemplate(requests[role])))
  }

  const manifest = {
    schemaVersion: 1,
    cycleId: config.cycleId,
    status: config.status,
    frozenAt: config.frozenAt,
    deadline: config.deadline,
    deadlineStatus: config.deadlineStatus,
    gitCommit: config.gitCommit,
    proofs: clone(config.proofs),
    proofSetSha256,
    bibliography: {
      sourcePath: config.bibliographyPath,
      packagePath: 'bibliography.md',
      coverage: '48-publication-sources-plus-1-provenance-only-registry-supplement',
      sha256: sha256(Buffer.from(bibliography)),
    },
    snapshotFiles: snapshotData.files,
    snapshotSha256: snapshotData.sha256,
    corpus: {
      claims: claimIndex.length,
      activeClaims: activeClaims.length,
      rejectedClaims: claimIndex.filter(({ claimStatus }) => claimStatus === 'rejected').length,
      sources: sources.length,
      baselineReviews: reviews.length,
    },
    roles: Object.fromEntries(roles.map((role) => [role, {
      activeClaims: requests[role].activeClaims.length,
      primaryFocus: requests[role].primaryFocus.length,
      excludedFocus: requests[role].excludedFocus.length,
    }])),
  }
  files.set('README.md', `${packageReadme(manifest).trimEnd()}\n`)
  manifest.files = [...files.entries()].map(([relativePath, contents]) => ({
    path: relativePath,
    sha256: sha256(Buffer.from(contents)),
  })).sort((left, right) => left.path.localeCompare(right.path, 'en'))
  const manifestText = jsonText(manifest)
  files.set('manifest.json', manifestText)

  const dispatch = {
    schemaVersion: 1,
    cycleId: manifest.cycleId,
    status: 'prepared-not-dispatched',
    externalApprovals: 0,
    frozenAt: manifest.frozenAt,
    deadline: manifest.deadline,
    deadlineStatus: manifest.deadlineStatus,
    gitCommit: manifest.gitCommit,
    packagePath: `book/output/review/${manifest.cycleId}`,
    manifestSha256: sha256(Buffer.from(manifestText)),
    proofSetSha256: manifest.proofSetSha256,
    snapshotSha256: manifest.snapshotSha256,
    roles: manifest.roles,
    nextAction: 'Confirm deadline and name one credentialed external reviewer for each role before dispatch.',
  }
  return {
    manifest,
    requests,
    claimIndex,
    files,
    dispatch,
    closeout: closeoutText(manifest),
  }
}

const listRelativeFiles = (folder) => walkFiles(folder, () => true)
  .map((filename) => path.relative(folder, filename).split(path.sep).join('/'))
  .sort((left, right) => left.localeCompare(right, 'en'))

const writePackageDirectory = (target, files) => {
  if (fs.existsSync(target)) {
    const expected = [...files.keys()].sort((left, right) => left.localeCompare(right, 'en'))
    const actual = listRelativeFiles(target)
    const identical = JSON.stringify(actual) === JSON.stringify(expected)
      && expected.every((relative) => fs.readFileSync(path.join(target, relative)).equals(Buffer.from(files.get(relative))))
    if (identical) return false
    throw new Error(`refusing to overwrite non-identical frozen package: ${target}`)
  }
  const outputRoot = path.dirname(target)
  fs.mkdirSync(outputRoot, { recursive: true })
  const staging = fs.mkdtempSync(path.join(outputRoot, `.${path.basename(target)}-`))
  try {
    for (const [relative, contents] of files) {
      const filename = path.join(staging, relative)
      fs.mkdirSync(path.dirname(filename), { recursive: true })
      fs.writeFileSync(filename, contents)
    }
    fs.renameSync(staging, target)
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true })
    throw error
  }
  return true
}

const preparedStateAction = (filename, contents) => {
  const expected = Buffer.from(contents)
  if (fs.existsSync(filename)) {
    if (fs.readFileSync(filename).equals(expected)) return { action: 'unchanged', expected }
    throw new Error(`refusing to overwrite non-identical tracked review state: ${filename}`)
  }
  return { action: 'create', expected }
}

export const writePreparedState = (filename, contents) => {
  const { action, expected } = preparedStateAction(filename, contents)
  if (action === 'unchanged') return false
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  const staged = `${filename}.staged-${process.pid}`
  try {
    fs.writeFileSync(staged, expected)
    fs.renameSync(staged, filename)
  } finally {
    fs.rmSync(staged, { force: true })
  }
  return true
}

export const generateReviewPackage = ({ root = defaultBookRoot } = {}) => {
  const result = buildReviewPackage({ root, verifyProofs: true })
  const target = path.join(root, 'output', 'review', result.manifest.cycleId)
  const dispatchPath = path.join(root, 'production', 'review-dispatch.json')
  const closeoutPath = path.join(root, 'production', 'review-closeout.md')
  const dispatchContents = jsonText(result.dispatch)
  const closeoutContents = `${result.closeout.trimEnd()}\n`
  preparedStateAction(dispatchPath, dispatchContents)
  preparedStateAction(closeoutPath, closeoutContents)
  const created = writePackageDirectory(target, result.files)
  writePreparedState(dispatchPath, dispatchContents)
  writePreparedState(closeoutPath, closeoutContents)
  return { ...result, target, created }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generateReviewPackage()
  console.log(`${result.created ? 'review package written' : 'review package unchanged'}: ${result.target}`)
  console.log(`cycle ${result.manifest.cycleId}: ${result.manifest.corpus.activeClaims} active claims × 3 roles; external approvals: 0`)
}
