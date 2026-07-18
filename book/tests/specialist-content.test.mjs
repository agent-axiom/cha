import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const bookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => fs.readFileSync(path.join(bookRoot, relativePath), 'utf8')
const json = (relativePath) => JSON.parse(read(relativePath))

const collectVisibleFlatplanText = (value, key = '') => {
  if (Array.isArray(value)) return value.flatMap((item) => collectVisibleFlatplanText(item))
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([field, item]) => (
    ['title', 'role', 'spreadTitle', 'brief'].includes(field)
      ? [String(item)]
      : collectVisibleFlatplanText(item, field)
  ))
  return []
}

const visibleSvgText = (text) => [...text.matchAll(/<(?:title|desc|text)\b[^>]*>([^<]*)<\/(?:title|desc|text)>/gu)]
  .map(([, value]) => value)
  .join('\n')

const visibleCorpus = () => [
  ...fs.readdirSync(path.join(bookRoot, 'manuscript', 'album'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => read(`manuscript/album/${name}`).replace(/<!--[\s\S]*?-->/gu, '')),
  ...fs.readdirSync(path.join(bookRoot, 'manuscript', 'guide'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => read(`manuscript/guide/${name}`).replace(/<!--[\s\S]*?-->/gu, '')),
  ...collectVisibleFlatplanText(json('flatplan/album.json')),
  ...collectVisibleFlatplanText(json('flatplan/guide.json')),
  ...fs.readdirSync(path.join(bookRoot, 'assets', 'diagrams'))
    .filter((name) => name.endsWith('.svg'))
    .map((name) => visibleSvgText(read(`assets/diagrams/${name}`))),
].join('\n')

test('uses chapter-level H1 headings and canonical reader-visible tea terms', () => {
  for (const chapter of ['03-maocha.md', '04-sheng-and-shou.md', '05-microcosm.md']) {
    assert.match(read(`manuscript/album/${chapter}`), /^<!-- page:A-P\d{3} -->\n# [^#]/u, chapter)
  }

  const corpus = visibleCorpus()
  assert.doesNotMatch(corpus, /\b(?:Wodui|wodui)\b/u)
  assert.doesNotMatch(corpus, /(?:^|[^А-Яа-яЁё])(?:Шоу|шоу)(?=$|[^А-Яа-яЁё])/u)
  for (const term of ['Шэньнун', 'шацин', '杀青', 'шайцин', '晒青', 'шайцин-маоча', '晒青毛茶', 'водуй', '渥堆', 'шэн', 'шу']) {
    assert.match(corpus, new RegExp(term, 'u'), term)
  }
})

test('states the complete fresh-leaf sequence and keeps sheng separate from wodui', () => {
  const maocha = read('manuscript/album/03-maocha.md')
  const fork = read('manuscript/album/04-sheng-and-shou.md')

  assert.match(maocha, /свеж(?:ий лист|ая зелень)[^\n]*摊青[^\n]*杀青[^\n]*揉捻[^\n]*解块[^\n]*日光干燥[^\n]*晒青毛茶/u)
  assert.doesNotMatch(maocha, /исходный шайцин проходит/u)
  assert.match(fork, /механическ/u)
  assert.match(fork, /тепл[а-яё-]*\s+и\s+влаг|тепловлаг/u)
  assert.match(fork, /микробн[а-яё-]*[–— -]+химическ/u)
  assert.match(fork, /последующ[а-яё-]* хранен/u)
  assert.doesNotMatch(fork, /постферментированного чая/u)
})

test('corrects extraction, infusion timing, and storage safety in the concise guide', () => {
  const quick = read('manuscript/guide/00-quick-start.md')
  const shou = read('manuscript/guide/04-shou.md')
  const storage = read('manuscript/guide/07-storage-and-safety.md')

  assert.match(quick, /остаточн[а-яё]* вод[а-яё]* продолжает экстракцию/iu)
  assert.match(quick, /тепл[оа-яё-]* меняет (?:её )?скорость/iu)
  assert.match(quick, /удлиня[а-яё]* контакт только после заметного ослабления/iu)
  assert.doesNotMatch(quick, /Лист раскрывается, поэтому время обычно приходится/u)

  assert.match(shou, /остаточн[а-яё]* вод[а-яё]* продолжает экстракцию/iu)
  assert.match(shou, /тепл[оа-яё-]* может изменить (?:её )?скорость/iu)
  assert.match(shou, /тепло само по себе не (?:является|становится) скрытым долгим настаиванием/iu)

  assert.match(storage, /намокан[а-яё]*, конденсац[а-яё]* и устойчив[а-яё]* сырост/iu)
  assert.match(storage, /нормальн[а-яё]* вид и запах не (?:доказывают|подтверждают) отсутстви[а-яё]* микотоксин/iu)
  assert.match(storage, /сенсорн[а-яё]* осмотр[^.]*очевидн[а-яё]* поврежден/iu)
  assert.match(storage, /ополаскивание и кипя(?:чение|ток)[^.]*не (?:являются|заменяют) лабораторн/iu)
  assert.match(storage, /не (?:доказывают|устанавливают) отсутстви[а-яё]* загрязнен/iu)
})

test('provides reader navigation, publication notes, and an editorial style sheet', () => {
  const entry = read('manuscript/album/00-entry.md')
  const notes = read('manuscript/album/89-publication-notes.md')
  const styleSheet = read('editorial/style-sheet.md')

  assert.match(entry, /<!-- page:A-P016 -->\n## Как читать эту книгу/u)
  assert.match(entry, /Вход[^\n]*1–20/u)
  assert.match(entry, /Живая гора[^\n]*21–46/u)
  assert.match(entry, /Справочный аппарат[^\n]*193–208/u)
  assert.match(notes, /^<!-- page:A-P208 -->\n# Выходные сведения/u)
  assert.match(notes, /18 июля 2026/u)
  assert.match(notes, /https:\/\/github\.com\/agent-axiom\/cha\/issues/u)
  assert.match(notes, /ИИ[^.]*инвентаризац[а-яё]* источн/u)
  assert.match(notes, /не является внешн[а-яё]* экспертн[а-яё]* рецензи/u)
  assert.match(notes, /0[^.]*внешн[а-яё]* (?:согласован|одобрен)/u)
  assert.match(notes, /prepared-not-dispatched/u)
  assert.match(notes, /редакционн[а-яё]* proof[^.]*не[^.]*PDF\/X/iu)

  for (const section of [
    'Терминология и транслитерация',
    'Метки доказательности',
    'Цитирование и примечания',
    'Числа, даты и единицы',
    'Ссылки на иллюстрации',
    'Медицинская граница',
    'Источники и копии доступа',
    'ИИ и редакционная прозрачность',
  ]) assert.match(styleSheet, new RegExp(section, 'u'), section)
})

test('publication bibliography excludes provenance-only records while the review corpus retains them', () => {
  const sources = json('data/sources.json')
  const allowed = new Set([
    'primary-text', 'facsimile', 'critical-edition', 'print-edition-catalog', 'manuscript-catalog', 'access-copy',
    'retrospective', 'research', 'standard-guidance', 'trial-registration', 'provenance-only',
  ])
  assert.equal(sources.length, 49)
  assert.ok(sources.every(({ publicationClass }) => allowed.has(publicationClass)))
  assert.equal(sources.find(({ id }) => id === 'vinogrodsky-user-excerpt').publicationClass, 'provenance-only')

  const bibliography = read('manuscript/album/92-bibliography.md')
  const publishedIds = [...bibliography.matchAll(/<!-- source:([^ ]+) -->/gu)].map(([, id]) => id)
  assert.equal(publishedIds.length, 48)
  assert.equal(publishedIds.includes('vinogrodsky-user-excerpt'), false)
  for (const label of ['Факсимиле', 'Печатное издание: каталогическая запись', 'Копия доступа', 'Ретроспектива', 'Исследование', 'Стандарт или руководство', 'Регистрация исследования; результатов нет']) {
    assert.match(bibliography, new RegExp(`\\*\\*Класс:\\*\\* ${label}`, 'u'), label)
  }

  const claims = json('data/claims.json')
  assert.ok(claims.some(({ sourceIds = [] }) => sourceIds.includes('vinogrodsky-user-excerpt')))
})
