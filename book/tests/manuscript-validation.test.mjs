import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  discoverMarkdownFiles,
  validateManuscript,
  validateText,
} from '../scripts/validate-manuscript.mjs'

const bookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(bookRoot, '..')
const validatorPath = path.join(bookRoot, 'scripts', 'validate-manuscript.mjs')
const temporaryRoots = []

after(() => {
  for (const root of temporaryRoots) fs.rmSync(root, { recursive: true, force: true })
})

const writeJson = (filename, value) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`)
}

const createBook = ({ complete = false, albumPages = ['A-P001'], guidePages = ['G-P001'] } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'book-manuscript-'))
  temporaryRoots.push(root)
  writeJson(path.join(root, 'data', 'claims.json'), [
    { id: 'hist-known' },
    { id: 'science-known' },
  ])
  writeJson(path.join(root, 'flatplan', 'album.json'), { pages: albumPages.map((id) => ({ id })) })
  writeJson(path.join(root, 'flatplan', 'guide.json'), { pages: guidePages.map((id) => ({ id })) })
  writeJson(path.join(root, 'config', 'publication.json'), { manuscriptComplete: complete })
  return root
}

const writeManuscript = (root, relativePath, text) => {
  const filename = path.join(root, 'manuscript', relativePath)
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  fs.writeFileSync(filename, text)
  return filename
}

const textOptions = (overrides = {}) => ({
  file: 'album/01-opening.md',
  knownClaimIds: new Set(['hist-known', 'science-known']),
  expectedPageIds: new Set(['A-P001', 'A-P002', 'G-P001']),
  ...overrides,
})

const messages = (result) => result.errors.map(({ message }) => message)

test('accepts exact claim and album or guide page markers', () => {
  const result = validateText([
    '<!-- claim:hist-known -->',
    'The documented event happened in 1999.',
    '',
    '<!-- page:A-P001 -->',
    '<!-- page:G-P001 -->',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.claimMarkers.map(({ id, line }) => [id, line]), [['hist-known', 1]])
  assert.deepEqual(result.pageMarkers.map(({ id, line }) => [id, line]), [
    ['A-P001', 4],
    ['G-P001', 5],
  ])
})

test('keeps multiple exact markers on one line at the correct line', () => {
  const result = validateText(
    '<!-- claim:hist-known --> <!-- page:A-P001 --> <!-- page:G-P001 -->',
    textOptions(),
  )

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.claimMarkers.map(({ id, line }) => [id, line]), [['hist-known', 1]])
  assert.deepEqual(result.pageMarkers.map(({ id, line }) => [id, line]), [
    ['A-P001', 1],
    ['G-P001', 1],
  ])
})

test('accepts horizontal whitespace but never newlines inside exact markers', () => {
  const result = validateText(
    '<!--\tclaim:hist-known\t-->\n<!--   page:A-P001 \t-->',
    textOptions(),
  )

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.claimMarkers.map(({ id, line }) => [id, line]), [['hist-known', 1]])
  assert.deepEqual(result.pageMarkers.map(({ id, line }) => [id, line]), [['A-P001', 2]])
})

test('rejects malformed claim and page marker syntax instead of ignoring it', () => {
  const result = validateText([
    '<!-- claim:Hist-known -->',
    '<!-- claim:hist_known -->',
    '<!-- claim: hist-known -->',
    '<!-- claim:hist-known extra -->',
    '<!-- page:A-P01 -->',
    '<!-- page:a-P001 -->',
    '<!-- page: A-P001 -->',
    '<!-- page:A-P001 extra -->',
    '<!-- claim hist-known -->',
    '<!-- page A-P001 -->',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['malformed-claim-marker', 1],
    ['malformed-claim-marker', 2],
    ['malformed-claim-marker', 3],
    ['malformed-claim-marker', 4],
    ['malformed-page-marker', 5],
    ['malformed-page-marker', 6],
    ['malformed-page-marker', 7],
    ['malformed-page-marker', 8],
    ['malformed-claim-marker', 9],
    ['malformed-page-marker', 10],
  ])
})

test('rejects multiline and unclosed claim or page marker comments at their opening line', () => {
  const cases = [
    ['<!--\nclaim:hist-known -->', 'malformed-claim-marker', 1],
    ['Prelude.\n<!--\npage:A-P001 -->', 'malformed-page-marker', 2],
    ['<!-- claim:hist-known\n-->', 'malformed-claim-marker', 1],
    ['Prelude.\n<!-- page:A-P001', 'malformed-page-marker', 2],
    ['<!--\nclaim:hist-known', 'malformed-claim-marker', 1],
  ]

  for (const [text, code, line] of cases) {
    const result = validateText(text, textOptions())
    assert.deepEqual(result.errors.map((error) => [error.code, error.line]), [[code, line]], text)
    assert.deepEqual(result.claimMarkers, [], text)
    assert.deepEqual(result.pageMarkers, [], text)
  }
})

test('preserves unrelated closed and unclosed HTML comments', () => {
  const result = validateText([
    '<!--',
    'editorial note mentioning claim:hist-known without being a marker',
    '-->',
    '<!-- another unfinished editorial note',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.claimMarkers, [])
  assert.deepEqual(result.pageMarkers, [])
})

test('ignores exact claim and page markers inside fenced and inline code', () => {
  const result = validateText([
    '```markdown',
    '<!-- claim:hist-known -->',
    '<!-- page:A-P001 -->',
    '```',
    '`<!-- page:G-P001 -->`',
    'A prose assertion from 1999 with `<!-- claim:hist-known -->` as an example.',
  ].join('\n'), textOptions())

  assert.deepEqual(result.claimMarkers, [])
  assert.deepEqual(result.pageMarkers, [])
  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 6],
  ])
})

