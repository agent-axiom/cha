import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultBookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exactClaimMarker = /^<!--[ \t]+claim:([a-z0-9-]+)[ \t]+-->$/
const exactPageMarker = /^<!--[ \t]+page:([AG]-P\d{3})[ \t]+-->$/
const exactMarkerOnLine = /<!--[ \t]+(?:claim:[a-z0-9-]+|page:[AG]-P\d{3})[ \t]+-->/g
const markerBodyOpening = /^(claim|page)\b/i
const draftToken = /\b(?:TODOs?|TBDs?|FIXMEs?|TBCs?|TKs?|XXX|PLACEHOLDERS?)\b|\bLorem(?:\s+|-)ipsum\b/gi
const toolToken = /\bturn\d+(?:search|fetch|view|open|image|file)\d+\b|(?:file)?cite(?![\p{L}\p{N}_])|<in-app-browser-context/giu
const yearToken = /\b(?:1\d{3}|20\d{2})\b/
const markdownDestination = /\]\((?:\\.|[^)\r\n])*\)/g
const forbiddenUrlCharacter = /[\s<>"{}|\\^`]/u
const pathToken = /(?=[^\s()[\]<>"{}|\\^`]*\p{L})[^\s()[\]<>"{}|\\^`]*[\\/][^\s()[\]<>"{}|\\^`]*/gu
const measurementUnit = [
  'micrograms?', 'milligrams?', 'kilograms?', 'grams?', 'µg', 'μg', 'ug', 'mg', 'kg', 'g',
  'milliliters?', 'millilitres?', 'centiliters?', 'centilitres?', 'deciliters?', 'decilitres?',
  'liters?', 'litres?', 'ml', 'cl', 'dl', 'l',
  'millimeters?', 'millimetres?', 'centimeters?', 'centimetres?', 'kilometers?', 'kilometres?',
  'meters?', 'metres?', 'mm', 'cm', 'km', 'm',
  'seconds?', 'secs?', 'sec', 'minutes?', 'mins?', 'min', 'hours?', 'hrs?', 'hr', 's', 'h',
  'микрограмм(?:а|ов)?', 'миллиграмм(?:а|ов)?', 'килограмм(?:а|ов)?', 'грамм(?:а|ов)?',
  'мкг', 'мг', 'кг', 'г(?!\\.)',
  'миллилитр(?:а|ов)?', 'сантилитр(?:а|ов)?', 'децилитр(?:а|ов)?', 'литр(?:а|ов)?',
  'мл', 'сл', 'дл', 'л',
  'миллиметр(?:а|ов)?', 'сантиметр(?:а|ов)?', 'километр(?:а|ов)?', 'метр(?:а|ов)?',
  'мм', 'см', 'км', 'м',
  'секунд(?:а|ы)?', 'сек\\.?', 'минут(?:а|ы)?', 'мин\\.?', 'час(?:а|ов)?', 'ч\\.?', 'с',
].join('|')
const measurementToken = new RegExp(
  String.raw`(?<![\p{L}\p{N}_])(?:1\d{3}|20\d{2})(?:[ \t]*(?:-|–|—)[ \t]*(?:1\d{3}|20\d{2}))?[ \t]*(?:${measurementUnit})(?![\p{L}\p{N}_])`,
  'giu',
)
const apparatusYearExemption = /^album\/(?:89-publication-notes|91-[^/]*|92-[^/]*)\.md$/i

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

const maskRange = (characters, start, end) => {
  for (let index = start; index < end; index += 1) {
    if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' '
  }
}

const markdownContainerLine = (text, maximumQuoteDepth = Number.POSITIVE_INFINITY) => {
  let content = text
  let contentStart = 0
  let quoteDepth = 0

  while (quoteDepth < maximumQuoteDepth) {
    const quote = content.match(/^ {0,3}>[ \t]?/)
    if (!quote) break
    contentStart += quote[0].length
    content = content.slice(quote[0].length)
    quoteDepth += 1
  }

  return { content, contentStart, quoteDepth }
}

const listItemLine = (text) => {
  const match = text.match(/^( {0,3}(?:[-+*]|\d+[.)])[ \t]+)(.*)$/)
  return match ? { content: match[2], contentStart: match[1].length } : null
}

const sanitizedMarkdownCode = (text, lines) => {
  const characters = text.split('')
  let fence = null
  let activeList = null

  for (const line of lines) {
    if (fence) {
      const fencedContainer = markdownContainerLine(line.text, fence.quoteDepth)
      const blankLine = !fencedContainer.content.trim()
      const hasRequiredQuote = fence.quoteDepth === 0
        || fencedContainer.quoteDepth === fence.quoteDepth
        || !line.text.trim()
      const leadingSpaces = fencedContainer.content.match(/^ */)[0].length
      const hasRequiredListIndent = fence.listIndent === null
        || blankLine
        || leadingSpaces >= fence.listIndent
        || fencedContainer.content.startsWith('\t')

      if (hasRequiredQuote && hasRequiredListIndent) {
        const relativeContent = fence.listIndent !== null && !blankLine
          ? fencedContainer.content.startsWith('\t')
            ? fencedContainer.content.slice(1)
            : fencedContainer.content.slice(fence.listIndent)
          : fencedContainer.content
        const closingFence = relativeContent.match(/^ {0,3}(`+|~+)[ \t]*$/)
        maskRange(characters, line.offset, line.offset + line.text.length)
        if (
          closingFence
          && closingFence[1][0] === fence.character
          && closingFence[1].length >= fence.length
        ) {
          fence = null
        }
        continue
      }

      fence = null
      activeList = null
    }

    const container = markdownContainerLine(line.text)
    const listItem = listItemLine(container.content)
    if (!container.content.trim()) activeList = null
    else if (listItem) {
      activeList = {
        quoteDepth: container.quoteDepth,
        contentIndent: listItem.contentStart,
      }
    } else if (activeList?.quoteDepth !== container.quoteDepth) {
      activeList = null
    }

    const relativeContent = listItem
      ? listItem.content
      : activeList && container.content.startsWith(' '.repeat(activeList.contentIndent))
        ? container.content.slice(activeList.contentIndent)
        : container.content

    const openingFence = relativeContent.match(/^ {0,3}(`{3,}|~{3,})/)
    if (openingFence) {
      const leadingSpaces = container.content.match(/^ */)[0].length
      const listIndent = listItem
        ? listItem.contentStart
        : activeList && (
          leadingSpaces >= activeList.contentIndent || container.content.startsWith('\t')
        )
          ? activeList.contentIndent
          : null
      fence = {
        character: openingFence[1][0],
        length: openingFence[1].length,
        quoteDepth: container.quoteDepth,
        listIndent,
      }
      maskRange(characters, line.offset, line.offset + line.text.length)
      continue
    }
    const leadingSpaces = container.content.match(/^ */)[0].length
    const indentedCode = activeList
      ? leadingSpaces >= activeList.contentIndent + 4 || container.content.startsWith('\t')
      : /^(?: {4}|\t)/.test(container.content)
    if (indentedCode) {
      maskRange(characters, line.offset, line.offset + line.text.length)
    }
  }

  for (let index = 0; index < text.length;) {
    if (text[index] !== '`' || characters[index] !== '`') {
      index += 1
      continue
    }
    let openerEnd = index
    while (text[openerEnd] === '`' && characters[openerEnd] === '`') openerEnd += 1
    const delimiterLength = openerEnd - index
    let searchFrom = openerEnd
    let closerEnd = -1
    while (searchFrom < text.length) {
      if (text[searchFrom] !== '`' || characters[searchFrom] !== '`') {
        searchFrom += 1
        continue
      }
      let runEnd = searchFrom
      while (text[runEnd] === '`' && characters[runEnd] === '`') runEnd += 1
      if (runEnd - searchFrom === delimiterLength) {
        closerEnd = runEnd
        break
      }
      searchFrom = runEnd
    }
    if (closerEnd === -1) {
      index = openerEnd
      continue
    }
    maskRange(characters, index, closerEnd)
    index = closerEnd
  }

  return characters.join('')
}

const atxHeading = (text) => /^ {0,3}#{1,6}(?:[ \t]+|$)/.test(text)
const setextUnderline = (text) => /^ {0,3}(?:=+|-+)[ \t]*$/.test(text)

const tokenizeLogicalBlocks = (lines) => {
  const blocks = []
  const lineContexts = new Map()
  let current = null

  const flush = () => {
    current = null
  }
  const start = (type, quoteDepth) => {
    current = { id: blocks.length, type, quoteDepth, lines: [] }
    blocks.push(current)
  }
  const append = (line, contentStart) => {
    const entry = { ...line, text: line.text.slice(contentStart), contentStart }
    current.lines.push(entry)
    lineContexts.set(line.line, { blockId: current.id, type: current.type, contentStart })
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const container = markdownContainerLine(line.text)
    if (!container.content.trim()) {
      flush()
      continue
    }

    const listItem = listItemLine(container.content)
    if (listItem) {
      flush()
      if (atxHeading(listItem.content)) continue
      start('list', container.quoteDepth)
      append(line, container.contentStart + listItem.contentStart)
      continue
    }

    if (current?.type === 'list' && current.quoteDepth === container.quoteDepth) {
      if (atxHeading(container.content)) {
        flush()
        continue
      }
      append(line, container.contentStart)
      continue
    }
    if (current?.type === 'list') flush()

    const next = lines[index + 1]
    const nextContainer = next ? markdownContainerLine(next.text) : null
    const nextIsSetext = nextContainer
      && nextContainer.quoteDepth === container.quoteDepth
      && !listItemLine(nextContainer.content)
      && setextUnderline(nextContainer.content)
    if (atxHeading(container.content) || nextIsSetext) {
      flush()
      if (nextIsSetext) index += 1
      continue
    }
    const type = container.quoteDepth > 0 ? 'quote' : 'top'
    if (!current || current.type !== type || current.quoteDepth !== container.quoteDepth) {
      flush()
      start(type, container.quoteDepth)
    }
    append(line, container.contentStart)
  }

  return { blocks, lineContexts }
}

const markerOnlyLine = (line, context) => {
  if (!line || !context) return false
  const content = line.text.slice(context.contentStart)
  return /^[ \t]*$/.test(content.replace(exactMarkerOnLine, ''))
}

const scanMarkers = (text, analysis, lines, lineContexts, file, knownClaimIds, expectedPageIds) => {
  const errors = []
  const claimMarkers = []
  const pageMarkers = []
  let searchFrom = 0

  while (searchFrom < analysis.length) {
    const start = analysis.indexOf('<!--', searchFrom)
    if (start === -1) break
    const close = analysis.indexOf('-->', start + 4)
    const end = close === -1 ? analysis.length : close + 3
    const raw = text.slice(start, end)
    const body = analysis.slice(start + 4, close === -1 ? analysis.length : close).trim()
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
      } else {
        const context = lineContexts.get(line)
        const standalone = markerOnlyLine(lines[line - 1], context)
        const allowedContext = kind === 'claim' ? standalone : standalone && context?.type === 'top'
        if (!allowedContext) {
          errors.push({
            file,
            line,
            code: `non-standalone-${kind}-marker`,
            message: `${kind} marker must be on a standalone ${kind === 'page' ? 'top-level ' : ''}line`,
          })
        } else if (kind === 'claim') {
          const id = exact[1]
          claimMarkers.push({ id, file, line, blockId: context.blockId })
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

const maskMatches = (characters, text, pattern) => {
  pattern.lastIndex = 0
  let match
  while ((match = pattern.exec(text)) !== null) maskRange(characters, match.index, match.index + match[0].length)
  pattern.lastIndex = 0
}

const wwwUrlPrefixLength = (text, start) => {
  if (text.slice(start, start + 4).toLowerCase() !== 'www.') return 0
  if (start > 0 && /[\p{L}\p{N}_.@-]/u.test(text[start - 1])) return 0

  let cursor = start + 4
  let labelLength = 0
  let domainSeparators = 0
  while (cursor < text.length) {
    const character = text[cursor]
    if (character === '.') {
      if (labelLength === 0) return 0
      domainSeparators += 1
      labelLength = 0
    } else if (/[\p{L}\p{N}-]/u.test(character)) {
      labelLength += 1
    } else {
      break
    }
    cursor += 1
  }

  return domainSeparators > 0 && labelLength > 0 ? 4 : 0
}

const maskRawUrls = (characters, text) => {
  for (let start = 0; start < text.length;) {
    const prefix = text.slice(start, start + 8).toLowerCase()
    const prefixLength = prefix.startsWith('https://')
      ? 8
      : prefix.startsWith('http://')
        ? 7
        : wwwUrlPrefixLength(text, start)
    if (prefixLength === 0) {
      start += 1
      continue
    }

    let end = start + prefixLength
    let parenthesisDepth = 0
    while (end < text.length) {
      const character = text[end]
      if (forbiddenUrlCharacter.test(character)) break
      if (character === '(') parenthesisDepth += 1
      else if (character === ')') {
        if (parenthesisDepth === 0) break
        parenthesisDepth -= 1
      }
      end += 1
    }

    maskRange(characters, start, end)
    start = end
  }
}

const sanitizedYearText = (text) => {
  const characters = text.split('')
  for (const pattern of [markdownDestination, pathToken, measurementToken]) {
    maskMatches(characters, text, pattern)
  }
  maskRawUrls(characters, text)
  return characters.join('')
}

const scanYearEvidence = (blocks, file, claimMarkers, knownClaimIds) => {
  if (apparatusYearExemption.test(normalizedRelativePath(file))) return []
  const errors = []
  for (const block of blocks) {
    const firstYearLine = block.lines.find(({ text }) => yearToken.test(sanitizedYearText(text)))
    if (!firstYearLine) continue
    const firstYear = sanitizedYearText(firstYearLine.text).match(yearToken)[0]
    const hasKnownClaim = claimMarkers.some(({ id, blockId }) => (
      knownClaimIds.has(id) && blockId === block.id
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
  const analysis = sanitizedMarkdownCode(text, lines)
  const analysisLines = linesWithOffsets(analysis)
  const { blocks, lineContexts } = tokenizeLogicalBlocks(analysisLines)
  const markerResult = scanMarkers(text, analysis, lines, lineContexts, file, knownClaimIds, expectedPageIds)
  const errors = [
    ...markerResult.errors,
    ...scanGlobalTokens(text, lines, file, draftToken, 'draft-token', 'draft token'),
    ...scanGlobalTokens(text, lines, file, toolToken, 'tool-token', 'tool token'),
    ...scanYearEvidence(blocks, file, markerResult.claimMarkers, knownClaimIds),
  ]

  return {
    errors,
    claimMarkers: markerResult.claimMarkers,
    pageMarkers: markerResult.pageMarkers,
  }
}

const unsafeManuscriptRoot = () => {
  const error = new Error('manuscript root must be a real directory inside the book root')
  error.code = 'UNSAFE_MANUSCRIPT_ROOT'
  return error
}

const pathIsWithin = (parent, child) => {
  const relative = path.relative(parent, child)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

export function discoverMarkdownFiles(manuscriptRoot, { trustedRoot = path.dirname(path.resolve(manuscriptRoot)) } = {}) {
  const files = []
  const root = path.resolve(manuscriptRoot)
  let rootStat
  try {
    rootStat = fs.lstatSync(root)
  } catch (error) {
    if (error.code === 'ENOENT') return files
    throw error
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw unsafeManuscriptRoot()
  const resolvedRoot = fs.realpathSync(root)
  const resolvedTrustedRoot = fs.realpathSync(path.resolve(trustedRoot))
  if (!pathIsWithin(resolvedTrustedRoot, resolvedRoot)) throw unsafeManuscriptRoot()

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

  visit(root)
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
  if (
    !Object.prototype.hasOwnProperty.call(publication, 'manuscriptComplete')
    || typeof publication.manuscriptComplete !== 'boolean'
  ) {
    throw new ManuscriptValidationError([{
      file: 'config/publication.json',
      line: 1,
      code: 'invalid-manuscript-complete',
      message: 'manuscriptComplete must exist and be boolean',
    }])
  }
  const knownClaimIds = new Set(claims.map(({ id }) => id))
  const expectedPageIdList = [...album.pages, ...guide.pages].map(({ id }) => id)
  const expectedPageIds = new Set(expectedPageIdList)
  const manuscriptRoot = path.join(bookRoot, 'manuscript')
  let markdownFiles
  try {
    markdownFiles = discoverMarkdownFiles(manuscriptRoot, { trustedRoot: bookRoot })
  } catch (error) {
    if (error.code !== 'UNSAFE_MANUSCRIPT_ROOT') throw error
    throw new ManuscriptValidationError([{
      file: 'manuscript',
      line: 1,
      code: 'unsafe-manuscript-root',
      message: error.message,
    }])
  }
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
