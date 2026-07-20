import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertSourceClassification, loadSourceTaxonomy } from './source-taxonomy.mjs'

const defaultBookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const generatedHeader = '<!-- generated: book/scripts/generate-apparatus.mjs -->'
const sourceGroups = new Set(['primary-asian', 'research-asian', 'research-western', 'guidance'])
const historicalDocumentClasses = new Set([
  'historical-access-copy',
  'critical-edition',
  'facsimile',
  'catalog-record',
  'manuscript-catalog',
])
const historicalEvidenceRoles = new Set([
  'primary-text',
  'textual-witness',
  'catalog-provenance',
  'disputed-retrospective-attribution',
])
const retrospectiveDocumentClasses = new Set(['institutional-record', 'corporate-record', 'standard'])
const retrospectiveEvidenceRoles = new Set(['institutional-retrospective', 'corporate-retrospective'])
const guidanceDocumentClasses = new Set(['standard', 'guidance', 'institutional-heritage-record'])
const guidanceEvidenceRoles = new Set(['normative-standard', 'safety-guidance', 'contextual-institutional-record'])
const groupDefinitions = [
  {
    id: 'primary-asian',
    title: 'Китайские исторические тексты, издания и копии',
    matches: (source) => (
      source.group === 'primary-asian'
      && historicalDocumentClasses.has(source.documentClass)
      && historicalEvidenceRoles.has(source.evidenceRole)
    ),
  },
  {
    id: 'institutional-retrospectives',
    title: 'Институциональные ретроспективы',
    matches: (source) => (
      retrospectiveDocumentClasses.has(source.documentClass)
      && retrospectiveEvidenceRoles.has(source.evidenceRole)
    ),
  },
  {
    id: 'research-asian',
    title: 'Азиатские исследования',
    matches: (source) => (
      source.group === 'research-asian'
      && source.documentClass === 'research-publication'
      && source.evidenceRole === 'research-evidence'
    ),
  },
  {
    id: 'research-western',
    title: 'Западные исследования',
    matches: (source) => (
      source.group === 'research-western'
      && source.documentClass === 'research-publication'
      && source.evidenceRole === 'research-evidence'
    ),
  },
  {
    id: 'trial-registrations',
    title: 'Реестры исследований',
    matches: (source) => (
      source.documentClass === 'trial-registration'
      && source.evidenceRole === 'trial-registry-record'
    ),
  },
  {
    id: 'guidance',
    title: 'Стандарты и рекомендации',
    matches: (source) => (
      source.group === 'guidance'
      && guidanceDocumentClasses.has(source.documentClass)
      && guidanceEvidenceRoles.has(source.evidenceRole)
    ),
  },
]
const clean = (value = '') => String(value ?? '').trim()
const readJson = (root, relativePath) => JSON.parse(
  fs.readFileSync(path.join(root, relativePath), 'utf8'),
)

const compareSources = (left, right) => (
  clean(left.author).localeCompare(clean(right.author), 'ru')
  || clean(left.title).localeCompare(clean(right.title), 'ru')
  || clean(left.id).localeCompare(clean(right.id), 'en')
)

const compareGlossary = (left, right) => (
  clean(left.pinyin).localeCompare(clean(right.pinyin), 'en')
  || clean(left.chinese).localeCompare(clean(right.chinese), 'zh')
  || clean(left.id).localeCompare(clean(right.id), 'en')
)