test('does not let code-sample page markers satisfy complete-page coverage', () => {
  const root = createBook({ complete: true })
  writeManuscript(root, 'samples.md', [
    '```markdown',
    '<!-- page:A-P001 -->',
    '```',
    '`<!-- page:G-P001 -->`',
  ].join('\n'))

  assert.throws(
    () => validateManuscript({ root, log: false }),
    (error) => {
      assert.deepEqual(error.errors.map(({ code, pageId }) => [code, pageId]), [
        ['missing-page', 'A-P001'],
        ['missing-page', 'G-P001'],
      ])
      return true
    },
  )
})

test('rejects non-standalone marker comments and never counts them', () => {
  const result = validateText([
    'Example <!-- page:A-P001 --> in prose.',
    'History from 1999 <!-- claim:hist-known --> in prose.',
    '> <!-- page:G-P001 -->',
  ].join('\n'), textOptions())

  assert.deepEqual(result.claimMarkers, [])
  assert.deepEqual(result.pageMarkers, [])
  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['non-standalone-page-marker', 1],
    ['non-standalone-claim-marker', 2],
    ['non-standalone-page-marker', 3],
    ['missing-year-claim', 2],
  ])
})

test('rejects an unknown claim id and does not let it satisfy year evidence', () => {
  const result = validateText('<!-- claim:hist-missing -->\nAn assertion about 1999.', textOptions())

  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['unknown-claim', 1],
    ['missing-year-claim', 2],
  ])
  assert.match(messages(result)[0], /unknown claim id: hist-missing/)
})

test('rejects unknown page ids', () => {
  const result = validateText('<!-- page:A-P999 -->\n<!-- page:G-P999 -->', textOptions())

  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['unknown-page', 1],
    ['unknown-page', 2],
  ])
})

