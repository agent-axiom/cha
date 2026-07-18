import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildApparatus, generateApparatus } from '../scripts/generate-apparatus.mjs'

const bookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const albumRoot = path.join(bookRoot, 'manuscript', 'album')
const glossaryPath = path.join(albumRoot, '91-glossary.md')
const bibliographyPath = path.join(albumRoot, '92-bibliography.md')
const temporaryRoots = []

const readJson = (relativePath, root = bookRoot) => JSON.parse(
  fs.readFileSync(path.join(root, relativePath), 'utf8'),
)

const writeJson = (filename, value) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`)
}

const sourceRecord = (overrides = {}) => ({
  id: 'source-1',
  author: 'Author',
  title: 'Title',
  year: '2026',
  group: 'guidance',
  status: 'checked',
  publicationClass: 'standard-guidance',
  href: 'https://example.test/source',
  ...overrides,
})

const glossaryRecord = (overrides = {}) => ({
  id: 'term-one',
  chinese: '茶',
  pinyin: 'chá',
  russian: 'чай',
  literalMeaning: 'чай',
  definition: 'Проверочное определение.',
  sourceIds: ['source-1'],
  ...overrides,
})

const createFixtureBook = ({
  sources = [sourceRecord()],
  claims = [{ id: 'claim-1', status: 'verified', sourceIds: ['source-1'] }],
  glossary = [],
} = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'book-apparatus-fixture-'))
  temporaryRoots.push(root)
  writeJson(path.join(root, 'data', 'claims.json'), claims)
  writeJson(path.join(root, 'data', 'sources.json'), sources)
  writeJson(path.join(root, 'data', 'glossary.json'), glossary)
  writeJson(path.join(root, 'flatplan', 'album.json'), {
    pages: [
      { id: 'A-P199', apparatus: 'glossary' },
      { id: 'A-P203', apparatus: 'bibliography' },
    ],
  })
  return root
}

const compareSources = (left, right) => (
  left.author.localeCompare(right.author, 'ru')
  || left.title.localeCompare(right.title, 'ru')
  || left.id.localeCompare(right.id, 'en')
)

const compareGlossary = (left, right) => (
  left.pinyin.localeCompare(right.pinyin, 'en')
  || left.chinese.localeCompare(right.chinese, 'zh')
  || left.id.localeCompare(right.id, 'en')
)

const pageIds = (text) => [...text.matchAll(/^<!-- page:([AG]-P\d{3}) -->$/gm)].map((match) => match[1])
const sourceIds = (text) => [...text.matchAll(/^<!-- source:([a-z0-9-]+) -->$/gm)].map((match) => match[1])
const glossaryIds = (text) => [...text.matchAll(/^<!-- glossary:([a-z0-9-]+) -->$/gm)].map((match) => match[1])

const assertMarkerFirstPages = (text, expectedIds) => {
  assert.ok(text.endsWith('\n'), 'generated Markdown must have a final newline')
  assert.equal(text.startsWith(`<!-- page:${expectedIds[0]} -->\n`), true)
  assert.match(text, /^<!-- page:A-P\d{3} -->\n<!-- generated: book\/scripts\/generate-apparatus\.mjs -->\n/)
  assert.deepEqual(pageIds(text), expectedIds)
  const pageStarts = text.split(/(?=^<!-- page:A-P\d{3} -->$)/m)
  assert.equal(pageStarts.length, expectedIds.length)
  for (const [index, page] of pageStarts.entries()) {
    assert.match(page, new RegExp(`^<!-- page:${expectedIds[index]} -->\\n`))
  }
}

after(() => {
  for (const root of temporaryRoots) fs.rmSync(root, { recursive: true, force: true })
})

test('checked-in apparatus exactly matches pure generation before any workspace write', () => {
  const built = buildApparatus({ root: bookRoot })

  assert.equal(fs.readFileSync(glossaryPath, 'utf8'), built.glossaryText)
  assert.equal(fs.readFileSync(bibliographyPath, 'utf8'), built.bibliographyText)
})

test('generates the exact marker-first glossary and bibliography page ranges', () => {
  const glossaryText = fs.readFileSync(glossaryPath, 'utf8')
  const bibliographyText = fs.readFileSync(bibliographyPath, 'utf8')

  assertMarkerFirstPages(glossaryText, ['A-P199', 'A-P200', 'A-P201', 'A-P202'])
  assertMarkerFirstPages(bibliographyText, ['A-P203', 'A-P204', 'A-P205', 'A-P206', 'A-P207'])
})

test('cites the deduplicated non-rejected claim union in fixed groups and stable order', () => {
  const sources = readJson('data/sources.json')
  const claims = readJson('data/claims.json')
  const bibliographyText = fs.readFileSync(bibliographyPath, 'utf8')
  const citedIds = new Set(
    claims.filter(({ status }) => status !== 'rejected').flatMap(({ sourceIds: ids = [] }) => ids),
  )
  const cited = sources.filter(({ id, publicationClass }) => citedIds.has(id) && publicationClass !== 'provenance-only')
  const groups = [
    ['Китайские исторические тексты, издания и копии', 8, (source) => source.group === 'primary-asian' && !['retrospective', 'trial-registration'].includes(source.publicationClass)],
    ['Институциональные ретроспективы', 4, (source) => source.publicationClass === 'retrospective'],
    ['Азиатские исследования', 19, (source) => source.group === 'research-asian' && !['retrospective', 'trial-registration'].includes(source.publicationClass)],
    ['Западные исследования', 5, (source) => source.group === 'research-western' && !['retrospective', 'trial-registration'].includes(source.publicationClass)],
    ['Реестры исследований', 1, (source) => source.publicationClass === 'trial-registration'],
    ['Стандарты и рекомендации', 11, (source) => source.group === 'guidance' && !['retrospective', 'trial-registration'].includes(source.publicationClass)],
  ]
  const expectedIds = groups.flatMap(([, , matches]) => cited.filter(matches).sort(compareSources).map(({ id }) => id))

  assert.equal(cited.length, 48)
  assert.equal(citedIds.has('xu-2022'), true)
  assert.deepEqual(sourceIds(bibliographyText), expectedIds)
  assert.equal(new Set(sourceIds(bibliographyText)).size, 48)
  assert.equal(sourceIds(bibliographyText).includes('vinogrodsky-user-excerpt'), false)
  for (const [title, count, matches] of groups) {
    assert.equal(cited.filter(matches).length, count)
    assert.equal((bibliographyText.match(new RegExp(`^## ${title}$`, 'gm')) ?? []).length, 1)
  }
  const headingOffsets = groups.map(([title]) => bibliographyText.indexOf(`## ${title}`))
  assert.deepEqual([...headingOffsets].sort((a, b) => a - b), headingOffsets)
})

