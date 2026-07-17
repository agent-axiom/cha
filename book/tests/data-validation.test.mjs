import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as dataValidator from '../scripts/validate-data.mjs'

const {
  validateSources,
  validateClaims,
  validateReviews,
  validateAssets,
} = dataValidator

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