test('rejects duplicate page markers globally in the same and different files', () => {
  const root = createBook()
  writeManuscript(root, 'a.md', '<!-- page:A-P001 -->\n<!-- page:A-P001 -->\n')
  writeManuscript(root, 'nested/b.md', '<!-- page:A-P001 -->\n')

  assert.throws(
    () => validateManuscript({ root, log: false }),
    (error) => {
      assert.equal(error.errors.length, 2)
      assert.deepEqual(error.errors.map(({ file, line, code }) => [file, line, code]), [
        ['a.md', 2, 'duplicate-page'],
        ['nested/b.md', 1, 'duplicate-page'],
      ])
      assert.match(error.message, /a\.md:2: duplicate page marker A-P001; first declared at a\.md:1/)
      assert.match(error.message, /nested\/b\.md:1: duplicate page marker A-P001; first declared at a\.md:1/)
      return true
    },
  )
})

test('detects draft tokens case-insensitively at word boundaries', () => {
  const result = validateText([
    'TODO',
    'tbd',
    'FixMe',
    'TBC',
    'tk',
    'xXx',
    'placeholder',
    'Lorem ipsum remains.',
  ].join('\n\n'), textOptions())

  assert.deepEqual(result.errors.map(({ code }) => code), Array(8).fill('draft-token'))
  assert.deepEqual(result.errors.map(({ line }) => line), [1, 3, 5, 7, 9, 11, 13, 15])
})

test('does not flag draft-token text embedded in innocent words', () => {
  const result = validateText(
    'Todoist, TODOsaurus, TBDish, fixmeup, TBCnews, toolkit, TK421, xxxlarge, placeholdersque, and loremipsum.',
    textOptions(),
  )

  assert.deepEqual(result.errors, [])
})

test('detects plural draft tokens and hyphenated or whitespace Lorem ipsum variants', () => {
  const result = validateText([
    'TODOs',
    'tbds',
    'FIXMEs',
    'TBCs',
    'tks',
    'placeholders',
    'Lorem-ipsum',
    'lorem\tipsum',
    'Lorem',
    'ipsum',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['draft-token', 1],
    ['draft-token', 2],
    ['draft-token', 3],
    ['draft-token', 4],
    ['draft-token', 5],
    ['draft-token', 6],
    ['draft-token', 7],
    ['draft-token', 8],
    ['draft-token', 9],
  ])
})

test('rejects leaked search, fetch, view, open, citation, and browser-context tool tokens', () => {
  const result = validateText([
    'turn0search0',
    'turn12fetch3',
    'turn1view9',
    'turn2open4',
    'turn1image0',
    'turn0file0',
    'cite',
    'filecite',
    '<in-app-browser-context',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors.map(({ code }) => code), Array(9).fill('tool-token'))
  assert.deepEqual(result.errors.map(({ line }) => line), [1, 2, 3, 4, 5, 6, 7, 8, 9])
})

test('does not flag tool-token text embedded in innocent identifiers', () => {
  const result = validateText(
    'return1image0 turn0file0x turn0filing0 filecitation in-app-browser-contextual',
    textOptions(),
  )

  assert.deepEqual(result.errors, [])
})

test('reports the correct line for identical claimless paragraphs containing years', () => {
  const paragraph = 'The same event happened in 1999.'
  const result = validateText(`Prelude.\n\n${paragraph}\n\n${paragraph}`, textOptions())

  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 3],
    ['missing-year-claim', 5],
  ])
  assert.ok(messages(result).every((message) => message.includes('year 1999 requires a known claim marker')))
})

test('treats only years from 1000 through 2099 as evidence-bearing years', () => {
  const result = validateText([
    'Out-of-range values 0999 and 2100 need no marker.',
    '',
    'The lower boundary is 1000.',
    '',
    'The upper boundary is 2099.',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 3],
    ['missing-year-claim', 5],
  ])
})

