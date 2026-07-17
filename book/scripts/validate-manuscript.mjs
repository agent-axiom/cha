import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultBookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exactClaimMarker = /^<!--[ \t]+claim:([a-z0-9-]+)[ \t]+-->$/
const exactPageMarker = /^<!--[ \t]+page:([AG]-P\d{3})[ \t]+-->$/
const markerBodyOpening = /^(claim|page)\b/i
const draftToken = /\b(?:TODO|TBD|FIXME|TBC|TK|XXX|PLACEHOLDER)\b|\bLorem[ \t]+ipsum\b/gi
const toolToken = /\bturn\d+(?:search|fetch|view|open)\d+\b|cite|<in-app-browser-context/giu
const yearToken = /\b(?:1\d{3}|20\d{2})\b/
const apparatusYearExemption = /^album\/(?:91|92)-[^/]*\.md$/i

const compareNames = (left, right) => {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

const normalizedRelativePath = (value) => value.split(path.sep).join('/')

const linesWithOffsets = (text) => {
  const lines = []
  let offset = 0
  let line = 1
  while (offset <= text.length) {
    const newline = text.indexOf('\n', offset)
    const end = newline === -1 ? text.length : newline
    const raw = text.slice(offset, end)
    lines.push({
      text: raw.endsWith('\r') ? raw.slice(0, -1) : raw,
      offset,
      line,
    })
    if (newline === -1) break
    offset = newline + 1
    line += 1
  }
  return lines
}

const lineForOffset = (lines, offset) => {
  let low = 0
  let high = lines.length - 1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (lines[middle].offset <= offset) low = middle + 1
    else high = middle - 1
  }
  return lines[Math.max(0, high)].line
}

const scanMarkers = (text, lines, file, knownClaimIds, expectedPageIds) => {
  const errors = []
  const claimMarkers = []
  const pageMarkers = []
  let searchFrom = 0

  while (searchFrom < text.length) {
    const start = text.indexOf('<!--', searchFrom)
    if (start === -1) break
    const close = text.indexOf('-->', start + 4)
    const end = close === -1 ? text.length : close + 3
    const raw = text.slice(start, end)
    const body = text.slice(start + 4, close === -1 ? text.length : close).trim()
    const opening = body.match(markerBodyOpening)

    if (opening) {
      const kind = opening[1].toLowerCase()
      const line = lineForOffset(lines, start)
      const exact = kind === 'claim' ? raw.match(exactClaimMarker) : raw.match(exactPageMarker)

      if (!exact) {
        const display = raw.replaceAll('\r', '\\r').replaceAll('\n', '\\n')
        errors.push({
          file,
          line,
          code: `malformed-${kind}-marker`,
          message: `malformed ${kind} marker: ${display}`,
        })
      } else if (kind === 'claim') {
        const id = exact[1]
        claimMarkers.push({ id, file, line })
        if (!knownClaimIds.has(id)) {
          errors.push({
            file,
            line,
            code: 'unknown-claim',
            claimId: id,
            message: `unknown claim id: ${id}`,
          })
        }
      } else {
        const id = exact[1]
        pageMarkers.push({ id, file, line })
        if (!expectedPageIds.has(id)) {
          errors.push({
            file,
            line,
            code: 'unknown-page',
            pageId: id,
            message: `unknown page id: ${id}`,
          })
        }
      }
    }

    if (close === -1) break
    searchFrom = end
  }

  return { errors, claimMarkers, pageMarkers }
}

const scanGlobalTokens = (text, lines, file, pattern, code, description) => {
  const errors = []
  pattern.lastIndex = 0
  let match
  while ((match = pattern.exec(text)) !== null) {
    errors.push({
      file,
      line: lineForOffset(lines, match.index),
      code,
      token: match[0],
      message: `${description}: ${match[0]}`,
    })
  }
  pattern.lastIndex = 0
  return errors
}

const proseParagraphs = (lines) => {
  const paragraphs = []
  let paragraph = []
  let fence = null

  const flush = () => {
    if (paragraph.length > 0) paragraphs.push(paragraph)
    paragraph = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index]
    if (fence) {
      const closingFence = current.text.match(/^ {0,3}(`+|~+)[ \t]*$/)
      if (
        closingFence
        && closingFence[1][0] === fence.character
        && closingFence[1].length >= fence.length
      ) {
        fence = null
      }
      continue
    }
    const openingFence = current.text.match(/^ {0,3}(`{3,}|~{3,})/)
    if (openingFence) {
      flush()
      fence = { character: openingFence[1][0], length: openingFence[1].length }
      continue
    }
    if (!current.text.trim()) {
      flush()
      continue
    }
    if (/^\s{0,3}#{1,6}(?:\s|$)/.test(current.text)) {
      flush()
      continue
    }
    const next = lines[index + 1]
    if (next && /^\s{0,3}(?:=+|-+)\s*$/.test(next.text)) {
      flush()
      index += 1
      continue
    }
    paragraph.push(current)
  }
  flush()
  return paragraphs
}

