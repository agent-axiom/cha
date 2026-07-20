import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dataValidator from '../scripts/validate-data.mjs'

const {
  validateSources,
  validateClaims,
  validateReviews,
  validateAssets,
} = dataValidator

const reviewCycle = {
  cycleId: 'specialist-review-2026-01',
  proofSetSha256: 'a'.repeat(64),
  snapshotSha256: 'b'.repeat(64),
  frozenAt: '2026-07-18T08:38:08+03:00',
  status: 'dispatched',
  deadline: '2026-08-01T18:00:00+03:00',
  deadlineStatus: 'confirmed',
}

const responseBytes = (role) => Buffer.from(`immutable external response: ${role}\n`, 'utf8')
const responseSha256 = (role) => createHash('sha256').update(responseBytes(role)).digest('hex')
const approvalEvidence = (overrides = {}) => ({
  claimStatusById: new Map([['c1', 'checked']]),
  allowedPageIdsByClaim: new Map([['c1', new Set(['A-P001', 'A-P002'])]]),
  excludedClaimIds: new Set(),
  responseSha256ByRole: new Map([
    ['historian', responseSha256('historian')],
    ['technologist', responseSha256('technologist')],
    ['medical', responseSha256('medical')],
  ]),
  ...overrides,
})

const externalApproval = (role, overrides = {}) => ({
  claimId: 'c1',
  role,
  status: 'approved',
  decision: 'approve-wording',
  cycleId: reviewCycle.cycleId,
  proofSetSha256: reviewCycle.proofSetSha256,
  snapshotSha256: reviewCycle.snapshotSha256,
  reviewedAt: '2026-07-18T09:30:00+03:00',
  submittedAt: '2026-07-18T10:00:00+03:00',
  responseSha256: responseSha256(role),
  pageIdsReviewed: ['A-P001'],
  reviewer: {
    name: 'Dr Li Ming',
    affiliation: 'Yunnan Agricultural University',
    qualification: 'Associate professor of tea science',
    credentialEvidence: 'https://www.ynau.edu.cn/faculty/li-ming',
    conflictOfInterest: 'No relevant conflict of interest declared.',
    funding: 'No external funding declared.',
  },
  ...overrides,
})

const bookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readBookJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(bookRoot, relativePath), 'utf8'))
const expectedTemplateIds = [
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
const publicationClasses = [
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
]
const documentClasses = [
  'research-publication',
  'historical-access-copy',
  'critical-edition',
  'facsimile',
  'catalog-record',
  'manuscript-catalog',
  'community-excerpt',
  'institutional-record',
  'corporate-record',
  'standard',
  'guidance',
  'institutional-heritage-record',
  'trial-registration',
]
const evidenceRoles = [
  'primary-text',
  'textual-witness',
  'catalog-provenance',
  'disputed-retrospective-attribution',
  'research-evidence',
  'institutional-retrospective',
  'corporate-retrospective',
  'normative-standard',
  'safety-guidance',
  'contextual-institutional-record',
  'trial-registry-record',
  'provenance-only',
]
const sourceFixture = (overrides = {}) => ({
  id: 'a',
  title: 'A',
  href: 'https://a.example',
  group: 'guidance',
  status: 'checked',
  bookUse: 'core',
  siteVisible: true,
  publicationClass: 'standard-guidance',
  documentClass: 'standard',
  evidenceRole: 'normative-standard',
  ...overrides,
})

test('defines one complete source taxonomy for exactly the observed classification pairs', () => {
  const taxonomyPath = path.join(bookRoot, 'data', 'source-taxonomy.json')
  assert.equal(fs.existsSync(taxonomyPath), true, 'missing canonical source taxonomy')
  const taxonomy = readBookJson('data/source-taxonomy.json')
  const taxonomyDocumentClasses = taxonomy.documentClasses.map(({ id }) => id)
  const taxonomyEvidenceRoles = taxonomy.evidenceRoles.map(({ id }) => id)
  assert.deepEqual(taxonomyDocumentClasses, documentClasses)
  assert.deepEqual(taxonomyEvidenceRoles, evidenceRoles)
  assert.ok(taxonomy.documentClasses.every(({ readerLabel }) => typeof readerLabel === 'string' && readerLabel.trim()))
  assert.ok(taxonomy.evidenceRoles.every(({ readerLabel }) => typeof readerLabel === 'string' && readerLabel.trim()))

  const expectedPairs = new Set(readBookJson('data/sources.json').map(({ documentClass, evidenceRole }) => `${documentClass}\u0000${evidenceRole}`))
  const allowedPairs = new Set(taxonomy.allowedPairs.map(({ documentClass, evidenceRole }) => `${documentClass}\u0000${evidenceRole}`))
  assert.equal(allowedPairs.size, 16)
  assert.deepEqual(allowedPairs, expectedPairs)
})
const expectedAlbumSections = [
  ['entry', 20, 1, 20],
  ['living-mountain', 26, 21, 46],
  ['roads-name', 30, 47, 76],
  ['maocha', 24, 77, 100],
  ['sheng-shou', 30, 101, 130],
  ['microcosm', 24, 131, 154],
  ['body', 22, 155, 176],
  ['tea-room', 16, 177, 192],
  ['apparatus', 16, 193, 208],
]
const expectedGuideSections = [
  ['quick-start', 6, 1, 6],
  ['choosing-tea', 6, 7, 12],
  ['tools-water', 8, 13, 20],
  ['sheng', 8, 21, 28],
  ['shou', 8, 29, 36],
  ['simple-methods', 6, 37, 42],
  ['tasting', 4, 43, 46],
  ['safety', 2, 47, 48],
]

const flatplanData = () => ({
  templates: readBookJson('flatplan/templates.json').templates,
  album: readBookJson('flatplan/album.json'),
  guide: readBookJson('flatplan/guide.json'),
  assets: readBookJson('data/assets.json'),
})

const validateFlatplan = (...args) => {
  assert.equal(typeof dataValidator.validateFlatplan, 'function', 'validateFlatplan must be exported')
  return dataValidator.validateFlatplan(...args)
}

const expectedPageId = (prefix, number) => `${prefix}-P${String(number).padStart(3, '0')}`
const expectedSpreadId = (prefix, number) => `${prefix}-S${String(Math.floor(number / 2) + 1).padStart(3, '0')}`
const sectionSummary = (sections) => sections.map(({ id, pageCount, start, end }) => [id, pageCount, start, end])
const recipeKeys = [
  'adjustmentNote',
  'firstInfusionRangeSec',
  'leafMassG',
  'methodId',
  'recipeId',
  'teaStyle',
  'temperatureRangeC',
  'title',
  'vesselVolumeMl',
]
const simpleMethodIds = [
  'mug-sheng',
  'mug-shou',
  'large-pot-sheng',
  'large-pot-shou',
  'thermos-sheng',
  'thermos-shou',
]
const expectedGuideRecipePages = [
  ['G-P018', 'tools-water-t04', 'calibrate-water-temperature', 'water-temperature-calibration'],
  ['G-P019', 'tools-water-t05', 'calibrate-leaf-ratio', 'leaf-ratio-calibration'],
  ['G-P022', 'sheng-t02', 'gaiwan-young-sheng', 'gaiwan-sheng-young'],
  ['G-P023', 'sheng-t03', 'gaiwan-aged-sheng', 'gaiwan-sheng-aged'],
  ['G-P024', 'sheng-t04', 'teapot-young-sheng', 'teapot-sheng-young'],
  ['G-P025', 'sheng-t05', 'teapot-aged-sheng', 'teapot-sheng-aged'],
  ['G-P030', 'shou-t02', 'gaiwan-loose-shou', 'gaiwan-shou-loose'],
  ['G-P031', 'shou-t03', 'gaiwan-compressed-shou', 'gaiwan-shou-compressed'],
  ['G-P032', 'shou-t04', 'teapot-loose-shou', 'teapot-shou-loose'],
  ['G-P033', 'shou-t05', 'teapot-compressed-shou', 'teapot-shou-compressed'],
  ['G-P037', 'simple-methods-t01', 'mug-sheng', 'mug-sheng'],
  ['G-P038', 'simple-methods-t02', 'large-pot-sheng', 'large-pot-sheng'],
  ['G-P039', 'simple-methods-t03', 'large-pot-shou', 'large-pot-shou'],
  ['G-P040', 'simple-methods-t04', 'thermos-sheng', 'thermos-sheng'],
  ['G-P041', 'simple-methods-t05', 'thermos-shou', 'thermos-shou'],
  ['G-P042', 'simple-methods-t06', 'mug-shou', 'mug-shou'],
]
const genericRolePattern = /(?:полоса|шаг)\s+\d+|\b\d+\s+из\s+\d+/iu

const pagesBySpread = (plan) => Map.groupBy(plan.pages, ({ spreadId }) => spreadId)

const assertEditorialTopics = (plan) => {
  const roles = new Set()
  for (const section of plan.sections) {
    assert.ok(Array.isArray(section.requiredTopics) && section.requiredTopics.length > 0)
    const declared = new Map(section.requiredTopics.map((topic) => [topic.id, topic]))
    const pages = plan.pages.filter(({ sectionId }) => sectionId === section.id)
    const used = new Set()
    for (const page of pages) {
      assert.ok(!genericRolePattern.test(page.role), `${page.id} has generic role: ${page.role}`)
      assert.ok(!roles.has(page.role), `${page.id} repeats role: ${page.role}`)
      roles.add(page.role)
      const topic = declared.get(page.topicId)
      assert.ok(topic, `${page.id} topic is undeclared`)
      if (page.template === 'guide-recipe') {
        assert.deepEqual(topic.expectedMethodIds, [page.recipe.methodId], `${page.id} topic/method is ambiguous`)
      } else {
        assert.equal(topic.expectedMethodIds, undefined, `${page.id} nonrecipe topic carries a recipe mapping`)
        assert.equal(topic.title, page.spreadTitle, `${page.id} topic/title is undeclared`)
      }
      used.add(page.topicId)
    }
    assert.deepEqual([...used].sort(), [...declared.keys()].sort(), `${section.id} has unused required topics`)
  }
  for (const [spreadId, pages] of pagesBySpread(plan)) {
    if (new Set(pages.map(({ sectionId }) => sectionId)).size === 1) {
      if (new Set(pages.map(({ topicId }) => topicId)).size > 1) {
        assert.ok(pages.every(({ template }) => template === 'guide-recipe'), `${spreadId} has multiple ordinary-spread topics`)
      }
      assert.equal(new Set(pages.map(({ spreadTitle }) => spreadTitle)).size, 1, `${spreadId} has multiple normal-spread titles`)
    }
  }
}

const temporaryRoots = []
after(() => {
  for (const temporaryRoot of temporaryRoots) fs.rmSync(temporaryRoot, { recursive: true, force: true })
})

const temporaryRepo = () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'book-asset-files-'))
  temporaryRoots.push(temporaryRoot)
  return temporaryRoot
}

