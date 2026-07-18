import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const bookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(bookRoot, '..')
const readJson = (filename) => JSON.parse(fs.readFileSync(path.join(bookRoot, filename), 'utf8'))
const assets = readJson('data/assets.json')
const palette = readJson('config/palette.json')
const typography = readJson('config/typography.json')

const commonViewBox = '0 0 1200 1500'
const viewBoxWidth = 1200
const minimumPlacementWidthMm = 150
const minimumPlacementHeightMm = 187.5
const minimumStrokeWidthMm = 0.2
const minimumFontSizePt = typography.minimumCaptionPointSize
const millimetresPerPoint = 25.4 / 72

const assetSpecs = [
  {
    id: 'map-yunnan-relief',
    kind: 'map',
    path: 'book/assets/maps/yunnan-relief.svg',
    layers: ['terrain', 'rivers', 'boundaries', 'tea-regions', 'labels', 'legend', 'scale', 'north-arrow', 'sources'],
    terms: [
      /Юньнань/u,
      /Пуэр/u,
      /водосбор|водный режим/iu,
      /бассейн Иравади · 独龙江/u,
      /бассейн Янцзы · 金沙江/u,
      /бассейн Жемчужной · 南盘江/u,
    ],
  },
  {
    id: 'map-six-mountains',
    kind: 'map',
    path: 'book/assets/maps/six-mountains.svg',
    layers: ['terrain', 'rivers', 'boundaries', 'tea-regions', 'labels', 'legend', 'scale', 'north-arrow', 'sources'],
    terms: [/Юлэ/u, /Гэдэн/u, /Ибан/u, /Манчжи/u, /Маньчжуань/u, /Маньса/u],
  },
  {
    id: 'map-tea-routes',
    kind: 'map',
    path: 'book/assets/maps/tea-routes.svg',
    layers: ['terrain', 'rivers', 'boundaries', 'tea-regions', 'routes', 'labels', 'legend', 'scale', 'north-arrow', 'sources'],
    terms: [/чай/iu, /документирован/iu, /интерпретац/iu],
  },
  {
    id: 'diagram-maocha-process',
    kind: 'diagram',
    path: 'book/assets/diagrams/maocha-process.svg',
    layers: ['process-steps', 'conditions', 'outcomes', 'labels', 'legend', 'sources'],
    minimumSemanticGroups: 6,
    terms: [
      /маоча/iu,
      /свежий лист/iu,
      /раскладк/iu,
      /шацин/iu,
      /скручиван/iu,
      /разбиван[^.]{0,30}комк/iu,
      /солнечн[^.]{0,30}сушк/iu,
      /упаковк/iu,
    ],
  },
  {
    id: 'diagram-sheng-shou-fork',
    kind: 'diagram',
    path: 'book/assets/diagrams/sheng-shou-fork.svg',
    layers: ['shared-input', 'sheng-path', 'shou-path', 'labels', 'legend', 'sources'],
    minimumSemanticGroups: 3,
    terms: [/шайцин[\s-]маоча/iu, /шэн/iu, /шу/iu, /влажн[^.]{0,30}кучеван/iu, /хранен/iu],
    forbiddenTerms: [/шоу/iu],
  },
  {
    id: 'diagram-wodui-heat',
    kind: 'diagram',
    path: 'book/assets/diagrams/wodui-heat.svg',
    layers: ['axes', 'measurements', 'process-stages', 'uncertainty', 'labels', 'legend', 'sources'],
    minimumSemanticGroups: 3,
    terms: [/водуй/iu, /увлажнен/iu, /температур/iu, /переворот/iu, /сушк/iu, /°C/u, /условн|не универсаль/iu],
    forbiddenTerms: [/\bwodui\b/iu],
  },
  {
    id: 'diagram-medical-evidence-scale',
    kind: 'diagram',
    path: 'book/assets/diagrams/evidence-scale.svg',
    layers: ['evidence-levels', 'applicability', 'limitations', 'labels', 'legend', 'sources'],
    minimumSemanticGroups: 5,
    terms: [
      /A\s*[—-][^.]{0,80}официальн[^.]{0,30}рекомендац/iu,
      /B\s*[—-][^.]{0,100}систематическ[^.]{0,40}обзор/iu,
      /C\s*[—-][^.]{0,80}исследован[^.]{0,20}людей/iu,
      /D\s*[—-][^.]{0,100}(?:животн|клеточн|лабораторн|химическ|микробиологическ)/iu,
      /E\s*[—-][^.]{0,100}историческ[^.]{0,40}медицин/iu,
      /не (?:доказывает|означает)[^.]{0,80}(?:лечен|эффективност)/iu,
    ],
  },
  {
    id: 'diagram-storage-variables',
    kind: 'diagram',
    path: 'book/assets/diagrams/storage-map.svg',
    layers: ['variables', 'safe-practice', 'warning-signs', 'labels', 'legend', 'sources'],
    minimumSemanticGroups: 3,
    terms: [
      /шэн/iu,
      /шу/iu,
      /сух/iu,
      /чист/iu,
      /посторонн[^.]{0,20}запах/iu,
      /плесен/iu,
      /вредител/iu,
      /проверьте следы намокания и вредителей/iu,
      /не проб/iu,
      /нет универсальн[^.]{0,30}(?:срок|режим|влажност)/iu,
    ],
    forbiddenTerms: [/шоу/iu],
  },
]