test('does not treat four-digit measurements or measurement ranges as years', () => {
  const result = validateText([
    'Use 1500 мл of water only for the large vessel.',
    'The English note says 1500 ml, and the route is 1800 м.',
    'Wait 1200 секунд in this deliberately extreme example.',
    'The documented capacity range is 1500–1800 мл.',
    'Alternative ranges are 1500-1800 ml and 1500 — 1800 ml.',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors, [])
})

test('masks expanded Latin and Russian measurement units but not year abbreviations', () => {
  const measurements = [
    '1500 g', '2000 kg', '1500 mg', '1500 µg', '1500 μg', '1500 ug',
    '1500 L', '1500 l', '1500 cl', '1500 dl',
    '1500 m', '1500 cm', '1500 mm', '1500 km',
    '1500 seconds', '1500 minutes', '1500 hours',
    '1500 г', '1500 кг', '1500 мг', '1500 мкг',
    '1500 л', '1500 сл', '1500 дл',
    '1500 с', '1500 секунд', '1500 мин', '1500 минут', '1500 ч', '1500 часов',
    '1500-2000 kg', '1500–2000 минут',
  ]

  for (const measurement of measurements) {
    const result = validateText(`The measured value is ${measurement}`, textOptions())
    assert.deepEqual(result.errors, [], measurement)
  }
})

test('ignores years in Markdown destinations, URLs, and path identifiers', () => {
  const result = validateText([
    'Read [the archive](https://example.test/1973/item).',
    'The numeric local destination is [an edition](1973/1974).',
    'The raw URL is https://example.test/1988/item.',
    'The local identifiers are archive/1999/item and /records/2001/source.',
    'Specified path examples are /archive/1973/report.md and book/2020/file.',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors, [])
})

test('masks years inside raw URLs with balanced and nested parentheses', () => {
  const result = validateText([
    'Read http://example.test/Foo_(1973).',
    'Compare HTTPS://example.test/Foo_(Bar_(1974)).',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors, [])
})

test('keeps a genuine year after a parenthesized raw URL visible', () => {
  const result = validateText(
    'Read https://example.test/Foo_(1973) before the revised 2000 edition.',
    textOptions(),
  )

  assert.deepEqual(result.errors.map(({ code, line, year }) => [code, line, year]), [
    ['missing-year-claim', 1, '2000'],
  ])
})

test('stops a raw URL at unmatched closing-parenthesis punctuation', () => {
  const result = validateText(
    'Read https://example.test/archive)2000 remains prose.',
    textOptions(),
  )

  assert.deepEqual(result.errors.map(({ code, line, year }) => [code, line, year]), [
    ['missing-year-claim', 1, '2000'],
  ])
})

test('stops raw URLs and path masking at forbidden delimiters', () => {
  for (const delimiter of ['"', '|']) {
    const result = validateText(
      `Read https://example.test/archive${delimiter}2000 remains prose.`,
      textOptions(),
    )

    assert.deepEqual(result.errors.map(({ code, line, year }) => [code, line, year]), [
      ['missing-year-claim', 1, '2000'],
    ], delimiter)
  }
})

test('masks years inside balanced and nested www URLs', () => {
  const result = validateText([
    'Read www.example.test/Foo_(1973).',
    'Compare WWW.example.test/Foo_(Bar_(1974)).',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors, [])
})

test('keeps a genuine year after a parenthesized www URL visible', () => {
  const result = validateText(
    'Read www.example.test/Foo_(1973) before the revised 2000 edition.',
    textOptions(),
  )

  assert.deepEqual(result.errors.map(({ code, line, year }) => [code, line, year]), [
    ['missing-year-claim', 1, '2000'],
  ])
})

test('stops a www URL at unmatched surrounding punctuation', () => {
  const result = validateText(
    'Read (www.example.test/Foo_(1973))2000 remains prose.',
    textOptions(),
  )

  assert.deepEqual(result.errors.map(({ code, line, year }) => [code, line, year]), [
    ['missing-year-claim', 1, '2000'],
  ])
})

test('does not treat embedded www text or a simple dotted word as a URL', () => {
  const result = validateText([
    'The token notwww.example.test_(1973) remains prose.',
    '',
    'The dotted token not.www.example.test_(1974) remains prose.',
    '',
    'The hyphenated token not-www.example.test_(1975) remains prose.',
    '',
    'The email-like token user@www.example.test_(1976) remains prose.',
    '',
    'The simple dotted word www.chapter_(1977) remains prose.',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors.map(({ code, line, year }) => [code, line, year]), [
    ['missing-year-claim', 1, '1973'],
    ['missing-year-claim', 3, '1974'],
    ['missing-year-claim', 5, '1975'],
    ['missing-year-claim', 7, '1976'],
    ['missing-year-claim', 9, '1977'],
  ])
})

test('keeps numeric slash years and dates visible to evidence checks', () => {
  const result = validateText([
    'The paired years are 1973/1974.',
    '',
    'The full date is 01/02/1973.',
    '',
    'The slash range is 1973/1974–1975/1976.',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors.map(({ code, line, year }) => [code, line, year]), [
    ['missing-year-claim', 1, '1973'],
    ['missing-year-claim', 3, '1973'],
    ['missing-year-claim', 5, '1973'],
  ])
})

test('still requires evidence for genuine year forms and bare four-digit years', () => {
  const result = validateText([
    'The record says 1500 год.',
    '',
    'The edition appeared in 1973 г.',
    '',
    'The period 1973–1975 годы changed the trade.',
    '',
    'A bare 2000 remains a year candidate.',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors.map(({ code, line, year }) => [code, line, year]), [
    ['missing-year-claim', 1, '1500'],
    ['missing-year-claim', 3, '1973'],
    ['missing-year-claim', 5, '1973'],
    ['missing-year-claim', 7, '2000'],
  ])
})

test('accepts a known claim marker on an adjacent line in the same paragraph', () => {
  const result = validateText(
    '<!-- claim:hist-known -->\nThe documented event happened in 1999.',
    textOptions(),
  )

  assert.deepEqual(result.errors, [])
})

test('keeps claim evidence local to one list item and its continuations', () => {
  const result = validateText([
    '- <!-- claim:hist-known -->',
    '  The supported list item refers to 1973.',
    '- The next list item refers to 1974 without evidence.',
  ].join('\n'), textOptions())

  assert.deepEqual(result.claimMarkers.map(({ id, line }) => [id, line]), [['hist-known', 1]])
  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 3],
  ])
})

test('treats four-space list continuations as prose relative to list content indentation', () => {
  const unsupported = validateText([
    '- A list item introduces a continuation:',
    '    The continuation refers to 1973.',
  ].join('\n'), textOptions())
  const supported = validateText([
    '- <!-- claim:hist-known -->',
    '    The same list item refers to 1973.',
  ].join('\n'), textOptions())

  assert.deepEqual(unsupported.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 2],
  ])
  assert.deepEqual(supported.errors, [])
  assert.deepEqual(supported.claimMarkers.map(({ id, line }) => [id, line]), [['hist-known', 1]])
})

test('exempts list-indented code at content indent plus four spaces', () => {
  const result = validateText([
    '- A list item introduces code:',
    '      archive 1973',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors, [])
})

test('does not let a later blockquote paragraph satisfy an earlier quoted paragraph', () => {
  const result = validateText([
    '> The earlier quoted assertion refers to 1973.',
    '>',
    '> <!-- claim:hist-known -->',
    '> The later quoted assertion refers to 1974.',
  ].join('\n'), textOptions())

  assert.deepEqual(result.claimMarkers.map(({ id, line }) => [id, line]), [['hist-known', 3]])
  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 1],
  ])
})