test('prints stable source keys and keeps trial registration out of guidance', () => {
  const bibliographyText = fs.readFileSync(bibliographyPath, 'utf8')
  assert.match(bibliographyText, /\*\*Ключ источника:\*\* `zhao-facsimile-pku`/u)
  assert.match(bibliographyText, /^## Реестры исследований$/mu)
  assert.match(bibliographyText, /`nct06401161`\. \*\*Класс:\*\* Регистрация исследования; результатов нет/u)
  const registrySection = bibliographyText.split('## Реестры исследований')[1].split('## Стандарты и рекомендации')[0]
  assert.match(registrySection, /nct06401161/u)
  const guidanceSection = bibliographyText.split('## Стандарты и рекомендации')[1]
  assert.doesNotMatch(guidanceSection, /nct06401161/u)
})

test('normalizes author punctuation and formats page, article, e-locator, facsimile, and journal locators', () => {
  const bibliographyText = fs.readFileSync(bibliographyPath, 'utf8')

  assert.doesNotMatch(bibliographyText, /\bet al\.\./u)
  assert.ok(bibliographyText.includes('Sunan Wang, Yi Qiu, Ren-You Gan, Fan Zhu. *Chemical constituents and biological properties of Pu-erh tea*.'))
  assert.doesNotMatch(bibliographyText, /С\. (?:article|листы|e\d|EFSA Journal|не предоставлены)/iu)
  assert.ok(bibliographyText.includes('С. 21–31, 200.'))
  assert.ok(bibliographyText.includes('Статья 166.'))
  assert.ok(bibliographyText.includes('Электронный локатор e0157847.'))
  assert.ok(bibliographyText.includes('Листы скана 121–123.'))
  assert.ok(bibliographyText.includes('EFSA Journal 13(5):4102, 1–120.'))
})

test('renders canonical DOI and source href values only as validator-safe Markdown links', () => {
  const sources = readJson('data/sources.json')
  const bibliographyText = fs.readFileSync(bibliographyPath, 'utf8')
  const withoutMarkdownDestinations = bibliographyText.replace(/\]\((?:\\.|[^)\r\n])*\)/g, ']()')

  assert.doesNotMatch(withoutMarkdownDestinations, /https?:\/\/|www\./iu)
  for (const source of sources.filter(({ id }) => sourceIds(bibliographyText).includes(id))) {
    const emittedHref = source.href
    assert.ok(bibliographyText.includes(`[Источник](${emittedHref})`) || bibliographyText.includes(`[DOI](${emittedHref})`), source.id)
    if (source.doi) {
      const normalizedDoi = source.doi.replace(/^https?:\/\/doi\.org\//iu, '')
      assert.ok(bibliographyText.includes(`[DOI](https://doi.org/${normalizedDoi})`), source.id)
    }
  }
})