const mapSpecs = assetSpecs.filter((spec) => spec.kind === 'map')
const diagramSpecs = assetSpecs.filter((spec) => spec.kind === 'diagram')
const plannedPaths = assetSpecs.map((spec) => spec.path).sort()
const mapPaths = mapSpecs.map((spec) => spec.path).sort()
const diagramPaths = diagramSpecs.map((spec) => spec.path).sort()
const paletteColours = new Set(Object.values(palette).map((colour) => colour.toUpperCase()))
const allowedCartographyHosts = new Set([
  'www.webmap.cn',
  'dnr.yn.gov.cn',
  'wcb.yn.gov.cn',
  'mzzj.yn.gov.cn',
  'zwgk.mct.gov.cn',
  'dataspace.copernicus.eu',
  'www.hydrosheds.org',
  'ctext.org',
  'uwapress.uw.edu',
])
const allowedFonts = new Set([
  typography.display,
  typography.body,
  typography.interface,
  typography.chinese,
])

const masterPath = (spec) => path.join(repoRoot, spec.path)

function readSvg(spec) {
  const filename = masterPath(spec)
  assert.ok(fs.existsSync(filename), `${spec.id}: missing SVG master ${spec.path}`)
  assert.ok(fs.statSync(filename).isFile(), `${spec.id}: SVG master must be a regular file`)
  return fs.readFileSync(filename, 'utf8')
}