test('separates list items inside blockquotes and keeps same-item continuations together', () => {
  const result = validateText([
    '> - The first quoted item refers to 1973.',
    '> - <!-- claim:hist-known -->',
    '>   The second quoted item refers to 1974.',
    '>',
    '> - <!-- claim:science-known -->',
    '>   A post-blank quoted item refers to 1975.',
  ].join('\r\n'), textOptions())

  assert.deepEqual(result.claimMarkers.map(({ id, line }) => [id, line]), [
    ['hist-known', 2],
    ['science-known', 5],
  ])
  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 1],
  ])
})

test('exempts indented code years while preserving following prose line offsets', () => {
  const result = validateText([
    '    archive 1999',
    '\tarchive 1998',
    '',
    'Outside prose from 2000.',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 4],
  ])
})

test('preserves year line offsets across repeated CRLF paragraphs', () => {
  const paragraph = 'The repeated assertion refers to 1973.'
  const result = validateText(`${paragraph}\r\n\r\n${paragraph}`, textOptions())

  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 1],
    ['missing-year-claim', 3],
  ])
})

test('exempts ATX and setext headings and fenced code from year evidence', () => {
  const result = validateText([
    '# Edition 1999',
    '',
    'Chronology 2000',
    '================',
    '',
    '```text',
    'archive 2001',
    '```',
    '',
    '~~~text',
    'archive 2002',
    '~~~',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors, [])
})

test('keeps invalid closing-fence forms inside code until a valid longer clean closer', () => {
  const result = validateText([
    '```text',
    '``',
    'archive 1996',
    '~~~',
    'archive 1997',
    '```not-a-closing-fence',
    'archive 1999',
    '    ````',
    'archive 1998',
    '```` \t',
    'Outside prose from 2000.',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 11],
  ])
})