const writeFixture = (temporaryRoot, relativePath, contents = 'fixture') => {
  const filename = path.join(temporaryRoot, relativePath)
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  fs.writeFileSync(filename, contents)
  return filename
}

const printReadyAsset = (overrides = {}) => ({
  id: 'img-1',
  kind: 'photo',
  title: 'Licensed print image',
  creator: 'Example photographer',
  createdAt: '2026-07-17',
  location: 'Example studio',
  sourceUrl: 'https://assets.example/img-1',
  rights: 'licensed',
  licenseFile: 'book/assets/rights/img-1.md',
  creditLine: 'Example photographer',
  path: 'book/assets/private/a.tif',
  pixelWidth: 3000,
  pixelHeight: 3000,
  effectiveDpi: 300,
  status: 'print-ready',
  spreadIds: ['A-P001'],
  placementWidthMm: 254,
  placementHeightMm: 254,
  ...overrides,
})

const printReadyVector = (overrides = {}) => ({
  ...printReadyAsset(),
  id: 'map-1',
  kind: 'map',
  path: 'book/assets/maps/map-1.svg',
  licenseFile: 'book/assets/rights/map-1.md',
  pixelWidth: null,
  pixelHeight: null,
  effectiveDpi: null,
  viewBox: '0 0 1000 800',
  ...overrides,
})

const validateAssetFiles = (...args) => {
  assert.equal(typeof dataValidator.validateAssetFiles, 'function', 'validateAssetFiles must be exported')
  return dataValidator.validateAssetFiles(...args)
}

test('rejects duplicate source ids', () => {
  assert.throws(() => validateSources([sourceFixture(), sourceFixture({ title: 'B', href: 'https://b.example' })]), /duplicate source id: a/)
})