const unsafeExternalCharacter = /[\s<>"{}|\\^`]/u

const markdownDestination = (value) => {
  const raw = String(value ?? '')
  const encoded = raw
    .replaceAll('(', '%28')
    .replaceAll(')', '%29')
    .replaceAll(' ', '%20')
  if (!encoded || unsafeExternalCharacter.test(encoded)) {
    throw new Error(`unsafe Markdown destination: ${JSON.stringify(raw)}`)
  }
  return encoded
}

const validateExternalUrl = (value, label) => {
  const raw = String(value ?? '')
  if (!raw || unsafeExternalCharacter.test(raw)) throw new Error(`unsafe ${label}: ${JSON.stringify(raw)}`)
  if (!/^https?:\/\//iu.test(raw)) throw new Error(`unsupported ${label}: ${raw}`)
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(`unsupported ${label}: ${raw}`)
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error(`unsupported ${label}: ${raw}`)
  }
  const normalized = parsed.href
  if (unsafeExternalCharacter.test(normalized)) throw new Error(`unsafe ${label}: ${JSON.stringify(normalized)}`)
  return normalized
}

const canonicalDoi = (value) => {
  const raw = String(value ?? '')
  if (!raw) return ''
  if (unsafeExternalCharacter.test(raw)) throw new Error(`unsafe DOI: ${JSON.stringify(raw)}`)

  let suffix = raw
  if (/^[a-z][a-z0-9+.-]*:/iu.test(raw)) {
    const normalized = validateExternalUrl(raw, 'DOI')
    const parsed = new URL(normalized)
    if (
      parsed.protocol !== 'https:'
      || parsed.hostname.toLowerCase() !== 'doi.org'
      || parsed.username
      || parsed.password
      || parsed.port
      || parsed.search
      || parsed.hash
    ) {
      throw new Error(`unsupported DOI: ${raw}`)
    }
    suffix = parsed.pathname.slice(1)
  }
  if (!/^10\.\d{4,9}\/.+$/iu.test(suffix) || /[?#]/u.test(suffix)) {
    throw new Error(`unsupported DOI: ${raw}`)
  }
  const canonical = validateExternalUrl(`https://doi.org/${suffix}`, 'DOI')
  const parsedCanonical = new URL(canonical)
  if (parsedCanonical.origin !== 'https://doi.org' || parsedCanonical.search || parsedCanonical.hash) {
    throw new Error(`unsupported DOI: ${raw}`)
  }
  return canonical
}

const withinRoot = (root, target) => {
  const relative = path.relative(root, target)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

const resolveSourceHref = (root, value) => {
  const rawHref = String(value ?? '')
  if (!rawHref || /[\u0000-\u001f\u007f]/u.test(rawHref)) throw new Error(`unsafe source href: ${JSON.stringify(rawHref)}`)
  const href = rawHref.trim()
  if (/^[a-z][a-z0-9+.-]*:/iu.test(href)) return validateExternalUrl(rawHref, 'external source href')
  if (path.isAbsolute(href) || /^[/\\]{2}/u.test(href) || /^[a-z]:[/\\]/iu.test(href) || href.includes('\\')) {
    throw new Error(`unsafe source href: ${href}`)
  }

  const suffixStart = href.search(/[?#]/u)
  const pathname = suffixStart === -1 ? href : href.slice(0, suffixStart)
  const suffix = suffixStart === -1 ? '' : href.slice(suffixStart)
  const target = path.resolve(root, 'data', pathname)
  if (!withinRoot(root, target)) throw new Error(`source href escapes book root: ${href}`)
  let realTarget
  try {
    const stat = fs.statSync(target)
    if (!stat.isFile()) throw new Error('not a regular file')
    realTarget = fs.realpathSync(target)
  } catch {
    throw new Error(`unsafe source href target: ${href}`)
  }
  if (!withinRoot(fs.realpathSync(root), realTarget)) throw new Error(`source href escapes book root: ${href}`)
  const rebased = path.relative(path.join(root, 'manuscript', 'album'), target).split(path.sep).join('/')
  return `${rebased}${suffix}`
}

const distribute = (items, pages) => {
  if (!pages.length) throw new Error('flatplan has no apparatus pages')
  return pages.map((page, index) => ({
    page,
    items: items.slice(
      Math.floor(index * items.length / pages.length),
      Math.floor((index + 1) * items.length / pages.length),
    ),
  }))
}

const renderPages = (title, items, pages) => `${distribute(items, pages)
  .map(({ page, items: pageItems }, index) => {
    const marker = [
      `<!-- page:${page.id} -->`,
      ...(index === 0 ? [generatedHeader] : []),
    ].join('\n')
    return [marker, `# ${title}`, ...pageItems].filter(Boolean).join('\n\n')
  })
  .join('\n\n')
  .trimEnd()}\n`

const sourceLinks = (root, source) => {
  const links = []
  const doi = canonicalDoi(source.doi)
  const href = resolveSourceHref(root, source.href)
  if (doi) links.push(`[DOI](${markdownDestination(doi)})`)
  if (href && href !== doi) links.push(`[Источник](${markdownDestination(href)})`)
  return links.join(' · ')
}

const sentence = (value) => {
  const text = clean(value)
  if (!text) return ''
  return /[.!?…]$/u.test(text) ? text : `${text}.`
}

const italicTitle = (value) => {
  const title = clean(value)
  return `*${title}*${/[.!?…]$/u.test(title) ? '' : '.'}`
}

const formatLocator = (value) => {
  const locator = clean(value)
  if (!locator) return ''
  if (/^\d+(?:[-–—]\d+)?(?:,\s*\d+(?:[-–—]\d+)?)*$/u.test(locator)) return `С. ${locator}.`
  const article = locator.match(/^article\s+(.+)$/iu)
  if (article) return `Статья ${article[1]}.`
  if (/^e[\p{L}\p{N}._-]+$/iu.test(locator)) return `Электронный локатор ${locator}.`
  if (/^листы\s+скана(?!\p{L})/iu.test(locator)) return sentence(`${locator[0].toUpperCase()}${locator.slice(1)}`)
  if (/^не\s+предоставлен(?:ы|о)?$/iu.test(locator)) return sentence(`Страницы ${locator}`)
  if (/^EFSA Journal\b/u.test(locator)) return sentence(locator)
  return sentence(`Локатор: ${locator}`)
}

const renderSource = (root, source, groupTitle, startsGroup, taxonomy) => {
  const links = sourceLinks(root, source)
  const citation = [
    sentence(source.author),
    italicTitle(source.title),
    sentence(source.year),
    sentence(source.edition),
    formatLocator(source.pages),
    links,
  ].filter(Boolean).join(' ')
  const classifiedCitation = `**Ключ источника:** \`${clean(source.id)}\`. **Вид документа:** ${taxonomy.documentClassLabels.get(source.documentClass)}. **Роль в книге:** ${taxonomy.evidenceRoleLabels.get(source.evidenceRole)}. ${citation}`
  return [
    ...(startsGroup ? [`## ${groupTitle}`] : []),
    `<!-- source:${clean(source.id)} -->`,
    classifiedCitation,
  ].join('\n\n')
}

const renderGlossaryItem = (item) => [
  `<!-- glossary:${clean(item.id)} -->`,
  `## ${clean(item.russian)} · ${clean(item.chinese)} · ${clean(item.pinyin)}`,
  `Буквально: ${clean(item.literalMeaning)}`,
  clean(item.definition),
  `<!-- source:${(item.sourceIds ?? []).map(clean).join(',')} -->`,
].join('\n\n')

const selectCitedSources = (claims, sources) => {
  const citedIds = new Set(
    claims.filter(({ status }) => status !== 'rejected').flatMap(({ sourceIds = [] }) => sourceIds),
  )
  const sourceById = new Map()
  for (const source of sources) {
    if (sourceById.has(source.id)) throw new Error(`duplicate source id: ${source.id}`)
    sourceById.set(source.id, source)
  }
  for (const id of citedIds) {
    if (!sourceById.has(id)) throw new Error(`cited source does not exist: ${id}`)
  }
  const cited = [...citedIds].map((id) => sourceById.get(id))
  for (const source of cited) {
    if (source.status !== 'checked') throw new Error(`cited source is not checked: ${source.id}`)
  }
  return cited.filter(({ evidenceRole }) => evidenceRole !== 'provenance-only')
}

const validateGlossary = (glossary, sources, cited) => {
  const sourceById = new Map(sources.map((source) => [source.id, source]))
  const citedIds = new Set(cited.map(({ id }) => id))
  const glossaryIds = new Set()

  for (const item of glossary) {
    if (typeof item.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(item.id)) {
      throw new Error(`glossary id is not a slug: ${item.id}`)
    }
    if (glossaryIds.has(item.id)) throw new Error(`duplicate glossary id: ${item.id}`)
    glossaryIds.add(item.id)
    if (!Array.isArray(item.sourceIds) || item.sourceIds.length === 0) {
      throw new Error(`glossary item has no sources: ${item.id}`)
    }
    const itemSourceIds = new Set()
    for (const sourceId of item.sourceIds) {
      if (itemSourceIds.has(sourceId)) throw new Error(`duplicate glossary source id: ${item.id}/${sourceId}`)
      itemSourceIds.add(sourceId)
      const source = sourceById.get(sourceId)
      if (!source) throw new Error(`unknown glossary source: ${item.id}/${sourceId}`)
      if (source.status !== 'checked') throw new Error(`glossary source is not checked: ${item.id}/${sourceId}`)
      if (!citedIds.has(sourceId)) throw new Error(`glossary source is not in bibliography: ${item.id}/${sourceId}`)
    }
  }
}

export const buildApparatus = ({ root = defaultBookRoot } = {}) => {
  const claims = readJson(root, 'data/claims.json')
  const sources = readJson(root, 'data/sources.json')
  const sourceTaxonomy = loadSourceTaxonomy(root)
  const glossary = readJson(root, 'data/glossary.json')
  const flatplan = readJson(root, 'flatplan/album.json')
  for (const source of sources) assertSourceClassification(source, sourceTaxonomy)
  const cited = selectCitedSources(claims, sources)
  validateGlossary(glossary, sources, cited)
  const invalidSource = cited.find(({ group }) => !sourceGroups.has(group))
  if (invalidSource) throw new Error(`cited source has unsupported group: ${invalidSource.id}`)
  const bibliographyItems = groupDefinitions.flatMap(({ title, matches }) => (
    cited
      .filter(matches)
      .sort(compareSources)
      .map((source, index) => renderSource(root, source, title, index === 0, sourceTaxonomy))
  ))
  const groupedIds = bibliographyItems.flatMap((item) => [...item.matchAll(/<!-- source:([^ ]+) -->/gu)].map(([, id]) => id))
  if (groupedIds.length !== cited.length || new Set(groupedIds).size !== cited.length) {
    throw new Error('every cited publication source must match exactly one bibliography group')
  }
  const glossaryItems = [...glossary].sort(compareGlossary).map(renderGlossaryItem)
  const apparatusPages = (kind) => flatplan.pages.filter((page) => page.apparatus === kind)
  const glossaryText = renderPages('Словарь', glossaryItems, apparatusPages('glossary'))
  const bibliographyText = renderPages('Библиография', bibliographyItems, apparatusPages('bibliography'))
  return {
    glossaryCount: glossary.length,
    sourceCount: cited.length,
    glossaryText,
    bibliographyText,
  }
}

const snapshotFile = (filename) => {
  if (!fs.existsSync(filename)) return { exists: false, contents: null, mode: 0o644 }
  const stat = fs.statSync(filename)
  if (!stat.isFile()) throw new Error(`apparatus target is not a regular file: ${filename}`)
  return { exists: true, contents: fs.readFileSync(filename), mode: stat.mode }
}

const restoreFile = (filename, snapshot, stagingRoot) => {
  if (!snapshot.exists) {
    fs.rmSync(filename, { force: true })
    return
  }
  const rollback = path.join(stagingRoot, `.rollback-${path.basename(filename)}`)
  fs.writeFileSync(rollback, snapshot.contents, { mode: snapshot.mode })
  fs.renameSync(rollback, filename)
}

const writeApparatusPair = ({ albumRoot, glossaryText, bibliographyText, hooks }) => {
  fs.mkdirSync(albumRoot, { recursive: true })
  const glossaryTarget = path.join(albumRoot, '91-glossary.md')
  const bibliographyTarget = path.join(albumRoot, '92-bibliography.md')
  const previousGlossary = snapshotFile(glossaryTarget)
  const previousBibliography = snapshotFile(bibliographyTarget)
  const stagingRoot = fs.mkdtempSync(path.join(albumRoot, '.apparatus-'))
  const stagedGlossary = path.join(stagingRoot, '91-glossary.md')
  const stagedBibliography = path.join(stagingRoot, '92-bibliography.md')
  let glossaryPromoted = false
  let bibliographyPromoted = false

  try {
    fs.writeFileSync(stagedGlossary, glossaryText)
    fs.writeFileSync(stagedBibliography, bibliographyText)
    fs.renameSync(stagedGlossary, glossaryTarget)
    glossaryPromoted = true
    hooks.beforePromoteBibliography?.()
    fs.renameSync(stagedBibliography, bibliographyTarget)
    bibliographyPromoted = true
  } catch (error) {
    const rollbackErrors = []
    if (glossaryPromoted) {
      try { restoreFile(glossaryTarget, previousGlossary, stagingRoot) } catch (rollbackError) { rollbackErrors.push(rollbackError) }
    }
    if (bibliographyPromoted) {
      try { restoreFile(bibliographyTarget, previousBibliography, stagingRoot) } catch (rollbackError) { rollbackErrors.push(rollbackError) }
    }
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], 'apparatus write and rollback failed')
    throw error
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true })
  }
}

export const generateApparatus = ({ root = defaultBookRoot, hooks = {} } = {}) => {
  const result = buildApparatus({ root })
  const albumRoot = path.join(root, 'manuscript', 'album')

  writeApparatusPair({
    albumRoot,
    glossaryText: result.glossaryText,
    bibliographyText: result.bibliographyText,
    hooks,
  })

  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generateApparatus()
  console.log(`apparatus generated: ${result.glossaryCount} terms, ${result.sourceCount} sources`)
}