test('ends unclosed fences when prose leaves a quote or list container', () => {
  const quoted = validateText([
    '> ```text',
    '> archive 1999',
    'Outside quoted code from 2000.',
  ].join('\n'), textOptions())
  const listed = validateText([
    '- ```text',
    '  archive 1999',
    '',
    'Outside listed code from 2000.',
  ].join('\n'), textOptions())

  assert.deepEqual(quoted.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 3],
  ])
  assert.deepEqual(listed.errors.map(({ code, line }) => [code, line]), [
    ['missing-year-claim', 4],
  ])
})

test('still rejects draft and tool tokens inside fenced code', () => {
  const result = validateText('```text\nTODO turn0open0 and 2001\n```', textOptions())

  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['draft-token', 2],
    ['tool-token', 2],
  ])
})

test('exempts generated apparatus and publication notes only from year evidence', () => {
  const bibliography = validateText('Bibliography entry from 1999.', textOptions({ file: 'album/91-bibliography.md' }))
  const glossary = validateText(
    'Glossary note from 2000. TODO turn0fetch0',
    textOptions({ file: 'album/92-glossary.md' }),
  )
  const ordinary = validateText('Ordinary prose from 2001.', textOptions({ file: 'album/90-notes.md' }))
  const publicationNotes = validateText('Editorial verification: 2026.', textOptions({ file: 'album/89-publication-notes.md' }))

  assert.deepEqual(bibliography.errors, [])
  assert.deepEqual(glossary.errors.map(({ code }) => code), ['draft-token', 'tool-token'])
  assert.deepEqual(publicationNotes.errors, [])
  assert.deepEqual(ordinary.errors.map(({ code }) => code), ['missing-year-claim'])
})

test('allows an absent manuscript directory and missing page markers while incomplete', () => {
  const root = createBook({ complete: false, albumPages: ['A-P001', 'A-P002'], guidePages: ['G-P001'] })

  assert.deepEqual(validateManuscript({ root, log: false }), {
    registeredClaims: 2,
    pageMarkers: 0,
    markdownFiles: 0,
    manuscriptComplete: false,
  })
})

test('requires manuscriptComplete to exist and be boolean', () => {
  const invalidPublications = [
    {},
    { manuscriptComplete: 'false' },
    { manuscriptComplete: 0 },
    { manuscriptComplete: null },
  ]

  for (const publication of invalidPublications) {
    const root = createBook()
    writeJson(path.join(root, 'config', 'publication.json'), publication)
    assert.throws(
      () => validateManuscript({ root, log: false }),
      (error) => {
        assert.deepEqual(error.errors.map(({ code, file, line }) => [code, file, line]), [
          ['invalid-manuscript-complete', 'config/publication.json', 1],
        ])
        assert.match(error.message, /manuscriptComplete must exist and be boolean/)
        return true
      },
      JSON.stringify(publication),
    )
  }
})

