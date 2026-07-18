import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as validator from '../scripts/validate-data.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(root, '..')
const assets = JSON.parse(fs.readFileSync(path.join(root, 'data/assets.json'), 'utf8'))

const readPngDimensions = (filename) => {
  const buffer = fs.readFileSync(filename)
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${filename}: invalid PNG signature`)
  assert.equal(buffer.subarray(12, 16).toString('ascii'), 'IHDR', `${filename}: PNG must begin with IHDR`)
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

const readTiffDimensions = (filename) => {
  const buffer = fs.readFileSync(filename)
  const byteOrder = buffer.subarray(0, 2).toString('ascii')
  assert.match(byteOrder, /^(?:II|MM)$/u, `${filename}: invalid TIFF byte order`)
  const littleEndian = byteOrder === 'II'
  const readUInt16 = (offset) => littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset)
  const readUInt32 = (offset) => littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset)
  assert.equal(readUInt16(2), 42, `${filename}: invalid classic TIFF signature`)

  const ifdOffset = readUInt32(4)
  const entryCount = readUInt16(ifdOffset)
  const dimensions = new Map()
  for (let index = 0; index < entryCount; index += 1) {
    const entry = ifdOffset + 2 + index * 12
    const tag = readUInt16(entry)
    if (![256, 257].includes(tag)) continue
    const type = readUInt16(entry + 2)
    const count = readUInt32(entry + 4)
    assert.equal(count, 1, `${filename}: TIFF dimension tag must contain one value`)
    const value = type === 3 ? readUInt16(entry + 8) : type === 4 ? readUInt32(entry + 8) : null
    assert.ok(value, `${filename}: unsupported TIFF dimension field type ${type}`)
    dimensions.set(tag, value)
  }
  assert.ok(dimensions.has(256) && dimensions.has(257), `${filename}: TIFF width and height tags are required`)
  return { width: dimensions.get(256), height: dimensions.get(257) }
}

const rasterAsset = (overrides = {}) => ({
  id: 'test-raster',
  kind: 'photo',
  title: 'Resolution test image',
  creator: 'Test creator',
  createdAt: '2026-07-17',
  location: 'Test studio',
  sourceUrl: 'https://example.test/source',
  rights: 'owned',
  licenseFile: 'book/assets/rights/test-raster.md',
  creditLine: 'Test creator',
  path: 'book/assets/private/test-raster.tif',
  pixelWidth: 3000,
  pixelHeight: 3000,
  effectiveDpi: 300,
  status: 'print-ready',
  spreadIds: ['A-P001'],
  placementWidthMm: 254,
  placementHeightMm: 254,
  ...overrides,
})

const vectorAsset = (overrides = {}) => ({
  id: 'test-vector',
  kind: 'map',
  title: 'Vector test plate',
  creator: 'Test cartographer',
  createdAt: '2026-07-17',
  location: null,
  sourceUrl: 'https://example.test/source',
  rights: 'owned',
  licenseFile: 'book/assets/rights/test-vector.md',
  creditLine: 'Test cartographer',
  path: 'book/assets/maps/test-vector.svg',
  pixelWidth: null,
  pixelHeight: null,
  effectiveDpi: null,
  status: 'print-ready',
  spreadIds: ['A-P002'],
  viewBox: '0 0 1000 800',
  ...overrides,
})

const conceptRasterAsset = (overrides = {}) => {
  const asset = rasterAsset({
    creator: null,
    createdAt: null,
    location: null,
    sourceUrl: null,
    rights: 'pending',
    licenseFile: null,
    creditLine: 'Pending creator and rights clearance',
    effectiveDpi: null,
    status: 'concept',
    ...overrides,
  })
  delete asset.placementWidthMm
  delete asset.placementHeightMm
  return asset
}

test('exports exact effective DPI calculation', () => {
  assert.equal(typeof validator.effectiveDpi, 'function')
  assert.equal(validator.effectiveDpi?.(3000, 254), 300)
})

test('rejects rounded 2906 by 3614 floor for a 246 by 306 mm page', () => {
  assert.throws(
    () => validator.validateAssets([
      rasterAsset({ pixelWidth: 2906, pixelHeight: 3614, placementWidthMm: 246, placementHeightMm: 306 }),
    ]),
    /asset test-raster: effective dpi below 300/,
  )
})

test('accepts the strict 2906 by 3615 minimum for a 246 by 306 mm page', () => {
  assert.doesNotThrow(() => validator.validateAssets([
    rasterAsset({
      pixelWidth: 2906,
      pixelHeight: 3615,
      effectiveDpi: 300.1,
      placementWidthMm: 246,
      placementHeightMm: 306,
    }),
  ]))
})

test('rejects either dimension below the strict full-page pixel floor', () => {
  for (const dimensions of [
    { pixelWidth: 2905, pixelHeight: 3615 },
    { pixelWidth: 2906, pixelHeight: 3614 },
  ]) {
    assert.throws(
      () => validator.validateAssets([rasterAsset({ ...dimensions, placementWidthMm: 246, placementHeightMm: 306 })]),
      /asset test-raster: effective dpi below 300/,
    )
  }
})

test('rejects rounded 5811 by 3614 floor for a 492 by 306 mm spread', () => {
  assert.throws(
    () => validator.validateAssets([
      rasterAsset({ pixelWidth: 5811, pixelHeight: 3614, placementWidthMm: 492, placementHeightMm: 306 }),
    ]),
    /asset test-raster: effective dpi below 300/,
  )
})

test('accepts the strict 5812 by 3615 minimum for a 492 by 306 mm spread', () => {
  assert.doesNotThrow(() => validator.validateAssets([
    rasterAsset({
      pixelWidth: 5812,
      pixelHeight: 3615,
      effectiveDpi: 300.1,
      placementWidthMm: 492,
      placementHeightMm: 306,
    }),
  ]))
})

test('rejects either dimension below the strict full-spread pixel floor', () => {
  for (const dimensions of [
    { pixelWidth: 5811, pixelHeight: 3615 },
    { pixelWidth: 5812, pixelHeight: 3614 },
  ]) {
    assert.throws(
      () => validator.validateAssets([rasterAsset({ ...dimensions, placementWidthMm: 492, placementHeightMm: 306 })]),
      /asset test-raster: effective dpi below 300/,
    )
  }
})

test('allows a smaller registered placement only at 300 effective DPI', () => {
  assert.doesNotThrow(() => validator.validateAssets([
    rasterAsset({ pixelWidth: 1418, pixelHeight: 945, placementWidthMm: 120, placementHeightMm: 80 }),
  ]))
})

test('rejects 299.9 effective DPI and accepts 300', () => {
  assert.throws(
    () => validator.validateAssets([rasterAsset({ pixelWidth: 2999, pixelHeight: 2999, effectiveDpi: 299.9 })]),
    /asset test-raster: effective dpi below 300 \(299\.9\)/,
  )
  assert.doesNotThrow(() => validator.validateAssets([rasterAsset()]))
})

test('does not trust a stale registered effective DPI', () => {
  assert.throws(
    () => validator.validateAssets([rasterAsset({ effectiveDpi: 350 })]),
    /asset test-raster: registered effectiveDpi 350 does not match calculated 300/,
  )
})

test('requires effectiveDpi to be null or a positive finite number for every raster status', () => {
  for (const effectiveDpi of ['300', 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => validator.validateAssets([conceptRasterAsset({ effectiveDpi })]),
      /asset test-raster: effectiveDpi must be null or a positive finite number/,
    )
  }
})

test('requires registered DPI to match calculated DPI whenever placement is present', () => {
  const asset = conceptRasterAsset({ effectiveDpi: 320 })
  asset.placementWidthMm = 254
  asset.placementHeightMm = 254
  assert.throws(
    () => validator.validateAssets([asset]),
    /asset test-raster: registered effectiveDpi 320 does not match calculated 300/,
  )
})

test('allows known concept pixels with null DPI when no placement is registered', () => {
  assert.doesNotThrow(() => validator.validateAssets([
    conceptRasterAsset({ pixelWidth: 1672, pixelHeight: 941, effectiveDpi: null }),
  ]))
})

test('rejects pending or rejected rights for print-ready raster assets', () => {
  for (const rights of ['pending', 'rejected']) {
    assert.throws(
      () => validator.validateAssets([rasterAsset({ rights })]),
      new RegExp(`asset test-raster: print-ready asset requires cleared rights: ${rights}`),
    )
  }
})

test('requires a numeric four-value viewBox for print-ready vectors', () => {
  for (const viewBox of [undefined, null, '', '0 0 1000', '0 0 -100 800']) {
    assert.throws(
      () => validator.validateAssets([vectorAsset({ viewBox })]),
      /asset test-vector: print-ready vector requires valid viewBox/,
    )
  }
  assert.doesNotThrow(() => validator.validateAssets([vectorAsset()]))
})

test('rejects non-decimal and non-finite SVG viewBox tokens and malformed separators', () => {
  for (const viewBox of ['0 0 0x10 20', '0 0 NaN 20', '0 0 Infinity 20', '0,,0,100,20', '0 0,10020']) {
    assert.throws(
      () => validator.validateAssets([vectorAsset({ viewBox })]),
      /asset test-vector: print-ready vector requires valid viewBox/,
    )
  }
})

test('accepts strict decimal and exponent SVG viewBox tokens', () => {
  assert.doesNotThrow(() => validator.validateAssets([
    vectorAsset({ viewBox: '-1.5e1, +2.5 1e3,8E2' }),
  ]))
})

test('rejects duplicate ids and reports the asset id', () => {
  assert.throws(
    () => validator.validateAssets([rasterAsset(), rasterAsset()]),
    /asset test-raster: duplicate asset id/,
  )
})

test('rejects invalid kind, rights, and status enums with the asset id', () => {
  for (const [field, value] of [['kind', 'painting'], ['rights', 'unknown'], ['status', 'approved']]) {
    assert.throws(
      () => validator.validateAssets([rasterAsset({ [field]: value })]),
      new RegExp(`asset test-raster: invalid asset ${field}: ${value}`),
    )
  }
})

test('requires every base metadata key', () => {
  const required = [
    'id', 'kind', 'title', 'creator', 'createdAt', 'location', 'sourceUrl', 'rights',
    'licenseFile', 'creditLine', 'path', 'pixelWidth', 'pixelHeight', 'effectiveDpi',
    'status', 'spreadIds',
  ]
  for (const field of required) {
    const record = rasterAsset({ id: `missing-${field}` })
    delete record[field]
    const expected = field === 'id'
      ? /asset requires nonblank id/
      : new RegExp(`asset missing-${field}: missing required metadata: ${field}`)
    assert.throws(() => validator.validateAssets([record]), expected)
  }
})

test('accepts honest null dimensions for concepts but not for print-ready raster', () => {
  const concept = conceptRasterAsset({
    id: 'planned-photo',
    pixelWidth: null,
    pixelHeight: null,
  })

  assert.doesNotThrow(() => validator.validateAssets([concept]))
  assert.throws(
    () => validator.validateAssets([{ ...concept, rights: 'owned', status: 'print-ready' }]),
    /asset planned-photo: print-ready raster requires positive pixel and placement dimensions/,
  )
})

test('requires nonempty unique spreadIds for active assets', () => {
  for (const spreadIds of [[], ['A-P001', 'A-P001'], ['   ']]) {
    assert.throws(
      () => validator.validateAssets([conceptRasterAsset({ spreadIds })]),
      /asset test-raster: active asset requires nonempty unique spreadIds/,
    )
  }
})

test('allows an empty spreadIds array for rejected assets', () => {
  assert.doesNotThrow(() => validator.validateAssets([
    conceptRasterAsset({ rights: 'rejected', status: 'rejected', spreadIds: [] }),
  ]))
})

test('registers all four existing site WebP files as pending concepts at measured dimensions', () => {
  const expectedPaths = [
    'public/images/fermentation-microcosm.webp',
    'public/images/puer-hero.webp',
    'public/images/puer-material-culture.webp',
    'public/images/sheng-shou-paths.webp',
  ]
  for (const assetPath of expectedPaths) {
    const asset = assets.find((item) => item.path === assetPath)
    assert.ok(asset, `missing ${assetPath}`)
    assert.equal(asset.status, 'concept')
    assert.equal(asset.rights, 'pending')
    assert.equal(asset.pixelWidth, 1672)
    assert.equal(asset.pixelHeight, 941)
    assert.equal(asset.effectiveDpi, null)
  }
})

test('planned concepts keep unknown dimensions explicit and cover the required visual programme', () => {
  const requiredIds = [
    'photo-yunnan-mountain-landscape',
    'photo-tea-forest-landscape',
    'photo-tea-garden-documentary',
    'photo-assamica-botanical-macro',
    'photo-maocha-production-sequence',
    'photo-tea-worker-portrait',
    'photo-pressings-object-atlas',
    'photo-wrappers-object-atlas',
    'photo-water-brewing-detail',
    'photo-tea-liquor-cups',
    'map-jingmai-landscape',
    'map-puer-administration-history',
    'map-storage-climates',
    'diagram-microbiology-community',
    'diagram-microbiology-safety-methods',
    'diagram-medical-study-limitations',
    'illustration-guide-spots',
  ]
  for (const id of requiredIds) {
    const asset = assets.find((item) => item.id === id)
    assert.ok(asset, `missing planned asset ${id}`)
    assert.equal(asset.status, 'concept')
    assert.equal(asset.rights, 'pending')
    assert.equal(asset.effectiveDpi, null)
    if (['photo', 'archive', 'illustration'].includes(asset.kind)) {
      assert.equal(asset.pixelWidth, null)
      assert.equal(asset.pixelHeight, null)
    }
  }
})

test('registers exactly three owned AI-assisted previews behind native-detail and prepress stop-gates', () => {
  const expectedMasters = new Map([
    ['illustration-shennong-gate', 'book/assets/private/illustrations/shennong-gate.tif'],
    ['illustration-zhuge-liang-legend', 'book/assets/private/illustrations/zhuge-liang-legend.tif'],
    ['illustration-cover-living-mountain', 'book/assets/private/illustrations/cover-living-mountain.tif'],
  ])
  const generatedIllustrations = assets.filter((asset) => expectedMasters.has(asset.id))
  assert.equal(generatedIllustrations.length, 3)

  const rightsFiles = new Set()
  for (const asset of generatedIllustrations) {
    assert.equal(asset.kind, 'illustration', `${asset.id}: kind`)
    assert.equal(asset.status, 'preview', `${asset.id}: interpolated proof candidate must remain preview`)
    assert.equal(asset.rights, 'owned', `${asset.id}: rights`)
    assert.equal(asset.path, expectedMasters.get(asset.id), `${asset.id}: private master path`)
    assert.notEqual(asset.status, 'print-ready', `${asset.id}: candidate dimensions cannot imply print readiness`)

    const candidateFields = ['pixelWidth', 'pixelHeight', 'placementWidthMm', 'placementHeightMm', 'effectiveDpi']
    const hasProofCandidate = candidateFields.some((field) => asset[field] !== null && asset[field] !== undefined)
    if (hasProofCandidate) {
      assert.equal(asset.pixelWidth, 2906, `${asset.id}: proof-candidate width`)
      assert.equal(asset.pixelHeight, 3615, `${asset.id}: proof-candidate height`)
      assert.equal(asset.placementWidthMm, 246, `${asset.id}: candidate placement width`)
      assert.equal(asset.placementHeightMm, 306, `${asset.id}: candidate placement height`)
      assert.equal(asset.effectiveDpi, 300.1, `${asset.id}: candidate effective DPI`)
    } else {
      assert.equal(asset.pixelWidth, null, `${asset.id}: unknown candidate width must be null`)
      assert.equal(asset.pixelHeight, null, `${asset.id}: unknown candidate height must be null`)
      assert.equal(asset.effectiveDpi, null, `${asset.id}: unknown candidate DPI must be null`)
      assert.ok(!Object.hasOwn(asset, 'placementWidthMm') && !Object.hasOwn(asset, 'placementHeightMm'), `${asset.id}: absent candidate cannot claim placement`)
    }
    assert.match(asset.creator ?? '', /OpenAI/iu, `${asset.id}: creator disclosure`)
    assert.match(asset.creditLine ?? '', /OpenAI/iu, `${asset.id}: credit disclosure`)

    assert.match(asset.licenseFile ?? '', /^book\/assets\/rights\/illustration-[a-z0-9-]+\.md$/u)
    assert.ok(!rightsFiles.has(asset.licenseFile), `${asset.id}: rights file must be unique`)
    rightsFiles.add(asset.licenseFile)

    const expectedPreview = `book/assets/previews/${asset.id}--preview-v01.png`
    assert.equal(path.basename(expectedPreview), `${asset.id}--preview-v01.png`)
    const masterPath = path.join(repoRoot, asset.path)
    const previewPath = path.join(repoRoot, expectedPreview)
    const rightsPath = path.join(repoRoot, asset.licenseFile)
    for (const [label, filename] of [['preview', previewPath], ['rights evidence', rightsPath]]) {
      assert.ok(fs.existsSync(filename), `${asset.id}: ${label} is missing`)
      assert.ok(fs.statSync(filename).isFile(), `${asset.id}: ${label} must be a regular file`)
    }

    assert.deepEqual(readPngDimensions(previewPath), { width: 1122, height: 1402 }, `${asset.id}: preview dimensions`)
    if (fs.existsSync(masterPath)) {
      assert.ok(fs.statSync(masterPath).isFile(), `${asset.id}: optional local TIFF must be a regular file`)
      if (hasProofCandidate) {
        assert.deepEqual(readTiffDimensions(masterPath), { width: 2906, height: 3615 }, `${asset.id}: local proof-candidate dimensions`)
      }
    }

    const rights = fs.readFileSync(rightsPath, 'utf8')
    assert.match(rights, new RegExp(asset.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'))
    assert.match(rights, new RegExp(expectedPreview.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'))
    assert.match(rights, /OpenAI/iu, `${asset.id}: OpenAI must be disclosed`)
    assert.match(rights, /AI-assisted/iu, `${asset.id}: AI assistance must be disclosed`)
    assert.match(rights, /illustration|illustrative/iu, `${asset.id}: illustrative status must be explicit`)
    assert.match(rights, /not (?:documentary|evidence)|не (?:документ|свидетельств)/iu, `${asset.id}: non-documentary boundary must be explicit`)
    assert.match(rights, /resampl|interpol|upscal|увеличен|масштабирован/iu, `${asset.id}: interpolation must be disclosed`)
    assert.match(rights, /STOP[ -]GATE|СТОП[ -]ГЕЙТ/iu, `${asset.id}: explicit stop-gate is required`)
    assert.match(rights, /native[ -]detail|нативн[^.]{0,30}детал/iu, `${asset.id}: native-detail review is pending`)
    assert.match(rights, /colou?r[^.]{0,30}proof|цветопроб/iu, `${asset.id}: colour proof is pending`)
    assert.match(rights, /prepress|предпечат/iu, `${asset.id}: prepress proof is pending`)
    assert.match(rights, /not (?:a )?print-ready|не готов[^.]{0,30}печат|blocked[^.]{0,30}print/iu, `${asset.id}: print readiness must remain blocked`)
  }
  assert.equal(rightsFiles.size, 3)
})