test('rejects missing source ids', () => {
  assert.throws(() => validateSources([{ title: 'A', href: 'https://a.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: true }]), /source requires nonblank id/)
})

test('rejects empty source ids', () => {
  assert.throws(() => validateSources([{ id: '', title: 'A', href: 'https://a.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: true }]), /source requires nonblank id/)
})

test('rejects whitespace-only source ids', () => {
  assert.throws(() => validateSources([{ id: '   ', title: 'A', href: 'https://a.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: true }]), /source requires nonblank id/)
})

test('rejects non-string source ids', () => {
  assert.throws(() => validateSources([{ id: 1, title: 'A', href: 'https://a.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: true }]), /source requires nonblank id/)
})

test('rejects invalid source groups', () => {
  assert.throws(() => validateSources([{ id: 'a', title: 'A', href: 'https://a.example', group: 'other', status: 'checked', bookUse: 'core', siteVisible: true }]), /invalid source group: other/)
})

test('rejects invalid source book use', () => {
  assert.throws(() => validateSources([{ id: 'a', title: 'A', href: 'https://a.example', group: 'guidance', status: 'checked', bookUse: 'other', siteVisible: true }]), /invalid source book use: other/)
})

test('requires a deliberate publication classification for every source', () => {
  const valid = sourceFixture({ publicationClass: undefined })
  assert.throws(() => validateSources([valid]), /invalid source publication class: undefined/)
  assert.throws(() => validateSources([{ ...valid, publicationClass: 'misc' }]), /invalid source publication class: misc/)
  for (const publicationClass of publicationClasses) {
    assert.doesNotThrow(() => validateSources([{ ...valid, publicationClass }]))
  }
})

test('accepts only enumerated document classes, evidence roles, and exact allowed pairs', () => {
  const taxonomy = readBookJson('data/source-taxonomy.json')
  assert.throws(() => validateSources([sourceFixture({ documentClass: undefined })]), /invalid source document class: undefined/)
  assert.throws(() => validateSources([sourceFixture({ documentClass: 'misc' })]), /invalid source document class: misc/)
  assert.throws(() => validateSources([sourceFixture({ evidenceRole: undefined })]), /invalid source evidence role: undefined/)
  assert.throws(() => validateSources([sourceFixture({ evidenceRole: 'misc' })]), /invalid source evidence role: misc/)
  for (const { documentClass, evidenceRole } of taxonomy.allowedPairs) {
    assert.doesNotThrow(() => validateSources([sourceFixture({ documentClass, evidenceRole })]), `${documentClass}+${evidenceRole}`)
  }
  for (const [documentClass, evidenceRole] of [
    ['catalog-record', 'primary-text'],
    ['research-publication', 'normative-standard'],
    ['guidance', 'research-evidence'],
  ]) {
    assert.throws(
      () => validateSources([sourceFixture({ documentClass, evidenceRole })]),
      new RegExp(`invalid source classification pair: ${documentClass}\\+${evidenceRole}`, 'u'),
    )
  }
})

test('rejects an incompatible evidence-role mutation for every observed source pair', () => {
  const taxonomy = readBookJson('data/source-taxonomy.json')
  const allowedPairs = new Set(taxonomy.allowedPairs.map(({ documentClass, evidenceRole }) => `${documentClass}\u0000${evidenceRole}`))
  const roles = taxonomy.evidenceRoles.map(({ id }) => id)
  const representativeByPair = new Map()
  for (const source of readBookJson('data/sources.json')) {
    representativeByPair.set(`${source.documentClass}\u0000${source.evidenceRole}`, source)
  }
  assert.equal(representativeByPair.size, 16)

  for (const source of representativeByPair.values()) {
    const incompatibleRole = roles.find((role) => !allowedPairs.has(`${source.documentClass}\u0000${role}`))
    assert.ok(incompatibleRole, `${source.documentClass}: expected an incompatible role`)
    assert.throws(
      () => validateSources([{ ...source, evidenceRole: incompatibleRole }]),
      /invalid source classification pair/u,
      `${source.documentClass}+${source.evidenceRole} -> ${incompatibleRole}`,
    )
  }
})

test('classifies the highlighted records by document form and role in this book', () => {
  const sources = new Map(readBookJson('data/sources.json').map((source) => [source.id, source]))
  const expected = new Map([
    ['ruan-puer-cha-ji-access', ['historical-access-copy', 'disputed-retrospective-attribution']],
    ['ruan-dianbi-catalog', ['manuscript-catalog', 'catalog-provenance']],
    ['guangzhou-db4401-258-2024', ['standard', 'institutional-retrospective']],
    ['unesco-jingmai', ['institutional-heritage-record', 'contextual-institutional-record']],
  ])
  for (const [id, [documentClass, evidenceRole]] of expected) {
    assert.equal(sources.get(id).documentClass, documentClass, `${id}: documentClass`)
    assert.equal(sources.get(id).evidenceRole, evidenceRole, `${id}: evidenceRole`)
  }
  assert.notEqual(sources.get('guangzhou-db4401-258-2024').evidenceRole, 'normative-standard')
  assert.notEqual(sources.get('unesco-jingmai').documentClass, 'standard')
})

test('rejects non-boolean source visibility', () => {
  assert.throws(() => validateSources([sourceFixture({ siteVisible: 'true' })]), /source siteVisible must be boolean: a/)
})

test('rejects claims with missing sources', () => {
  assert.throws(() => validateClaims([{ id: 'c1', text: 'x', evidence: 'source', sourceIds: ['missing'], status: 'draft' }], new Set()), /unknown source missing/)
})

test('rejects missing, empty, and whitespace-only claim ids', () => {
  for (const id of [undefined, '', '   ']) {
    assert.throws(() => validateClaims([{ id, text: 'x', evidence: 'source', sourceIds: [], status: 'draft' }], new Set()), /claim requires nonblank id/)
  }
})

test('requires three review roles for verified claims', () => {
  assert.throws(
    () => validateReviews([externalApproval('historian')], new Set(['c1']), new Set(['c1']), reviewCycle, approvalEvidence()),
    /missing required review/,
  )
})

test('rejects a minimal approved review without external reviewer evidence', () => {
  assert.throws(
    () => validateReviews([{ claimId: 'c1', role: 'historian', status: 'approved' }], new Set(['c1']), new Set(), reviewCycle),
    /approved review requires decision: c1\/historian/,
  )
})

test('requires approved reviews to match the exact frozen review cycle and proof hashes', () => {
  for (const [field, value] of [
    ['cycleId', 'another-cycle'],
    ['proofSetSha256', 'd'.repeat(64)],
    ['snapshotSha256', 'e'.repeat(64)],
  ]) {
    assert.throws(
      () => validateReviews([externalApproval('historian', { [field]: value })], new Set(['c1']), new Set(), reviewCycle, approvalEvidence()),
      new RegExp(`approved review ${field} does not match frozen cycle: c1/historian`),
    )
  }
})

test('requires substantive identity, credentials, and conflict-of-interest metadata for approvals', () => {
  for (const reviewer of [
    { ...externalApproval('historian').reviewer, name: 'x' },
    { ...externalApproval('historian').reviewer, affiliation: 'x' },
    { ...externalApproval('historian').reviewer, qualification: 'x' },
    { ...externalApproval('historian').reviewer, credentialEvidence: 'profile' },
    { ...externalApproval('historian').reviewer, conflictOfInterest: 'none' },
    { ...externalApproval('historian').reviewer, funding: 'none' },
  ]) {
    assert.throws(
      () => validateReviews([externalApproval('historian', { reviewer })], new Set(['c1']), new Set(), reviewCycle, approvalEvidence()),
      /approved review requires valid reviewer metadata: c1\/historian/,
    )
  }
})

test('accepts concise Chinese reviewer identity and qualification metadata', () => {
  const reviewer = {
    name: '李明',
    affiliation: '云南大学',
    qualification: '教授',
    credentialEvidence: 'https://www.ynu.edu.cn/szdw/li-ming',
    conflictOfInterest: '无利益冲突',
    funding: '无外部资助',
  }

  assert.doesNotThrow(
    () => validateReviews([externalApproval('historian', { reviewer })], new Set(['c1']), new Set(), reviewCycle, approvalEvidence()),
  )
})

test('requires full reviewed and submitted timestamps plus a response digest for approvals', () => {
  for (const override of [
    { reviewedAt: '2026-07-18' },
    { reviewedAt: '2026-02-31T09:30:00+03:00' },
    { reviewedAt: '2026-07-18T24:00:00+03:00' },
    { submittedAt: '2026-07-18' },
    { reviewedAt: '2026-07-18T11:00:00+03:00', submittedAt: '2026-07-18T10:00:00+03:00' },
    { responseSha256: 'not-a-sha256' },
  ]) {
    assert.throws(
      () => validateReviews([externalApproval('historian', override)], new Set(['c1']), new Set(), reviewCycle, approvalEvidence()),
      /approved review requires valid (timestamps|responseSha256): c1\/historian/,
    )
  }
})

test('requires explicit reviewed proof pages for every approved claim', () => {
  for (const pageIdsReviewed of [undefined, [], ['not-a-page'], ['A-P001', 'A-P001']]) {
    assert.throws(
      () => validateReviews([externalApproval('historian', { pageIdsReviewed })], new Set(['c1']), new Set(), reviewCycle, approvalEvidence()),
      /approved review requires valid pageIdsReviewed: c1\/historian/,
    )
  }
})

test('requires approval evidence context for every approved review', () => {
  assert.throws(
    () => validateReviews([externalApproval('historian')], new Set(['c1']), new Set(), reviewCycle),
    /approved review requires approval evidence context: c1\/historian/,
  )
})

test('rejects a review that began before the frozen cycle snapshot', () => {
  assert.throws(
    () => validateReviews([
      externalApproval('historian', { reviewedAt: '2026-07-18T08:30:00+03:00' }),
    ], new Set(['c1']), new Set(), reviewCycle, approvalEvidence()),
    /approved review predates frozen cycle: c1\/historian/,
  )
})

test('requires active claim pages to be a nonempty subset of the frozen claim evidence', () => {
  assert.throws(
    () => validateReviews([
      externalApproval('historian', { pageIdsReviewed: ['A-P003'] }),
    ], new Set(['c1']), new Set(), reviewCycle, approvalEvidence()),
    /approved review references pages outside frozen claim evidence: c1\/historian/,
  )
  assert.doesNotThrow(
    () => validateReviews([
      externalApproval('historian', { pageIdsReviewed: ['A-P002'] }),
    ], new Set(['c1']), new Set(), reviewCycle, approvalEvidence()),
  )
})

test('requires responseSha256 to equal the digest computed from stored response evidence', () => {
  const responseSha256ByRole = new Map(approvalEvidence().responseSha256ByRole)
  responseSha256ByRole.set('historian', 'd'.repeat(64))
  assert.throws(
    () => validateReviews([
      externalApproval('historian'),
    ], new Set(['c1']), new Set(), reviewCycle, approvalEvidence({ responseSha256ByRole })),
    /approved review responseSha256 does not match stored response: c1\/historian/,
  )
})

test('requires exclusion decisions and empty pages for claims in the frozen excluded ledger', () => {
  const excludedEvidence = approvalEvidence({
    claimStatusById: new Map([['c1', 'rejected']]),
    allowedPageIdsByClaim: new Map([['c1', new Set()]]),
    excludedClaimIds: new Set(['c1']),
  })
  const exclusion = externalApproval('historian', {
    decision: 'confirm-exclusion',
    pageIdsReviewed: [],
  })
  assert.doesNotThrow(
    () => validateReviews([exclusion], new Set(['c1']), new Set(), reviewCycle, excludedEvidence),
  )
  assert.throws(
    () => validateReviews([
      { ...exclusion, pageIdsReviewed: ['A-P001'] },
    ], new Set(['c1']), new Set(), reviewCycle, excludedEvidence),
    /excluded claim review must not invent proof pages: c1\/historian/,
  )
  assert.throws(
    () => validateReviews([exclusion], new Set(['c1']), new Set(), reviewCycle, {
      ...excludedEvidence,
      excludedClaimIds: new Set(),
    }),
    /excluded claim is absent from frozen exclusion ledger: c1\/historian/,
  )
})

test('requires approve-wording for checked or verified claims and confirm-exclusion for rejected claims', () => {
  assert.throws(
    () => validateReviews([
      externalApproval('historian', { decision: 'confirm-exclusion', pageIdsReviewed: [] }),
    ], new Set(['c1']), new Set(), reviewCycle, approvalEvidence()),
    /approved review decision does not match claim status: c1\/historian/,
  )
  const rejectedEvidence = approvalEvidence({
    claimStatusById: new Map([['c1', 'rejected']]),
    allowedPageIdsByClaim: new Map([['c1', new Set()]]),
    excludedClaimIds: new Set(['c1']),
  })
  assert.throws(
    () => validateReviews([
      externalApproval('historian'),
    ], new Set(['c1']), new Set(), reviewCycle, rejectedEvidence),
    /approved review decision does not match claim status: c1\/historian/,
  )
})

test('requires a dispatched confirmed cycle and an explicit waiver for a late response', () => {
  assert.throws(
    () => validateReviews([externalApproval('historian')], new Set(['c1']), new Set(), {
      ...reviewCycle,
      status: 'prepared-not-dispatched',
      deadlineStatus: 'proposed',
    }),
    /approved review requires a dispatched cycle with confirmed deadline/,
  )
  const late = externalApproval('historian', {
    reviewedAt: '2026-08-02T09:00:00+03:00',
    submittedAt: '2026-08-02T10:00:00+03:00',
  })
  assert.throws(
    () => validateReviews([late], new Set(['c1']), new Set(), reviewCycle, approvalEvidence()),
    /late approved review requires an explicit waiver/,
  )
  assert.doesNotThrow(() => validateReviews([{
    ...late,
    lateWaiver: {
      reason: 'Reviewer travel delayed delivery; frozen files did not change.',
      authorizedBy: 'Managing editor',
    },
  }], new Set(['c1']), new Set(), reviewCycle, approvalEvidence()))
})

test('does not require external approval metadata for pending editorial audits', () => {
  assert.doesNotThrow(() => validateReviews([
    {
      claimId: 'c1',
      role: 'historian',
      status: 'pending',
      reviewer: 'Codex editorial research audit',
      reviewedAt: '2026-07-17',
    },
  ], new Set(['c1']), new Set(), reviewCycle))
})

test('rejects duplicate reviews for the same claim and role', () => {
  const reviews = [
    { claimId: 'c1', role: 'historian', status: 'pending' },
    { claimId: 'c1', role: 'historian', status: 'pending' },
  ]
  assert.throws(() => validateReviews(reviews, new Set(['c1']), new Set()), /duplicate review: c1\/historian/)
})

test('rejects conflicting review states for the same claim and role', () => {
  const reviews = [
    { claimId: 'c1', role: 'historian', status: 'pending' },
    { claimId: 'c1', role: 'historian', status: 'changes-requested' },
  ]
  assert.throws(() => validateReviews(reviews, new Set(['c1']), new Set()), /duplicate review: c1\/historian/)
})

test('prevents unlicensed private assets from print-ready status', () => {
  assert.throws(() => validateAssets([{ id: 'img-1', kind: 'photo', rights: 'pending', status: 'print-ready', path: 'book/assets/private/a.tif' }]), /print-ready asset requires cleared rights/)
})

test('rejects missing, empty, and whitespace-only asset ids', () => {
  for (const id of [undefined, '', '   ']) {
    assert.throws(() => validateAssets([{ id, kind: 'photo', rights: 'pending', status: 'concept', path: 'book/assets/private/a.tif' }]), /asset requires nonblank id/)
  }
})

test('accepts a complete valid evidence and rights registry', () => {
  const sourceIds = validateSources([sourceFixture({ id: 's1', title: 'Source', href: 'https://source.example' })])
  const claims = [{ id: 'c1', text: 'Claim', evidence: 'source', sourceIds: ['s1'], status: 'verified' }]
  const claimIds = validateClaims(claims, sourceIds)
  const reviews = [
    externalApproval('historian'),
    externalApproval('technologist'),
    externalApproval('medical'),
  ]

  assert.doesNotThrow(() => validateReviews(reviews, claimIds, new Set(['c1']), reviewCycle, approvalEvidence()))
  assert.deepEqual(validateAssets([printReadyAsset()]), new Set(['img-1']))
})

test('filesystem gate accepts existing regular master and rights files', () => {
  const repo = temporaryRepo()
  writeFixture(repo, 'book/assets/private/a.tif')
  writeFixture(repo, 'book/assets/rights/img-1.md', 'licensed for print')

  assert.doesNotThrow(() => validateAssetFiles([printReadyAsset()], repo))
})

test('filesystem gate rejects a missing print master', () => {
  const repo = temporaryRepo()
  writeFixture(repo, 'book/assets/rights/img-1.md', 'licensed for print')

  assert.throws(
    () => validateAssetFiles([printReadyAsset()], repo),
    /asset img-1: master file missing or not regular: book\/assets\/private\/a\.tif/,
  )
})

test('filesystem gate rejects missing rights evidence', () => {
  const repo = temporaryRepo()
  writeFixture(repo, 'book/assets/private/a.tif')

  assert.throws(
    () => validateAssetFiles([printReadyAsset()], repo),
    /asset img-1: rights evidence file missing or not regular: book\/assets\/rights\/img-1\.md/,
  )
})

test('filesystem gate rejects traversal, absolute, and outside-assets paths', () => {
  const repo = temporaryRepo()
  const invalidPaths = [
    'book/assets/private/../a.tif',
    'outside/a.tif',
    path.join(repo, 'book/assets/private/a.tif'),
  ]
  for (const assetPath of invalidPaths) {
    assert.throws(
      () => validateAssetFiles([printReadyAsset({ path: assetPath })], repo),
      /asset img-1: unsafe master path:/,
    )
  }
})

test('filesystem gate rejects directories in place of regular files', () => {
  const repo = temporaryRepo()
  fs.mkdirSync(path.join(repo, 'book/assets/private/a.tif'), { recursive: true })
  writeFixture(repo, 'book/assets/rights/img-1.md', 'licensed for print')

  assert.throws(
    () => validateAssetFiles([printReadyAsset()], repo),
    /asset img-1: master file missing or not regular:/,
  )
})

test('filesystem gate enforces master and rights evidence extensions', () => {
  const repo = temporaryRepo()
  for (const asset of [
    printReadyAsset({ path: 'book/assets/private/a.txt' }),
    printReadyVector({ path: 'book/assets/maps/map-1.tif' }),
    printReadyAsset({ licenseFile: 'book/assets/rights/img-1.exe' }),
  ]) {
    assert.throws(
      () => validateAssetFiles([asset], repo),
      /asset (?:img-1|map-1): invalid (?:master|rights evidence) extension:/,
    )
  }
})

test('filesystem gate accepts an SVG whose root viewBox matches the register', () => {
  const repo = temporaryRepo()
  writeFixture(repo, 'book/assets/maps/map-1.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800"></svg>')
  writeFixture(repo, 'book/assets/rights/map-1.md', 'owned map')

  assert.doesNotThrow(() => validateAssetFiles([printReadyVector()], repo))
})

test('filesystem gate rejects an SVG whose root viewBox differs from the register', () => {
  const repo = temporaryRepo()
  writeFixture(repo, 'book/assets/maps/map-1.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"></svg>')
  writeFixture(repo, 'book/assets/rights/map-1.md', 'owned map')

  assert.throws(
    () => validateAssetFiles([printReadyVector()], repo),
    /asset map-1: SVG viewBox mismatch for book\/assets\/maps\/map-1\.svg/,
  )
})

test('exports the reusable flatplan validator', () => {
  assert.equal(typeof dataValidator.validateFlatplan, 'function')
})

test('defines exactly the thirteen reusable templates with auditable metadata', () => {
  const { templates } = flatplanData()

  assert.deepEqual(templates.map(({ id }) => id), expectedTemplateIds)
  const known = new Set(expectedTemplateIds)
  for (const template of templates) {
    assert.deepEqual(Object.keys(template).sort(), [
      'compatiblePageTemplates',
      'constraints',
      'expectedContent',
      'id',
      'label',
      'purpose',
      'requiresVisual',
    ])
    assert.equal(typeof template.label, 'string')
    assert.ok(template.label.trim())
    assert.equal(typeof template.purpose, 'string')
    assert.ok(template.purpose.trim())
    assert.ok(Array.isArray(template.constraints) && template.constraints.length > 0)
    assert.ok(Array.isArray(template.expectedContent) && template.expectedContent.length > 0)
    assert.equal(typeof template.requiresVisual, 'boolean')
    assert.ok(Array.isArray(template.compatiblePageTemplates) && template.compatiblePageTemplates.length > 0)
    assert.ok(template.compatiblePageTemplates.every((id) => known.has(id)))
  }
})

test('defines and validates the exact 208-page album allocation and reader spreads', () => {
  const { templates, album, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))

  assert.equal(album.totalPages, 208)
  assert.equal(album.totalPages % 16, 0)
  assert.equal(album.pages.length, 208)
  assert.deepEqual(sectionSummary(album.sections), expectedAlbumSections)
  assert.deepEqual(album.pages.map(({ id }) => id), Array.from({ length: 208 }, (_, index) => expectedPageId('A', index + 1)))
  assert.deepEqual(album.pages.map(({ spreadId }, index) => spreadId), Array.from({ length: 208 }, (_, index) => expectedSpreadId('A', index + 1)))
  assert.equal(new Set(album.pages.map(({ spreadId }) => spreadId)).size, 105)
  assertEditorialTopics(album)
  assert.deepEqual(album.pages.slice(192, 208).map(({ apparatus }) => apparatus), [
    ...Array(6).fill('chronology'),
    ...Array(4).fill('glossary'),
    ...Array(5).fill('bibliography'),
    'publication-notes',
  ])
  assert.equal(album.pages[201].template, 'quiet-text')
  assert.equal(album.pages[202].template, 'bibliography')
  assert.equal(album.pages[201].spreadTemplate, album.pages[202].spreadTemplate)
  assert.doesNotThrow(() => validateFlatplan(album, 208, templates, assetIds))
})

test('assigns every planned non-legacy visual asset to an album or guide page', () => {
  const { album, guide, assets } = flatplanData()
  const referenced = new Set([...album.pages, ...guide.pages].flatMap(({ assetIds }) => assetIds))
  const plannedNonLegacy = assets.filter(({ id }) => !id.startsWith('site-')).map(({ id }) => id)

  assert.equal(plannedNonLegacy.length, 40)
  assert.deepEqual(plannedNonLegacy.filter((id) => !referenced.has(id)), [])
})

test('defines and validates the exact 48-page guide allocation and reader spreads', () => {
  const { templates, guide, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))

  assert.equal(guide.totalPages, 48)
  assert.equal(guide.totalPages % 16, 0)
  assert.equal(guide.pages.length, 48)
  assert.deepEqual(sectionSummary(guide.sections), expectedGuideSections)
  assert.deepEqual(guide.pages.map(({ id }) => id), Array.from({ length: 48 }, (_, index) => expectedPageId('G', index + 1)))
  assert.deepEqual(guide.pages.map(({ spreadId }, index) => spreadId), Array.from({ length: 48 }, (_, index) => expectedSpreadId('G', index + 1)))
  assert.equal(new Set(guide.pages.map(({ spreadId }) => spreadId)).size, 25)
  assert.equal(guide.pages.filter(({ template }) => template === 'guide-recipe').length, 16)
  assert.equal(guide.pages[45].crossSectionSpread, true)
  assert.equal(guide.pages[46].crossSectionSpread, true)
  assert.equal(guide.pages[45].template, 'guide-troubleshooting')
  assert.equal(guide.pages[46].template, 'guide-safety')
  assert.equal(guide.pages[45].spreadTemplate, guide.pages[46].spreadTemplate)
  assertEditorialTopics(guide)
  assert.doesNotThrow(() => validateFlatplan(guide, 48, templates, assetIds))
})

test('fulfils every visual spread with registered assets or one identical commission brief', () => {
  const { templates, album, guide } = flatplanData()
  const metadata = new Map(templates.map((template) => [template.id, template]))

  for (const plan of [album, guide]) {
    const briefs = new Set()
    for (const [spreadId, pages] of pagesBySpread(plan)) {
      assert.equal(new Set(pages.map(({ spreadTemplate }) => spreadTemplate)).size, 1)
      const requiresVisual = metadata.get(pages[0].spreadTemplate)?.requiresVisual
      const assets = pages.flatMap(({ assetIds }) => assetIds)
      const placeholders = pages.map(({ visualPlaceholder }) => visualPlaceholder).filter(Boolean)
      if (requiresVisual) {
        assert.ok(assets.length > 0 || placeholders.length === pages.length, `${spreadId} lacks visual fulfilment`)
        if (placeholders.length > 0) {
          assert.equal(assets.length, 0)
          assert.ok(placeholders.every((placeholder) => JSON.stringify(placeholder) === JSON.stringify(placeholders[0])))
          assert.ok(!briefs.has(placeholders[0].brief))
          briefs.add(placeholders[0].brief)
        }
      } else {
        assert.equal(placeholders.length, 0, `${spreadId} has placeholder on nonvisual spread`)
      }
    }
  }
})

test('defines sixteen unique bounded recipes in the required section distribution', () => {
  const { guide } = flatplanData()
  const recipePages = guide.pages.filter(({ template }) => template === 'guide-recipe')
  const recipes = recipePages.map(({ recipe }) => recipe)
  const distribution = Object.fromEntries(
    ['tools-water', 'sheng', 'shou', 'simple-methods'].map((sectionId) => [
      sectionId,
      recipePages.filter((page) => page.sectionId === sectionId).length,
    ]),
  )

  assert.equal(recipes.length, 16)
  assert.deepEqual(distribution, { 'tools-water': 2, sheng: 4, shou: 4, 'simple-methods': 6 })
  assert.equal(new Set(recipes.map(({ recipeId }) => recipeId)).size, 16)
  assert.equal(new Set(recipes.map((recipe) => JSON.stringify(recipe))).size, 16)
  assert.deepEqual(
    recipePages.filter(({ sectionId }) => sectionId === 'simple-methods').map(({ recipe }) => recipe.methodId).sort(),
    [...simpleMethodIds].sort(),
  )
  for (const recipe of recipes) {
    assert.deepEqual(Object.keys(recipe).sort(), recipeKeys)
    assert.ok(recipe.vesselVolumeMl >= 50 && recipe.vesselVolumeMl <= 1000)
    assert.ok(recipe.leafMassG >= 1 && recipe.leafMassG <= 20)
    assert.ok(recipe.temperatureRangeC[0] >= 60 && recipe.temperatureRangeC[1] <= 100)
    assert.ok(recipe.firstInfusionRangeSec[0] >= 1 && recipe.firstInfusionRangeSec[1] <= 1800)
  }
})

test('maps all sixteen guide recipe pages to one exact declared method topic', () => {
  const { guide } = flatplanData()
  const topics = new Map(guide.sections.flatMap(({ requiredTopics }) => requiredTopics.map((topic) => [topic.id, topic])))
  const recipePages = guide.pages.filter(({ template }) => template === 'guide-recipe')

  assert.deepEqual(
    recipePages.map((page) => [page.id, page.topicId, page.recipe.recipeId, page.recipe.methodId]),
    expectedGuideRecipePages,
  )
  for (const [, topicId, , methodId] of expectedGuideRecipePages) {
    assert.deepEqual(topics.get(topicId)?.expectedMethodIds, [methodId], `${topicId} must map only ${methodId}`)
  }
})

test('allows distinct mapped recipe topics on one guide spread and rejects ordinary distinct topics', () => {
  const { templates, guide, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))
  const recipeSpreadIds = ['G-S010', 'G-S012', 'G-S013', 'G-S016', 'G-S017', 'G-S020', 'G-S021']

  for (const spreadId of recipeSpreadIds) {
    const pages = guide.pages.filter((page) => page.spreadId === spreadId)
    assert.ok(pages.every(({ template }) => template === 'guide-recipe'))
    assert.equal(new Set(pages.map(({ topicId }) => topicId)).size, 2, `${spreadId} must carry two method topics`)
    assert.equal(new Set(pages.map(({ spreadTitle }) => spreadTitle)).size, 1, `${spreadId} must carry one combined title`)
  }
  const expectedBookends = new Map([
    ['G-S019', 'От коротких проливов шу — к шэну в кружке'],
    ['G-S022', 'Шу в кружке — к внимательной дегустации'],
  ])
  for (const [spreadId, expectedTitle] of expectedBookends) {
    const pages = guide.pages.filter((page) => page.spreadId === spreadId)
    assert.equal(new Set(pages.map(({ spreadTitle }) => spreadTitle)).size, 1)
    assert.equal(pages[0].spreadTitle, expectedTitle)
  }
  assert.doesNotThrow(() => validateFlatplan(guide, 48, templates, assetIds))

  const ordinary = structuredClone(guide)
  const ordinaryRight = ordinary.pages.find(({ id }) => id === 'G-P003')
  const ordinaryLeft = ordinary.pages.find(({ id }) => id === 'G-P002')
  ordinary.sections
    .find(({ id }) => id === 'quick-start')
    .requiredTopics.push({ id: 'quick-start-ordinary-mutant', title: ordinaryLeft.spreadTitle })
  ordinaryRight.topicId = 'quick-start-ordinary-mutant'
  ordinaryRight.spreadTitle = ordinaryLeft.spreadTitle
  assert.throws(
    () => validateFlatplan(ordinary, 48, templates, assetIds),
    /normal spread G-S002 with distinct topics requires two guide-recipe pages/,
  )
})

test('rejects a total that differs from the expected page count', () => {
  const { templates, album, assets } = flatplanData()
  album.totalPages = 207

  assert.throws(
    () => validateFlatplan(album, 208, templates, new Set(assets.map(({ id }) => id))),
    /flatplan album: totalPages must equal 208/,
  )
})

test('rejects a matching expected total that does not form 16-page signatures', () => {
  const { templates, album, assets } = flatplanData()
  album.totalPages = 207

  assert.throws(
    () => validateFlatplan(album, 207, templates, new Set(assets.map(({ id }) => id))),
    {
      name: 'Error',
      message: 'flatplan album: totalPages must use complete 16-page signatures',
    },
  )
})

test('rejects a declared signature size other than 16 pages', () => {
  const { templates, album, assets } = flatplanData()
  album.signatureSize = 8

  assert.throws(
    () => validateFlatplan(album, 208, templates, new Set(assets.map(({ id }) => id))),
    {
      name: 'Error',
      message: 'flatplan album: totalPages must use complete 16-page signatures',
    },
  )
})

test('rejects page number gaps and duplicates', () => {
  const { templates, album, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))
  for (const number of [10, 12]) {
    const mutated = structuredClone(album)
    mutated.pages[10].number = number
    assert.throws(
      () => validateFlatplan(mutated, 208, templates, assetIds),
      /flatplan album: page 11 must have number 11/,
    )
  }
})

test('rejects unknown page templates and asset references', () => {
  const { templates, album, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))
  const unknownTemplate = structuredClone(album)
  unknownTemplate.pages[0].template = 'unknown-template'
  const unknownAsset = structuredClone(album)
  unknownAsset.pages[0].assetIds = ['unknown-asset']

  assert.throws(() => validateFlatplan(unknownTemplate, 208, templates, assetIds), /unknown template unknown-template/)
  assert.throws(() => validateFlatplan(unknownAsset, 208, templates, assetIds), /unknown asset unknown-asset/)
})

test('rejects generic counter roles and undeclared or unused required topics', () => {
  const { templates, album, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))
  const genericRole = structuredClone(album)
  genericRole.pages[0].role = 'Вводная полоса 1 из 20'
  const genericTitle = structuredClone(album)
  const genericTopicId = genericTitle.sections[0].requiredTopics[0].id
  genericTitle.sections[0].requiredTopics[0].title = 'Страница 1'
  for (const page of genericTitle.pages.filter(({ topicId }) => topicId === genericTopicId)) {
    page.spreadTitle = 'Страница 1'
  }
  const unusedTopic = structuredClone(album)
  unusedTopic.sections[0].requiredTopics ??= []
  unusedTopic.sections[0].requiredTopics.push({ id: 'entry-unused', title: 'Неиспользованная тема' })
  const undeclaredTopic = structuredClone(album)
  undeclaredTopic.pages[0].topicId = 'entry-undeclared'
  undeclaredTopic.pages[0].spreadTitle = 'Незаявленная тема'

  assert.throws(() => validateFlatplan(genericRole, 208, templates, assetIds), /generic counter role/)
  assert.throws(() => validateFlatplan(genericTitle, 208, templates, assetIds), /generic counter topic title/)
  assert.throws(() => validateFlatplan(unusedTopic, 208, templates, assetIds), /required topic entry-unused is not used/)
  assert.throws(() => validateFlatplan(undeclaredTopic, 208, templates, assetIds), /undeclared topic entry-undeclared/)
})

test('rejects unknown spread templates and incompatible page templates', () => {
  const { templates, album, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))
  const unknown = structuredClone(album)
  unknown.pages[0].spreadTemplate = 'unknown-spread-template'
  const incompatible = structuredClone(album)
  for (const page of incompatible.pages.filter(({ spreadId }) => spreadId === 'A-S002')) {
    page.spreadTemplate = 'quiet-text'
  }

  assert.throws(() => validateFlatplan(unknown, 208, templates, assetIds), /unknown spreadTemplate unknown-spread-template/)
  assert.throws(() => validateFlatplan(incompatible, 208, templates, assetIds), /is incompatible with spreadTemplate quiet-text/)
})

test('rejects visual spreads without fulfilment and invalid placeholder use', () => {
  const { templates, album, guide, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))
  const unfulfilled = structuredClone(album)
  for (const page of unfulfilled.pages.filter(({ spreadId }) => spreadId === 'A-S002')) {
    page.spreadTemplate = 'photo-plus-essay'
    page.assetIds = []
    delete page.visualPlaceholder
  }
  const contradictory = structuredClone(album)
  for (const [index, page] of contradictory.pages.filter(({ spreadId }) => spreadId === 'A-S002').entries()) {
    page.spreadTemplate = 'photo-plus-essay'
    page.assetIds = []
    page.visualPlaceholder = {
      status: 'commission-brief',
      kind: 'illustration',
      brief: `Разные брифы для одного разворота: вариант ${index + 1}`,
    }
  }
  const malformed = structuredClone(album)
  for (const page of malformed.pages.filter(({ spreadId }) => spreadId === 'A-S002')) {
    page.spreadTemplate = 'photo-plus-essay'
    page.assetIds = []
    page.visualPlaceholder = { status: 'commission-brief', kind: 'illustration', brief: '   ' }
  }
  const nonvisual = structuredClone(guide)
  for (const page of nonvisual.pages.filter(({ spreadId }) => spreadId === 'G-S002')) {
    page.spreadTemplate = 'quiet-text'
    page.visualPlaceholder = {
      status: 'commission-brief',
      kind: 'illustration',
      brief: 'Лишний визуальный бриф на текстовом развороте',
    }
  }

  assert.throws(() => validateFlatplan(unfulfilled, 208, templates, assetIds), /visual spread A-S002 requires assets or commission brief/)
  assert.throws(() => validateFlatplan(contradictory, 208, templates, assetIds), /spread A-S002 must use one identical visualPlaceholder/)
  assert.throws(() => validateFlatplan(malformed, 208, templates, assetIds), /visualPlaceholder brief must be nonblank/)
  assert.throws(() => validateFlatplan(nonvisual, 48, templates, assetIds), /nonvisual spread G-S002 cannot use visualPlaceholder/)
})

test('rejects a malformed reader-spread pairing', () => {
  const { templates, album, assets } = flatplanData()
  album.pages[2].spreadId = 'A-S003'

  assert.throws(
    () => validateFlatplan(album, 208, templates, new Set(assets.map(({ id }) => id))),
    /flatplan album: page A-P003 must use spread A-S002/,
  )
})

test('rejects an even chapter start unless explicitly allowed', () => {
  const { templates, guide, assets } = flatplanData()
  guide.pages[1].chapterStart = true

  assert.throws(
    () => validateFlatplan(guide, 48, templates, new Set(assets.map(({ id }) => id))),
    /flatplan guide: chapter start G-P002 must be recto\/odd/,
  )
})

test('rejects a guide recipe with a missing required field', () => {
  const { templates, guide, assets } = flatplanData()
  const recipePage = guide.pages.find(({ template }) => template === 'guide-recipe')
  delete recipePage.recipe.firstInfusionRangeSec

  assert.throws(
    () => validateFlatplan(guide, 48, templates, new Set(assets.map(({ id }) => id))),
    /firstInfusionRangeSec must be a positive ascending range/,
  )
})

test('rejects a guide recipe whose method is not declared by its topic', () => {
  const { templates, guide, assets } = flatplanData()
  guide.pages.find(({ id }) => id === 'G-P031').recipe.methodId = 'teapot-shou-loose'

  assert.throws(
    () => validateFlatplan(guide, 48, templates, new Set(assets.map(({ id }) => id))),
    /page G-P031: recipe methodId teapot-shou-loose is not allowed by topic shou-t03/,
  )
})

test('rejects duplicate recipes, implausible bounds, and recipes on nonrecipe pages', () => {
  const { templates, guide, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))
  const duplicates = structuredClone(guide)
  const duplicatePages = duplicates.pages.filter(({ template }) => template === 'guide-recipe').slice(0, 2)
  duplicatePages[1].recipe = structuredClone(duplicatePages[0].recipe)
  duplicatePages[1].topicId = duplicatePages[0].topicId
  const implausible = structuredClone(guide)
  implausible.pages.find(({ template }) => template === 'guide-recipe').recipe.vesselVolumeMl = 1_000_000_000
  const misplaced = structuredClone(guide)
  misplaced.pages.find(({ template }) => template !== 'guide-recipe').recipe = structuredClone(
    misplaced.pages.find(({ template }) => template === 'guide-recipe').recipe,
  )

  assert.throws(() => validateFlatplan(duplicates, 48, templates, assetIds), /duplicate recipe/)
  assert.throws(() => validateFlatplan(implausible, 48, templates, assetIds), /vesselVolumeMl must be between 50 and 1000/)
  assert.throws(() => validateFlatplan(misplaced, 48, templates, assetIds), /recipe is only allowed on guide-recipe pages/)
})

test('rejects a section whose declared count does not match its range', () => {
  const { templates, album, assets } = flatplanData()
  album.sections[2].pageCount += 1

  assert.throws(
    () => validateFlatplan(album, 208, templates, new Set(assets.map(({ id }) => id))),
    /flatplan album: section roads-name pageCount does not match its range/,
  )
})

test('rejects a zero-page section even when later sections still cover the plan', () => {
  const { templates, album, assets } = flatplanData()
  album.sections.unshift({ id: 'empty', title: 'Empty section', pageCount: 0, start: 1, end: 0 })

  assert.throws(
    () => validateFlatplan(album, 208, templates, new Set(assets.map(({ id }) => id))),
    /flatplan album: section empty must contain at least one page/,
  )
})

test('rejects arbitrary extra keys at every flatplan schema level', () => {
  const { templates, album, guide, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))
  const cases = []

  const extraTemplate = structuredClone(templates)
  extraTemplate[0].extra = true
  cases.push(() => validateFlatplan(album, 208, extraTemplate, assetIds))

  const extraPlan = structuredClone(album)
  extraPlan.extra = true
  cases.push(() => validateFlatplan(extraPlan, 208, templates, assetIds))

  const extraSection = structuredClone(album)
  extraSection.sections[0].extra = true
  cases.push(() => validateFlatplan(extraSection, 208, templates, assetIds))

  const extraTopic = structuredClone(album)
  extraTopic.sections[0].requiredTopics ??= [{ id: 'entry-opening', title: 'Открытие' }]
  extraTopic.sections[0].requiredTopics[0].extra = true
  cases.push(() => validateFlatplan(extraTopic, 208, templates, assetIds))

  const extraPage = structuredClone(album)
  extraPage.pages[0].extra = true
  cases.push(() => validateFlatplan(extraPage, 208, templates, assetIds))

  const extraRecipe = structuredClone(guide)
  extraRecipe.pages.find(({ template }) => template === 'guide-recipe').recipe.extra = true
  cases.push(() => validateFlatplan(extraRecipe, 48, templates, assetIds))

  const extraPlaceholder = structuredClone(album)
  const placeholderPages = extraPlaceholder.pages.filter(({ spreadId }) => spreadId === 'A-S002')
  for (const page of placeholderPages) {
    page.spreadTemplate = 'photo-plus-essay'
    page.assetIds = []
    page.visualPlaceholder = {
      status: 'commission-brief',
      kind: 'illustration',
      brief: 'Заказать исторически точную иллюстрацию раннего чайного мифа',
      extra: true,
    }
  }
  cases.push(() => validateFlatplan(extraPlaceholder, 208, templates, assetIds))

  for (const validate of cases) assert.throws(validate, /unexpected key: extra/)
})

test('rejects an apparatus page without an allowed marker', () => {
  const { templates, album, assets } = flatplanData()
  delete album.pages.find(({ sectionId }) => sectionId === 'apparatus').apparatus

  assert.throws(
    () => validateFlatplan(album, 208, templates, new Set(assets.map(({ id }) => id))),
    /flatplan album: apparatus page A-P193 requires chronology, glossary, bibliography, or publication-notes/,
  )
})

test('rejects apparatus metadata outside the album apparatus section', () => {
  const { templates, album, assets } = flatplanData()
  album.pages[0].apparatus = 'chronology'

  assert.throws(
    () => validateFlatplan(album, 208, templates, new Set(assets.map(({ id }) => id))),
    /apparatus is only allowed on album apparatus pages/,
  )
})

test('rejects collapsed, reordered, or miscounted apparatus markers', () => {
  const { templates, album, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))
  const collapsed = structuredClone(album)
  for (const page of collapsed.pages.filter(({ sectionId }) => sectionId === 'apparatus')) page.apparatus = 'chronology'
  const reordered = structuredClone(album)
  ;[reordered.pages[197].apparatus, reordered.pages[198].apparatus] = [
    reordered.pages[198].apparatus,
    reordered.pages[197].apparatus,
  ]
  const miscounted = structuredClone(album)
  miscounted.pages[201].apparatus = 'bibliography'

  for (const plan of [collapsed, reordered, miscounted]) {
    assert.throws(
      () => validateFlatplan(plan, 208, templates, assetIds),
      /album apparatus must be chronology 193-198, glossary 199-202, bibliography 203-207, publication-notes 208/,
    )
  }
})

test('rejects duplicate or missing required template registrations', () => {
  const { templates, album, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))
  const duplicate = [...templates, structuredClone(templates[0])]
  const missing = templates.filter(({ id }) => id !== 'guide-safety')

  assert.throws(() => validateFlatplan(album, 208, duplicate, assetIds), /duplicate template id: chapter-gate/)
  assert.throws(() => validateFlatplan(album, 208, missing, assetIds), /missing required template: guide-safety/)
})