test('rebases local data hrefs for the album and every emitted local target is a regular file', () => {
  const bibliographyText = fs.readFileSync(bibliographyPath, 'utf8')
  const destinations = [...bibliographyText.matchAll(/\[[^\]]+\]\(([^)\r\n]+)\)/g)].map((match) => match[1])
  const localDestinations = destinations.filter((destination) => !/^https?:\/\//iu.test(destination))

  assert.deepEqual(localDestinations, [])
  for (const destination of localDestinations) {
    const pathname = decodeURIComponent(destination.split(/[?#]/u, 1)[0])
    const resolved = path.resolve(albumRoot, pathname)
    assert.equal(fs.statSync(resolved).isFile(), true, destination)
  }
})

test('accepts HTTP(S) and safe repository-relative source hrefs', () => {
  const root = createFixtureBook({
    sources: [
      sourceRecord({ href: '../research/local.md#record' }),
      sourceRecord({ id: 'source-2', href: 'http://example.test/source-2' }),
    ],
    claims: [{ id: 'claim-1', status: 'verified', sourceIds: ['source-1', 'source-2'] }],
  })
  fs.mkdirSync(path.join(root, 'research'), { recursive: true })
  fs.writeFileSync(path.join(root, 'research', 'local.md'), 'source\n')

  const { bibliographyText } = buildApparatus({ root })

  assert.ok(bibliographyText.includes('[Источник](../../research/local.md#record)'))
  assert.ok(bibliographyText.includes('[Источник](http://example.test/source-2)'))
})

test('percent-encodes intentional spaces and parentheses in a safe local destination', () => {
  const root = createFixtureBook({
    sources: [sourceRecord({ href: '../research/local file(1).md#section (one)' })],
  })
  fs.mkdirSync(path.join(root, 'research'), { recursive: true })
  fs.writeFileSync(path.join(root, 'research', 'local file(1).md'), 'source\n')

  const { bibliographyText } = buildApparatus({ root })

  assert.ok(bibliographyText.includes(
    '[Источник](../../research/local%20file%281%29.md#section%20%28one%29)',
  ))
})

test('rejects Markdown-forbidden characters in query or fragment of an existing safe local file', () => {
  const hostileSuffixes = [
    '#bad<fragment',
    '#bad>fragment',
    '?q="quoted"',
    '#bad{brace}',
    '#bad|pipe',
    '#bad^caret',
    '#bad`tick',
  ]

  for (const suffix of hostileSuffixes) {
    const root = createFixtureBook({
      sources: [sourceRecord({ href: `../research/local.md${suffix}` })],
    })
    fs.mkdirSync(path.join(root, 'research'), { recursive: true })
    fs.writeFileSync(path.join(root, 'research', 'local.md'), 'source\n')
    assert.throws(() => buildApparatus({ root }), /unsafe Markdown destination/u, suffix)
  }
})

test('canonicalizes a safe bare or doi.org DOI to one HTTPS DOI link', () => {
  for (const doi of ['10.1234/Safe-DOI', 'https://doi.org/10.1234/Safe-DOI']) {
    const root = createFixtureBook({ sources: [sourceRecord({ doi })] })
    const { bibliographyText } = buildApparatus({ root })
    assert.equal(
      (bibliographyText.match(/\[DOI\]\(https:\/\/doi\.org\/10\.1234\/Safe-DOI\)/g) ?? []).length,
      1,
      doi,
    )
  }
})

test('rejects DOI controls, whitespace, comments, foreign hosts, and Markdown-unsafe characters', () => {
  const hostileDois = [
    '10.1234/good\n[bad](https://evil.test)',
    '10.1234/has space',
    ' 10.1234/leading-space',
    '10.1234/comment<!--injection-->',
    '10.1234/back\\slash',
    '10.1234/angle<bracket',
    '10.1234/double"quote',
    '10.1234/{brace}',
    '10.1234/pipe|value',
    '10.1234/caret^value',
    '10.1234/back`tick',
    'http://doi.org/10.1234/insecure',
    'https://evil.test/10.1234/foreign-host',
  ]

  for (const doi of hostileDois) {
    const root = createFixtureBook({ sources: [sourceRecord({ doi })] })
    assert.throws(() => buildApparatus({ root }), /unsafe DOI|unsupported DOI/u, doi)
  }
})

test('rejects parsed external hrefs containing Markdown-unsafe characters before output', () => {
  const hostileExternalHrefs = [
    'https://example.test/back\\slash',
    'https://example.test/has space',
    'https://example.test/angle<bracket',
    'https://example.test/angle>bracket',
    'https://example.test/double"quote',
    'https://example.test/{brace}',
    'https://example.test/pipe|value',
    'https://example.test/caret^value',
    'https://example.test/back`tick',
  ]

  for (const href of hostileExternalHrefs) {
    const root = createFixtureBook({ sources: [sourceRecord({ href })] })
    assert.throws(() => buildApparatus({ root }), /unsafe external source href/u, href)
  }
})

test('rejects unsafe source href schemes, paths, controls, and root escape', () => {
  const hostileHrefs = [
    'javascript:alert(1)',
    'data:text/plain,unsafe',
    'file:///etc/passwd',
    'ftp://example.test/file',
    '/etc/passwd',
    '//example.test/network-path',
    'C:\\Windows\\system.ini',
    '../../../etc/passwd',
    'https://example.test/good\nInjected: bad',
    'https://example.test/trailing-newline\n',
    '\thttps://example.test/leading-tab',
  ]

  for (const href of hostileHrefs) {
    const root = createFixtureBook({ sources: [sourceRecord({ href })] })
    assert.throws(
      () => buildApparatus({ root }),
      /unsafe (?:external )?source href|unsupported (?:external )?source href|escapes book root/u,
      href,
    )
  }
})

test('renders every glossary record once in pinyin, Chinese, and id order with meaning and sources', () => {
  const glossary = readJson('data/glossary.json')
  const glossaryText = fs.readFileSync(glossaryPath, 'utf8')
  const ordered = [...glossary].sort(compareGlossary)

  assert.equal(glossary.length, 45)
  assert.deepEqual(glossaryIds(glossaryText), ordered.map(({ id }) => id))
  assert.equal(new Set(glossaryIds(glossaryText)).size, 45)
  for (const [index, item] of ordered.entries()) {
    const start = glossaryText.indexOf(`<!-- glossary:${item.id} -->`)
    const next = ordered[index + 1]
    const end = next ? glossaryText.indexOf(`<!-- glossary:${next.id} -->`) : glossaryText.length
    const rendered = glossaryText.slice(start, end)
    assert.match(rendered, new RegExp(`^<!-- glossary:${item.id} -->$`, 'm'))
    assert.ok(rendered.includes(`Буквально: ${item.literalMeaning}`), item.id)
    assert.ok(rendered.includes(item.definition), item.id)
    assert.ok(rendered.includes(`<!-- source:${item.sourceIds.join(',')} -->`), item.id)
  }
})

test('rejects a glossary id that is not a unique lowercase slug', () => {
  const invalidRoot = createFixtureBook({ glossary: [glossaryRecord({ id: 'Bad ID' })] })
  assert.throws(() => buildApparatus({ root: invalidRoot }), /glossary id is not a slug: Bad ID/)

  const duplicateRoot = createFixtureBook({ glossary: [glossaryRecord(), glossaryRecord()] })
  assert.throws(() => buildApparatus({ root: duplicateRoot }), /duplicate glossary id: term-one/)
})

test('rejects duplicate and unknown glossary source references', () => {
  const duplicateRoot = createFixtureBook({
    glossary: [glossaryRecord({ sourceIds: ['source-1', 'source-1'] })],
  })
  assert.throws(
    () => buildApparatus({ root: duplicateRoot }),
    /duplicate glossary source id: term-one\/source-1/,
  )

  const missingRoot = createFixtureBook({
    glossary: [glossaryRecord({ sourceIds: ['missing-source'] })],
  })
  assert.throws(
    () => buildApparatus({ root: missingRoot }),
    /unknown glossary source: term-one\/missing-source/,
  )
})

test('rejects unchecked glossary sources and checked sources absent from the bibliography union', () => {
  const uncheckedRoot = createFixtureBook({
    sources: [sourceRecord(), sourceRecord({ id: 'source-2', status: 'draft' })],
    glossary: [glossaryRecord({ sourceIds: ['source-2'] })],
  })
  assert.throws(
    () => buildApparatus({ root: uncheckedRoot }),
    /glossary source is not checked: term-one\/source-2/,
  )

  const uncitedRoot = createFixtureBook({
    sources: [sourceRecord(), sourceRecord({ id: 'source-2' })],
    glossary: [glossaryRecord({ sourceIds: ['source-2'] })],
  })
  assert.throws(
    () => buildApparatus({ root: uncitedRoot }),
    /glossary source is not in bibliography: term-one\/source-2/,
  )
})

test('refuses unchecked cited sources before writing output', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'book-apparatus-'))
  temporaryRoots.push(root)
  writeJson(path.join(root, 'data', 'claims.json'), [
    { id: 'claim-1', status: 'verified', sourceIds: ['source-1'] },
  ])
  writeJson(path.join(root, 'data', 'sources.json'), [
    {
      id: 'source-1',
      author: 'Author',
      title: 'Title',
      year: '2026',
      group: 'guidance',
      status: 'draft',
      href: 'https://example.test/source',
    },
  ])
  writeJson(path.join(root, 'data', 'glossary.json'), [])
  writeJson(path.join(root, 'flatplan', 'album.json'), {
    pages: [
      { id: 'A-P199', apparatus: 'glossary' },
      { id: 'A-P203', apparatus: 'bibliography' },
    ],
  })

  assert.throws(
    () => generateApparatus({ root }),
    /cited source is not checked: source-1/,
  )
  assert.equal(fs.existsSync(path.join(root, 'manuscript', 'album', '91-glossary.md')), false)
  assert.equal(fs.existsSync(path.join(root, 'manuscript', 'album', '92-bibliography.md')), false)
})

