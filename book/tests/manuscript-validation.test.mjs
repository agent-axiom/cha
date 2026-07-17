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
    'Todoist, TBDish, fixmeup, TBCnews, toolkit, TK421, xxxlarge, placeholders, and lorem-ipsum.',
    textOptions(),
  )

  assert.deepEqual(result.errors, [])
})

test('rejects leaked search, fetch, view, open, citation, and browser-context tool tokens', () => {
  const result = validateText([
    'turn0search0',
    'turn12fetch3',
    'turn1view9',
    'turn2open4',
    'cite',
    '<in-app-browser-context',
  ].join('\n'), textOptions())

  assert.deepEqual(result.errors.map(({ code }) => code), Array(6).fill('tool-token'))
  assert.deepEqual(result.errors.map(({ line }) => line), [1, 2, 3, 4, 5, 6])
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

test('accepts a known claim marker on an adjacent line in the same paragraph', () => {
  const result = validateText(
    '<!-- claim:hist-known -->\nThe documented event happened in 1999.',
    textOptions(),
  )

  assert.deepEqual(result.errors, [])
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

test('still rejects draft and tool tokens inside fenced code', () => {
  const result = validateText('```text\nTODO turn0open0 and 2001\n```', textOptions())

  assert.deepEqual(result.errors.map(({ code, line }) => [code, line]), [
    ['draft-token', 2],
    ['tool-token', 2],
  ])
})

test('exempts album 91 and 92 apparatus files only from year evidence', () => {
  const bibliography = validateText('Bibliography entry from 1999.', textOptions({ file: 'album/91-bibliography.md' }))
  const glossary = validateText(
    'Glossary note from 2000. TODO turn0fetch0',
    textOptions({ file: 'album/92-glossary.md' }),
  )
  const ordinary = validateText('Ordinary prose from 2001.', textOptions({ file: 'album/90-notes.md' }))

  assert.deepEqual(bibliography.errors, [])
  assert.deepEqual(glossary.errors.map(({ code }) => code), ['draft-token', 'tool-token'])
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

test('CLI prints registered claim and page-marker counts', () => {
  const expectedClaims = JSON.parse(fs.readFileSync(path.join(bookRoot, 'data', 'claims.json'), 'utf8')).length
  const result = spawnSync(process.execPath, [validatorPath], { cwd: repoRoot, encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
  assert.equal(result.stdout, `book manuscript ok: ${expectedClaims} registered claims, 0 page markers\n`)
})

test('package scripts validate data before manuscript validation', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))

  assert.equal(packageJson.scripts['book:validate:manuscript'], 'node book/scripts/validate-manuscript.mjs')
  assert.equal(
    packageJson.scripts['book:validate'],
    'npm run book:validate:data && npm run book:validate:manuscript',
  )
})