test('requires every expected album and guide page exactly once when complete', () => {
  const root = createBook({ complete: true, albumPages: ['A-P001', 'A-P002'], guidePages: ['G-P001'] })
  writeManuscript(root, 'album/opening.md', '<!-- page:A-P001 -->\n')

  assert.throws(
    () => validateManuscript({ root, log: false }),
    (error) => {
      assert.deepEqual(error.errors.map(({ code, pageId }) => [code, pageId]), [
        ['missing-page', 'A-P002'],
        ['missing-page', 'G-P001'],
      ])
      assert.match(error.message, /missing required page marker: A-P002/)
      assert.match(error.message, /missing required page marker: G-P001/)
      return true
    },
  )
})

test('accepts all expected page markers exactly once when complete', () => {
  const root = createBook({ complete: true, albumPages: ['A-P001', 'A-P002'], guidePages: ['G-P001'] })
  writeManuscript(root, 'pages.md', [
    '<!-- page:A-P001 -->',
    '<!-- page:A-P002 -->',
    '<!-- page:G-P001 -->',
  ].join('\n'))

  assert.deepEqual(validateManuscript({ root, log: false }), {
    registeredClaims: 2,
    pageMarkers: 3,
    markdownFiles: 1,
    manuscriptComplete: true,
  })
})

test('discovers markdown recursively in deterministic order and ignores non-files and symlinks', () => {
  const root = createBook()
  const manuscriptRoot = path.join(root, 'manuscript')
  const rootFirst = writeManuscript(root, 'a.md', '')
  const nestedSecond = writeManuscript(root, 'a/first.md', '<!-- page:A-P001 -->\n')
  const second = writeManuscript(root, 'z-last.md', '<!-- page:G-P001 -->\n')
  writeManuscript(root, 'a/ignored.txt', 'TODO turn0search0')
  const outside = path.join(root, 'outside.md')
  fs.writeFileSync(outside, 'TODO turn0search0')
  fs.symlinkSync(outside, path.join(manuscriptRoot, 'linked.md'))
  fs.symlinkSync(path.dirname(outside), path.join(manuscriptRoot, 'linked-directory'))

  assert.deepEqual(discoverMarkdownFiles(manuscriptRoot), [rootFirst, nestedSecond, second])
  assert.deepEqual(validateManuscript({ root, log: false }), {
    registeredClaims: 2,
    pageMarkers: 2,
    markdownFiles: 3,
    manuscriptComplete: false,
  })
})

test('rejects a symlinked manuscript root without reading its external target', () => {
  const root = createBook()
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'book-manuscript-external-'))
  temporaryRoots.push(external)
  fs.writeFileSync(path.join(external, 'outside.md'), '<!-- page:A-P001 -->\n')
  fs.symlinkSync(external, path.join(root, 'manuscript'), 'dir')

  assert.throws(
    () => validateManuscript({ root, log: false }),
    (error) => {
      assert.deepEqual(error.errors.map(({ code, file, line }) => [code, file, line]), [
        ['unsafe-manuscript-root', 'manuscript', 1],
      ])
      assert.match(error.message, /manuscript root must be a real directory inside the book root/)
      assert.doesNotMatch(error.message, /A-P001/)
      return true
    },
  )
})

test('CLI prints registered claim and page-marker counts', () => {
  const result = spawnSync(process.execPath, [validatorPath], { cwd: repoRoot, encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
  assert.match(result.stdout, /^book manuscript ok: \d+ registered claims, \d+ page markers\n$/)
})

test('package scripts validate data before manuscript validation', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))

  assert.equal(packageJson.scripts['book:validate:manuscript'], 'node book/scripts/validate-manuscript.mjs')
  assert.equal(
    packageJson.scripts['book:validate'],
    'npm run book:validate:data && npm run book:validate:manuscript',
  )
})