const scanYearEvidence = (lines, file, claimMarkers, knownClaimIds) => {
  if (apparatusYearExemption.test(normalizedRelativePath(file))) return []
  const errors = []
  for (const paragraph of proseParagraphs(lines)) {
    const firstYearLine = paragraph.find(({ text }) => yearToken.test(text))
    if (!firstYearLine) continue
    const firstYear = firstYearLine.text.match(yearToken)[0]
    const paragraphStart = paragraph[0].line
    const paragraphEnd = paragraph.at(-1).line
    const hasKnownClaim = claimMarkers.some(({ id, line }) => (
      knownClaimIds.has(id) && line >= paragraphStart && line <= paragraphEnd
    ))
    if (!hasKnownClaim) {
      errors.push({
        file,
        line: firstYearLine.line,
        code: 'missing-year-claim',
        year: firstYear,
        message: `year ${firstYear} requires a known claim marker in the same paragraph`,
      })
    }
  }
  return errors
}

export function validateText(text, {
  file = '<text>',
  knownClaimIds = new Set(),
  expectedPageIds = new Set(),
} = {}) {
  if (typeof text !== 'string') throw new TypeError('manuscript text must be a string')
  if (!(knownClaimIds instanceof Set)) throw new TypeError('knownClaimIds must be a Set')
  if (!(expectedPageIds instanceof Set)) throw new TypeError('expectedPageIds must be a Set')

  const lines = linesWithOffsets(text)
  const markerResult = scanMarkers(text, lines, file, knownClaimIds, expectedPageIds)
  const errors = [
    ...markerResult.errors,
    ...scanGlobalTokens(text, lines, file, draftToken, 'draft-token', 'draft token'),
    ...scanGlobalTokens(text, lines, file, toolToken, 'tool-token', 'tool token'),
    ...scanYearEvidence(lines, file, markerResult.claimMarkers, knownClaimIds),
  ]

  return {
    errors,
    claimMarkers: markerResult.claimMarkers,
    pageMarkers: markerResult.pageMarkers,
  }
}

export function discoverMarkdownFiles(manuscriptRoot) {
  const files = []

  const visit = (directory) => {
    let entries
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true })
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) return
      throw error
    }
    entries.sort((left, right) => compareNames(left.name, right.name))
    for (const entry of entries) {
      const filename = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) visit(filename)
      else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') files.push(filename)
    }
  }

  visit(path.resolve(manuscriptRoot))
  return files.sort(compareNames)
}

export class ManuscriptValidationError extends Error {
  constructor(errors) {
    const detail = errors.map(({ file, line, message }) => `${file}:${line}: ${message}`).join('\n')
    super(`manuscript validation failed with ${errors.length} error(s):\n${detail}`)
    this.name = 'ManuscriptValidationError'
    this.errors = errors
  }
}

const readJson = (root, relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))

export function validateManuscript({ root = defaultBookRoot, log = true } = {}) {
  const bookRoot = path.resolve(root)
  const claims = readJson(bookRoot, path.join('data', 'claims.json'))
  const album = readJson(bookRoot, path.join('flatplan', 'album.json'))
  const guide = readJson(bookRoot, path.join('flatplan', 'guide.json'))
  const publication = readJson(bookRoot, path.join('config', 'publication.json'))
  const knownClaimIds = new Set(claims.map(({ id }) => id))
  const expectedPageIdList = [...album.pages, ...guide.pages].map(({ id }) => id)
  const expectedPageIds = new Set(expectedPageIdList)
  const manuscriptRoot = path.join(bookRoot, 'manuscript')
  const markdownFiles = discoverMarkdownFiles(manuscriptRoot)
  const errors = []
  const pageMarkers = []

  for (const filename of markdownFiles) {
    const file = normalizedRelativePath(path.relative(manuscriptRoot, filename))
    const result = validateText(fs.readFileSync(filename, 'utf8'), {
      file,
      knownClaimIds,
      expectedPageIds,
    })
    errors.push(...result.errors)
    pageMarkers.push(...result.pageMarkers)
  }

  const firstPageMarker = new Map()
  for (const marker of pageMarkers) {
    const first = firstPageMarker.get(marker.id)
    if (first) {
      errors.push({
        file: marker.file,
        line: marker.line,
        code: 'duplicate-page',
        pageId: marker.id,
        message: `duplicate page marker ${marker.id}; first declared at ${first.file}:${first.line}`,
      })
    } else {
      firstPageMarker.set(marker.id, marker)
    }
  }

  if (publication.manuscriptComplete === true) {
    for (const pageId of expectedPageIdList) {
      if (!firstPageMarker.has(pageId)) {
        errors.push({
          file: 'config/publication.json',
          line: 1,
          code: 'missing-page',
          pageId,
          message: `missing required page marker: ${pageId}`,
        })
      }
    }
  }

  if (errors.length > 0) throw new ManuscriptValidationError(errors)

  const result = {
    registeredClaims: knownClaimIds.size,
    pageMarkers: pageMarkers.length,
    markdownFiles: markdownFiles.length,
    manuscriptComplete: publication.manuscriptComplete === true,
  }
  if (log) {
    console.log(`book manuscript ok: ${result.registeredClaims} registered claims, ${result.pageMarkers} page markers`)
  }
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateManuscript()
}
