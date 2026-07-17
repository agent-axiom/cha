import test, { after } from 'node:test'
import assert from 'node:assert/strict'
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
  assert.throws(() => validateSources([{ id: 'a', title: 'A', href: 'https://a.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: true }, { id: 'a', title: 'B', href: 'https://b.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: true }]), /duplicate source id: a/)
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

test('rejects non-boolean source visibility', () => {
  assert.throws(() => validateSources([{ id: 'a', title: 'A', href: 'https://a.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: 'true' }]), /source siteVisible must be boolean: a/)
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
  assert.throws(() => validateReviews([{ claimId: 'c1', role: 'historian', status: 'approved' }], new Set(['c1']), new Set(['c1'])), /missing required review/)
})

test('rejects duplicate review approvals for the same claim and role', () => {
  const reviews = [
    { claimId: 'c1', role: 'historian', status: 'approved' },
    { claimId: 'c1', role: 'historian', status: 'approved' },
  ]
  assert.throws(() => validateReviews(reviews, new Set(['c1']), new Set()), /duplicate review: c1\/historian/)
})

test('rejects conflicting review states for the same claim and role', () => {
  const reviews = [
    { claimId: 'c1', role: 'historian', status: 'approved' },
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
  const sourceIds = validateSources([{ id: 's1', title: 'Source', href: 'https://source.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: true }])
  const claims = [{ id: 'c1', text: 'Claim', evidence: 'source', sourceIds: ['s1'], status: 'verified' }]
  const claimIds = validateClaims(claims, sourceIds)
  const reviews = [
    { claimId: 'c1', role: 'historian', status: 'approved' },
    { claimId: 'c1', role: 'technologist', status: 'approved' },
    { claimId: 'c1', role: 'medical', status: 'approved' },
  ]

  assert.doesNotThrow(() => validateReviews(reviews, claimIds, new Set(['c1'])))
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
  for (const template of templates) {
    assert.equal(typeof template.label, 'string')
    assert.ok(template.label.trim())
    assert.equal(typeof template.purpose, 'string')
    assert.ok(template.purpose.trim())
    assert.ok(Array.isArray(template.constraints) && template.constraints.length > 0)
    assert.ok(Array.isArray(template.expectedContent) && template.expectedContent.length > 0)
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
  assert.doesNotThrow(() => validateFlatplan(guide, 48, templates, assetIds))
})

test('rejects a wrong total or signature page count', () => {
  const { templates, album, assets } = flatplanData()
  album.totalPages = 207

  assert.throws(
    () => validateFlatplan(album, 208, templates, new Set(assets.map(({ id }) => id))),
    /flatplan album: totalPages must equal 208/,
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

test('rejects an apparatus page without an allowed marker', () => {
  const { templates, album, assets } = flatplanData()
  delete album.pages.find(({ sectionId }) => sectionId === 'apparatus').apparatus

  assert.throws(
    () => validateFlatplan(album, 208, templates, new Set(assets.map(({ id }) => id))),
    /flatplan album: apparatus page A-P193 requires chronology, glossary, or bibliography/,
  )
})

test('rejects duplicate or missing required template registrations', () => {
  const { templates, album, assets } = flatplanData()
  const assetIds = new Set(assets.map(({ id }) => id))
  const duplicate = [...templates, structuredClone(templates[0])]
  const missing = templates.filter(({ id }) => id !== 'guide-safety')

  assert.throws(() => validateFlatplan(album, 208, duplicate, assetIds), /duplicate template id: chapter-gate/)
  assert.throws(() => validateFlatplan(album, 208, missing, assetIds), /missing required template: guide-safety/)
})