function parseSvg(spec) {
  const source = readSvg(spec)
  assert.match(source, /^\uFEFF?\s*<\?xml\s+version=["']1\.0["']/u, `${spec.id}: XML declaration is required`)
  assert.doesNotMatch(source, /<!DOCTYPE|<\?xml-stylesheet/iu, `${spec.id}: external XML declarations are forbidden`)
  let document
  assert.doesNotThrow(() => {
    document = new JSDOM(source, { contentType: 'image/svg+xml' }).window.document
  }, `${spec.id}: SVG must be well-formed XML`)
  const root = document.documentElement
  assert.equal(root.localName, 'svg', `${spec.id}: document root must be svg`)
  assert.equal(root.namespaceURI, 'http://www.w3.org/2000/svg', `${spec.id}: SVG namespace is required`)
  return { source, document, root }
}

function numericAttribute(element, name, label) {
  const raw = element.getAttribute(name)
  assert.ok(raw !== null && raw.trim(), `${label}: ${name} is required`)
  assert.match(raw, /^(?:\d+(?:\.\d*)?|\.\d+)$/u, `${label}: ${name} must be a unitless decimal`)
  const value = Number(raw)
  assert.ok(Number.isFinite(value) && value > 0, `${label}: ${name} must be positive`)
  return value
}

const compactText = (element) => element.textContent.replace(/\s+/gu, ' ').trim()
const visibleSvgText = (document) => [...document.querySelectorAll('text')]
  .map((label) => {
    const lines = [...label.querySelectorAll('tspan')]
    return lines.length > 0 ? lines.map((line) => compactText(line)).join(' ') : compactText(label)
  })
  .filter(Boolean)
  .join(' ')

test('the Task 15 vector programme names exactly eight masters and preserves registry ids', () => {
  assert.equal(assetSpecs.length, 8)
  assert.equal(new Set(assetSpecs.map((spec) => spec.id)).size, 8)
  assert.equal(new Set(assetSpecs.map((spec) => spec.path)).size, 8)

  for (const spec of assetSpecs) {
    const record = assets.find((asset) => asset.id === spec.id)
    assert.ok(record, `missing asset registry id ${spec.id}`)
    assert.equal(record.path, spec.path, `${spec.id}: registry path drift`)
    assert.equal(record.kind, spec.kind, `${spec.id}: registry kind drift`)
  }
})

test('all eight masters are accessible, well-formed SVGs with the common registered geometry', async (t) => {
  for (const spec of assetSpecs) {
    await t.test(spec.id, () => {
      const { root } = parseSvg(spec)
      assert.equal(root.getAttribute('viewBox'), commonViewBox, `${spec.id}: common viewBox is required`)
      assert.equal(Number(root.getAttribute('data-min-placement-width-mm')), minimumPlacementWidthMm)
      assert.equal(Number(root.getAttribute('data-min-placement-height-mm')), minimumPlacementHeightMm)
      assert.equal(Number(root.getAttribute('data-min-font-size-pt')), minimumFontSizePt)
      assert.equal(Number(root.getAttribute('data-min-stroke-width-mm')), minimumStrokeWidthMm)
      assert.equal(root.getAttribute('data-asset-id'), spec.id)
      assert.equal(root.getAttribute('data-asset-class'), spec.kind)
      assert.equal(root.getAttribute('role'), 'img')

      const title = [...root.children].find((child) => child.localName === 'title')
      const description = [...root.children].find((child) => child.localName === 'desc')
      assert.ok(title && compactText(title).length >= 8, `${spec.id}: accessible title is required`)
      assert.ok(description && compactText(description).length >= 30, `${spec.id}: accessible description is required`)
      assert.ok(title.id, `${spec.id}: title id is required`)
      assert.ok(description.id, `${spec.id}: description id is required`)
      assert.equal(root.getAttribute('aria-labelledby'), `${title.id} ${description.id}`)
    })
  }
})

test('each asset exposes the named production layers required by its class', async (t) => {
  for (const spec of assetSpecs) {
    await t.test(spec.id, () => {
      const { document } = parseSvg(spec)
      const layerIds = [...document.querySelectorAll('g[id]')].map((group) => group.id)
      assert.equal(new Set(layerIds).size, layerIds.length, `${spec.id}: layer ids must be unique`)
      for (const layer of spec.layers) {
        const group = document.getElementById(layer)
        assert.ok(group, `${spec.id}: missing #${layer} layer`)
        assert.equal(group.localName, 'g', `${spec.id}: #${layer} must be a group`)
        assert.ok(group.children.length > 0, `${spec.id}: #${layer} must not be empty`)
      }
    })
  }
})

test('map previews carry the exact compliance dossier in registry, metadata and visible notes', async (t) => {
  const cartographyKeys = [
    'boundaryReference',
    'datasetVersions',
    'interpretiveLayer',
    'projection',
    'projectionStatus',
    'reviewStatus',
    'sourceUrls',
    'uncertaintyNote',
  ]
  const pendingReviewStatus = {
    anchorVerification: 'pending',
    chineseCartographicReview: 'pending',
    printUse: 'blocked',
    shenTuHao: 'pending',
  }

  for (const spec of mapSpecs) {
    await t.test(spec.id, () => {
      const { root, document } = parseSvg(spec)
      const asset = assets.find((item) => item.id === spec.id)
      assert.equal(asset.status, 'preview', `${spec.id}: map must remain preview`)
      assert.equal(asset.rights, 'pending', `${spec.id}: source terms are not yet cleared for a licensed claim`)
      assert.ok(asset.cartography && typeof asset.cartography === 'object' && !Array.isArray(asset.cartography), `${spec.id}: cartography dossier is required`)
      assert.deepEqual(Object.keys(asset.cartography).sort(), cartographyKeys)

      const cartography = asset.cartography
      assert.equal(cartography.projectionStatus, 'planned', `${spec.id}: proposed PROJ string is not an applied transform`)
      assert.match(cartography.projection, /^\+proj=[a-z0-9]+(?:\s+\+[a-z0-9_]+(?:=[^\s]+)?)+$/iu, `${spec.id}: proposed projection must remain an explicit PROJ string`)
      for (const field of ['projection', 'boundaryReference', 'interpretiveLayer', 'uncertaintyNote']) {
        assert.ok(typeof cartography[field] === 'string' && cartography[field].trim().length >= 8, `${spec.id}: cartography.${field} is required`)
        assert.doesNotMatch(cartography[field], /TBD|TODO|уточнить|placeholder/iu, `${spec.id}: cartography.${field} is unresolved`)
      }
      assert.ok(cartography.uncertaintyNote.trim().length >= 40, `${spec.id}: uncertainty note is too vague`)
      assert.ok(
        Array.isArray(cartography.datasetVersions)
          && cartography.datasetVersions.length >= 1
          && cartography.datasetVersions.every((version) => typeof version === 'string' && version.trim().length >= 6),
        `${spec.id}: versioned datasets are required`,
      )
      assert.match(
        `${cartography.boundaryReference} ${cartography.datasetVersions.join(' ')}`,
        /\b(?:19|20)\d{2}(?:-\d{2}-\d{2})?\b/u,
        `${spec.id}: boundary or dataset reference must name its date/version year`,
      )
      assert.ok(
        Array.isArray(cartography.sourceUrls)
          && cartography.sourceUrls.length >= 2
          && new Set(cartography.sourceUrls).size === cartography.sourceUrls.length,
        `${spec.id}: at least two unique official source URLs are required`,
      )
      assert.deepEqual(cartography.reviewStatus, pendingReviewStatus, `${spec.id}: print stop-gate must remain closed`)

      const chineseGovernmentUrls = new Set()
      for (const sourceUrl of cartography.sourceUrls) {
        const source = new URL(sourceUrl)
        assert.equal(source.protocol, 'https:', `${spec.id}: cartographic source must use HTTPS`)
        assert.ok(
          allowedCartographyHosts.has(source.hostname),
          `${spec.id}: cartographic source host is outside the reviewed institutional allowlist: ${source.hostname}`,
        )
        if (/(?:^|\.)gov\.cn$/u.test(source.hostname)) chineseGovernmentUrls.add(source.href)
      }
      assert.ok(
        chineseGovernmentUrls.size >= 2,
        `${spec.id}: at least two distinct official Chinese government .gov.cn URLs are required`,
      )
      assert.equal(asset.sourceUrl, cartography.sourceUrls[0], `${spec.id}: primary sourceUrl must lead the dossier source list`)

      const sourceText = compactText(document.getElementById('sources') ?? document.createElement('g'))
      const metadata = document.querySelector('metadata#cartographic-compliance')
      assert.ok(metadata, `${spec.id}: #cartographic-compliance metadata is required`)
      const metadataText = compactText(metadata)

      const scalarFields = ['projection', 'boundaryReference', 'interpretiveLayer', 'uncertaintyNote']
      for (const field of scalarFields) {
        const value = cartography[field]
        const escaped = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u')
        assert.match(metadataText, escaped, `${spec.id}: ${field} must be present in SVG metadata`)
        assert.match(sourceText, escaped, `${spec.id}: ${field} must be visible in #sources`)
      }
      assert.match(metadataText, /projectionStatus:\s*planned/iu, `${spec.id}: planned projection status must be present in SVG metadata`)
      for (const version of cartography.datasetVersions) {
        const escaped = new RegExp(version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u')
        assert.match(metadataText, escaped, `${spec.id}: dataset version must be present in SVG metadata`)
        assert.match(sourceText, escaped, `${spec.id}: dataset version must be visible in #sources`)
      }
      for (const sourceUrl of cartography.sourceUrls) {
        const escapedUrl = new RegExp(sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u')
        assert.match(metadataText, escapedUrl, `${spec.id}: official source URL must be present in SVG metadata`)
        assert.match(sourceText, new RegExp(new URL(sourceUrl).hostname.replace(/\./g, '\\.'), 'u'), `${spec.id}: official source host must be visible in #sources`)
      }

      assert.equal(root.getAttribute('data-projection'), cartography.projection)
      assert.equal(root.getAttribute('data-projection-status'), 'planned')
      assert.equal(root.getAttribute('data-dataset-versions'), cartography.datasetVersions.join(' | '))
      assert.equal(root.getAttribute('data-boundary-reference'), cartography.boundaryReference)
      assert.equal(root.getAttribute('data-interpretive-layer'), cartography.interpretiveLayer)
      assert.equal(root.getAttribute('data-uncertainty'), cartography.uncertaintyNote)
      assert.equal(root.getAttribute('data-review-status'), 'blocked-pending-chinese-review')
      assert.match(sourceText, new RegExp(`Проекция \\(план\\): ${cartography.projection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u'))
      assert.doesNotMatch(sourceText, /проекци[^.]{0,30}(?:применена|выполнена)|applied projection/iu, `${spec.id}: proposed projection must not be described as applied`)

      assert.match(sourceText, /Официальн[^:]{0,30}основ[^:]{0,10}:/iu)
      assert.match(sourceText, /Редакционн[^:]{0,30}обобщен[^:]{0,10}:/iu)
      assert.match(sourceText, /Непроверенн[^:]{0,30}геометри[^:]{0,10}:/iu)
      assert.match(sourceText, /STOP[ -]GATE|СТОП[ -]ГЕЙТ/iu)
      assert.match(sourceText, /не допущен[^.]{0,40}(?:к )?печат/iu)
      assert.match(sourceText, /китайск[^.]{0,40}картографическ[^.]{0,30}проверк/iu)
      assert.match(sourceText, /审图号/u)
      assert.match(sourceText, /опорн[^.]{0,20}точ|anchor/iu)
    })
  }
})

test('tea routes plot interpretive connections but no protected documented segment geometry', () => {
  const spec = assetSpecs.find((item) => item.id === 'map-tea-routes')
  const { document, root } = parseSvg(spec)
  const routes = document.getElementById('routes')
  const documented = [...routes.querySelectorAll('path[data-evidence="documented"]')]
  const interpretive = [...routes.querySelectorAll('path[data-evidence="interpretive"]')]
  assert.equal(documented.length, 0, 'map-tea-routes: no protected documented segment geometry is available')
  assert.ok(interpretive.length > 0, 'map-tea-routes: interpretive connection paths are required')
  for (const connection of interpretive) {
    assert.ok(connection.getAttribute('stroke') && connection.getAttribute('stroke') !== 'none')
    assert.match(connection.getAttribute('stroke-dasharray') ?? '', /\d/u, 'interpretive route must be dashed')
  }
  assert.equal(document.querySelectorAll('#legend [data-evidence="documented"]').length, 0, 'legend samples are not evidence geometry')
  assert.equal(root.getAttribute('data-route-continuity'), 'not-claimed', 'historical route continuity must not be claimed')
  for (const route of routes.querySelectorAll('[data-evidence]')) {
    assert.equal(route.getAttribute('data-continuity'), 'segment', 'every route geometry must be an explicitly bounded segment')
  }

  const legend = compactText(document.getElementById('legend'))
  assert.match(legend, /Документированные сегменты:\s*не нанесены/iu)
  assert.match(legend, /интерпретац/iu)
})

test('map previews never claim surveyed tea polygons or continuous historical routes', async (t) => {
  for (const spec of mapSpecs) {
    await t.test(spec.id, () => {
      const { source, document } = parseSvg(spec)
      assert.doesNotMatch(
        source,
        /surveyed tea polygon|полев(?:ой|ая|ые) съ[её]мк[^<]{0,40}чай|точн(?:ая|ые) границ[^<]{0,40}чай|непрерывн(?:ый|ая)[^<]{0,40}(?:историческ[^<]{0,20})?маршрут/iu,
        `${spec.id}: unverified geometry must not be presented as surveyed or continuous`,
      )
      const teaRegions = document.getElementById('tea-regions')
      const teaGeometry = [...teaRegions.querySelectorAll('path, polygon, polyline, rect, circle, ellipse')]
      assert.ok(teaGeometry.length > 0, `${spec.id}: generalized tea-region geometry is required`)
      for (const geometry of teaGeometry) {
        assert.equal(
          geometry.getAttribute('data-geometry-status'),
          'generalized-editorial',
          `${spec.id}: tea geometry must be explicitly generalized editorial work`,
        )
        assert.notEqual(geometry.getAttribute('data-survey-status'), 'surveyed')
      }
      assert.equal(document.querySelectorAll('[data-continuity="continuous"]').length, 0)
    })
  }
})

test('diagrams encode meaning with a labelled shape and never masquerade as micrographs', async (t) => {
  for (const spec of assetSpecs.filter((item) => item.kind === 'diagram')) {
    await t.test(spec.id, () => {
      const { source, document, root } = parseSvg(spec)
      assert.equal(root.getAttribute('data-visual-mode'), 'explanatory-diagram')
      assert.doesNotMatch(source, /micrograph|photomicro|microscop|микрофот/iu, `${spec.id}: simulated micrograph language is forbidden`)
      assert.equal(document.querySelectorAll('filter').length, 0, `${spec.id}: faux-micrograph SVG filters are forbidden`)

      const semanticGroups = [...document.querySelectorAll('g[data-encoding="shape+label"]')]
      assert.ok(
        semanticGroups.length >= spec.minimumSemanticGroups,
        `${spec.id}: expected at least ${spec.minimumSemanticGroups} labelled semantic shapes`,
      )
      for (const group of semanticGroups) {
        assert.ok(group.getAttribute('data-meaning')?.trim(), `${spec.id}: semantic group needs data-meaning`)
        assert.ok(group.getAttribute('data-shape')?.trim(), `${spec.id}: semantic group needs data-shape`)
        assert.ok(group.querySelector('path, rect, circle, ellipse, polygon, polyline, line'), `${spec.id}: semantic group needs a shape`)
        assert.ok([...group.querySelectorAll('text')].some((label) => compactText(label)), `${spec.id}: semantic group needs a text label`)
      }
    })
  }
})

test('palette, type and line work remain legible at the minimum registered placement', async (t) => {
  for (const spec of assetSpecs) {
    await t.test(spec.id, () => {
      const { source, document } = parseSvg(spec)
      assert.doesNotMatch(source, /<style\b|\bstyle\s*=/iu, `${spec.id}: presentation attributes keep token checks explicit`)
      for (const colour of source.match(/#[0-9a-f]{6}\b/giu) ?? []) {
        assert.ok(paletteColours.has(colour.toUpperCase()), `${spec.id}: colour ${colour} is outside palette.json`)
      }
      for (const element of document.querySelectorAll('*')) {
        for (const attribute of element.attributes) {
          if (!['fill', 'stroke', 'color', 'stop-color', 'flood-color', 'lighting-color'].includes(attribute.localName)) continue
          const value = attribute.value.toUpperCase()
          assert.ok(value === 'NONE' || paletteColours.has(value), `${spec.id}: ${attribute.localName}=${attribute.value} bypasses palette.json`)
        }
      }

      const texts = [...document.querySelectorAll('text')]
      assert.ok(texts.length > 0, `${spec.id}: visible text labels are required`)
      for (const label of texts) {
        const context = `${spec.id}: text “${compactText(label).slice(0, 40)}”`
        assert.ok(compactText(label), `${context} must not be blank`)
        assert.ok(allowedFonts.has(label.getAttribute('font-family')), `${context} must use typography.json font family`)
        const fontSize = numericAttribute(label, 'font-size', context)
        const declaredPoints = numericAttribute(label, 'data-font-size-pt', context)
        const physicalPoints = fontSize * minimumPlacementWidthMm / viewBoxWidth / millimetresPerPoint
        assert.ok(declaredPoints >= minimumFontSizePt, `${context} falls below ${minimumFontSizePt} pt`)
        assert.ok(physicalPoints >= minimumFontSizePt - 0.01, `${context} actual placement falls below ${minimumFontSizePt} pt`)
        assert.ok(Math.abs(declaredPoints - physicalPoints) <= 0.1, `${context} point-size metadata does not match geometry`)
      }

      const stroked = [...document.querySelectorAll('[stroke]')]
        .filter((element) => element.getAttribute('stroke') !== 'none')
      assert.ok(stroked.length > 0, `${spec.id}: stroked vector work is required`)
      for (const element of stroked) {
        const context = `${spec.id}: <${element.localName}>${element.id ? `#${element.id}` : ''}`
        const strokeWidth = numericAttribute(element, 'stroke-width', context)
        const declaredMillimetres = numericAttribute(element, 'data-stroke-width-mm', context)
        const physicalMillimetres = strokeWidth * minimumPlacementWidthMm / viewBoxWidth
        assert.ok(declaredMillimetres >= minimumStrokeWidthMm, `${context} falls below ${minimumStrokeWidthMm} mm`)
        assert.ok(physicalMillimetres >= minimumStrokeWidthMm - 0.001, `${context} actual placement falls below ${minimumStrokeWidthMm} mm`)
        assert.ok(Math.abs(declaredMillimetres - physicalMillimetres) <= 0.01, `${context} stroke metadata does not match geometry`)
      }
    })
  }
})

test('masters are self-contained vectors without raster, active content or external hrefs', async (t) => {
  for (const spec of assetSpecs) {
    await t.test(spec.id, () => {
      const { source, document } = parseSvg(spec)
      assert.equal(document.querySelectorAll('image, foreignObject, script, iframe, object, embed').length, 0)
      assert.doesNotMatch(source, /data:image\//iu, `${spec.id}: embedded raster data is forbidden`)
      assert.doesNotMatch(source, /url\(\s*["']?(?:https?:|\/\/|data:)/iu, `${spec.id}: external CSS resource is forbidden`)

      for (const element of document.querySelectorAll('*')) {
        for (const attribute of element.attributes) {
          assert.doesNotMatch(attribute.localName, /^on/iu, `${spec.id}: event-handler attributes are forbidden`)
          if (attribute.localName !== 'href') continue
          assert.match(attribute.value, /^#[A-Za-z_][\w:.-]*$/u, `${spec.id}: href must be a local SVG fragment`)
          assert.ok(document.getElementById(attribute.value.slice(1)), `${spec.id}: local href target is missing`)
        }
      }
    })
  }
})

test('each plate contains the required Russian editorial terminology and safety boundaries', async (t) => {
  for (const spec of assetSpecs) {
    await t.test(spec.id, () => {
      const { document } = parseSvg(spec)
      const visibleText = visibleSvgText(document)
      for (const term of spec.terms) assert.match(visibleText, term, `${spec.id}: missing required content ${term}`)
      for (const term of spec.forbiddenTerms ?? []) assert.doesNotMatch(visibleText, term, `${spec.id}: forbidden terminology ${term}`)
    })
  }
})

test('assets.json keeps all eight Task 15 vectors in preview behind rights and font stop-gates', () => {
  const planned = assets.filter((asset) => plannedPaths.includes(asset.path))
  assert.deepEqual(planned.map((asset) => asset.path).sort(), plannedPaths)

  const printReadyVectors = planned
    .filter((asset) => asset.status === 'print-ready')
    .map((asset) => asset.path)
    .sort()
  assert.deepEqual(printReadyVectors, [], 'no Task 15 vector may be print-ready before its stop-gate is cleared')

  const plannedPreviewMaps = planned
    .filter((asset) => asset.kind === 'map' && asset.status === 'preview')
    .map((asset) => asset.path)
    .sort()
  assert.deepEqual(plannedPreviewMaps, mapPaths, 'all three maps must remain preview-only')

  const plannedPreviewDiagrams = planned
    .filter((asset) => asset.kind === 'diagram' && asset.status === 'preview')
    .map((asset) => asset.path)
    .sort()
  assert.deepEqual(plannedPreviewDiagrams, diagramPaths, 'all five diagrams must remain preview-only')

  const rightsFiles = new Set()
  for (const spec of assetSpecs) {
    const asset = planned.find((item) => item.id === spec.id)
    assert.ok(asset, `${spec.id}: exact registry record is required`)
    assert.equal(asset.kind, spec.kind)
    assert.equal(asset.status, 'preview')
    assert.equal(asset.rights, spec.kind === 'map' ? 'pending' : 'owned')
    assert.equal(asset.viewBox, commonViewBox)
    assert.equal(asset.pixelWidth, null)
    assert.equal(asset.pixelHeight, null)
    assert.equal(asset.effectiveDpi, null)
    assert.ok(typeof asset.creator === 'string' && asset.creator.trim(), `${spec.id}: creator is required`)
    assert.match(asset.createdAt ?? '', /^\d{4}-\d{2}-\d{2}$/u, `${spec.id}: ISO creation date is required`)
    if (spec.kind === 'map') {
      assert.match(asset.creditLine ?? '', /pending[^.]{0,40}clearance|clearance[^.]{0,40}pending/iu, `${spec.id}: map credit must remain pending`)
    } else {
      assert.ok(typeof asset.creditLine === 'string' && asset.creditLine.includes(asset.creator), `${spec.id}: diagram credit must name creator`)
    }
    assert.match(asset.licenseFile ?? '', /^book\/assets\/rights\/[a-z0-9-]+\.md$/u, `${spec.id}: rights markdown path is required`)
    assert.ok(!rightsFiles.has(asset.licenseFile), `${spec.id}: rights evidence file must be asset-specific`)
    rightsFiles.add(asset.licenseFile)

    const rightsPath = path.join(repoRoot, asset.licenseFile)
    assert.ok(fs.existsSync(rightsPath), `${spec.id}: rights evidence file is missing`)
    assert.ok(fs.statSync(rightsPath).isFile(), `${spec.id}: rights evidence must be a regular file`)
    const rights = fs.readFileSync(rightsPath, 'utf8')
    assert.ok(rights.trim().length >= 80, `${spec.id}: rights evidence is empty`)
    assert.match(rights, new RegExp(spec.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'))
    assert.match(rights, new RegExp(asset.creator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'))
    assert.match(rights, new RegExp(asset.createdAt, 'u'))

    if (spec.kind === 'map') {
      assert.match(rights, /Status:[^\n]*rights clearance pending/iu)
      assert.doesNotMatch(rights, /Status:[^\n]*licensed/iu)
      assert.match(rights, /source terms/iu)
      assert.match(rights, /product\/version|source and version|источник[^.]{0,30}верси/iu)
      assert.match(rights, /derivative reuse/iu)
      assert.match(rights, /commercial print/iu)
      assert.match(rights, /GitHub Pages/iu)
      assert.match(rights, /preview|предварительн/iu)
      assert.match(rights, /STOP[ -]GATE|СТОП[ -]ГЕЙТ/iu)
      assert.match(rights, /审图号/u)
      assert.match(rights, /опорн[^.]{0,20}точ|anchor/iu)
      for (const sourceUrl of asset.cartography.sourceUrls) {
        assert.match(rights, new RegExp(sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'))
      }
    } else {
      assert.match(rights, /owned|собственн/iu)
      assert.match(rights, /Production status:[^\n]*preview/iu)
      assert.match(rights, /STOP[ -]GATE|СТОП[ -]ГЕЙТ/iu)
      assert.match(rights, /licensed[^.]{0,80}fonts/iu)
      assert.match(rights, /reproducibly delivered/iu)
      assert.match(rights, /outlined\/embedded/iu)
      assert.match(rights, /150\s*×\s*187\.5\s*mm proof/iu)
      assert.match(rights, /prepress review/iu)

      if (spec.id === 'diagram-sheng-shou-fork') {
        assert.match(rights, /Chinese glyphs/iu)
        assert.match(rights, /`生`/u)
        assert.match(rights, /`熟`/u)
      }
      if (spec.id === 'diagram-maocha-process') {
        assert.match(rights, /Source basis:\s*DB5308\/T 58—2020/iu)
        assert.doesNotMatch(rights, /DB53\/T 1038/iu)
      }
      if (spec.id === 'diagram-storage-variables') {
        assert.match(rights, /Source basis:\s*DB5308\/T 53—2020/iu)
        assert.doesNotMatch(rights, /DB53\/T 1038/iu)
      }
    }

    const { root } = parseSvg(spec)
    assert.equal(asset.viewBox, root.getAttribute('viewBox'), `${spec.id}: registry and SVG viewBox must match`)
  }
  assert.equal(rightsFiles.size, 8)
})