test('rolls back both apparatus files and cleans staging after a second promotion failure', () => {
  const root = createFixtureBook()
  const album = path.join(root, 'manuscript', 'album')
  const glossary = path.join(album, '91-glossary.md')
  const bibliography = path.join(album, '92-bibliography.md')
  fs.mkdirSync(album, { recursive: true })
  fs.writeFileSync(glossary, 'previous glossary\n')
  fs.writeFileSync(bibliography, 'previous bibliography\n')

  assert.throws(
    () => generateApparatus({
      root,
      hooks: {
        beforePromoteBibliography: () => { throw new Error('injected second promotion failure') },
      },
    }),
    /injected second promotion failure/,
  )
  assert.equal(fs.readFileSync(glossary, 'utf8'), 'previous glossary\n')
  assert.equal(fs.readFileSync(bibliography, 'utf8'), 'previous bibliography\n')
  assert.deepEqual(fs.readdirSync(album).filter((name) => name.startsWith('.apparatus-')), [])
})

test('writes idempotently in isolation and completes all 256 checked-in manuscript pages', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'book-apparatus-idempotence-'))
  temporaryRoots.push(root)
  for (const relativePath of ['data/claims.json', 'data/sources.json', 'data/glossary.json', 'flatplan/album.json']) {
    writeJson(path.join(root, relativePath), readJson(relativePath))
  }
  fs.mkdirSync(path.join(root, 'research'), { recursive: true })
  fs.copyFileSync(path.join(bookRoot, 'research', 'history.md'), path.join(root, 'research', 'history.md'))
  generateApparatus({ root })
  const generatedGlossary = fs.readFileSync(path.join(root, 'manuscript', 'album', '91-glossary.md'))
  const generatedBibliography = fs.readFileSync(path.join(root, 'manuscript', 'album', '92-bibliography.md'))

  generateApparatus({ root })

  assert.deepEqual(fs.readFileSync(path.join(root, 'manuscript', 'album', '91-glossary.md')), generatedGlossary)
  assert.deepEqual(fs.readFileSync(path.join(root, 'manuscript', 'album', '92-bibliography.md')), generatedBibliography)
  const markdownFiles = fs.readdirSync(path.join(bookRoot, 'manuscript', 'album')).map((name) => path.join(bookRoot, 'manuscript', 'album', name))
    .concat(fs.readdirSync(path.join(bookRoot, 'manuscript', 'guide')).map((name) => path.join(bookRoot, 'manuscript', 'guide', name)))
  const allMarkers = markdownFiles.flatMap((filename) => pageIds(fs.readFileSync(filename, 'utf8')))
  assert.equal(allMarkers.length, 256)
  assert.equal(new Set(allMarkers).size, 256)
  assert.equal(readJson('config/publication.json').manuscriptComplete, true)
})
