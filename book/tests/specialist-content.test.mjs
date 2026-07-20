import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const bookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => fs.readFileSync(path.join(bookRoot, relativePath), 'utf8')
const json = (relativePath) => JSON.parse(read(relativePath))
const guideFiles = [
  '00-quick-start.md',
  '01-choose-tea.md',
  '02-tools-and-water.md',
  '03-sheng.md',
  '04-shou.md',
  '05-simple-methods.md',
  '06-tasting.md',
  '07-storage-and-safety.md',
]

const guideManuscript = () => guideFiles
  .map((name) => read(`manuscript/guide/${name}`))
  .join('\n')

const guidePageBlocks = (manuscript) => {
  const markers = [...manuscript.matchAll(/^<!-- page:(G-P\d{3}) -->$/gmu)]
  return markers.map((marker, index) => ({
    pageId: marker[1],
    text: manuscript.slice(marker.index, markers[index + 1]?.index ?? manuscript.length),
  }))
}

const guidePage = (pageId) => {
  for (const name of guideFiles) {
    const manuscript = read(`manuscript/guide/${name}`)
    const page = guidePageBlocks(manuscript).find((block) => block.pageId === pageId)
    if (page) return page.text
  }
  assert.fail(`missing guide page ${pageId}`)
}

const guideRecipePageIds = () => json('flatplan/guide.json').pages
  .filter(({ recipe }) => recipe !== undefined)
  .map(({ id }) => id)

const guideField = (page, field, label = field) => {
  const match = page.match(new RegExp(`\\*\\*${field}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n\\*\\*[^\\n*]+:\\*\\*|$)`, 'u'))
  assert.ok(match, `${label}: missing ${field}`)
  return match[1]
}

const assertControlledComparison = (field, label) => {
  assert.match(field, /свеж[а-яё]*/iu, `${label}: use fresh portions`)
  assert.match(field, /эквивалентн[а-яё]*/iu, `${label}: use equivalent portions`)
  assert.match(field, /(?:измен|уменьш|сократ|повыс|примен|соседн[а-яё]* температур)[а-яё]*/iu, `${label}: name a changed variable`)
  assert.match(field, /(?:только|сохранив|при прежн[а-яё]*|оставив неизменн[а-яё]*|одинаков[а-яё]*)/iu, `${label}: isolate one variable`)
  assert.match(field, /(?:повтор|верн)[а-яё]*[^.\n]*(?:исходн|базов)[а-яё]*[^.\n]*(?:режим|настройк|вариант)/iu, `${label}: return to the baseline`)
}

const assertGlobalRangeRule = (text, label) => {
  const rule = text.split(/\n\s*\n/u).find((paragraph) => (
    /(?:все|кажд[а-яё]*)/iu.test(paragraph)
    && /числов[а-яё]*/iu.test(paragraph)
    && /диапазон[а-яё]*/iu.test(paragraph)
    && /завариван[а-яё]*/iu.test(paragraph)
    && /гид[а-яё]*/iu.test(paragraph)
  ))
  assert.ok(rule, `${label}: scope the rule to every numeric brewing range in the guide`)
  assert.match(rule, /редакционн[а-яё]*/iu, `${label}: identify editorial provenance`)
  assert.match(rule, /стартов[а-яё]*/iu, `${label}: identify starting guidance`)
  assert.match(rule, /ориентир[а-яё]*/iu, `${label}: bound the guidance as an orientation`)
  assert.match(rule, /не[^.\n]*стандарт[а-яё]*/iu, `${label}: deny standard status`)
  assert.match(rule, /не[^.\n]*гарантир[а-яё]*/iu, `${label}: deny guarantees`)
}

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

test('opens the guide for a novice before giving the first numeric recipe', () => {
  const firstPage = guidePage('G-P001')
  const numericRecipe = firstPage.search(/\d+\s*(?:г|мл|°C|секунд)/u)
  assert.ok(numericRecipe > 0, 'G-P001 must retain a numeric starting recipe')

  const onboarding = firstPage.slice(0, numericRecipe)
  assert.match(onboarding, /(?:читател|нович|начина)[а-яё]*/iu)
  assert.match(onboarding, /без[^.\n]*(?:специальн[а-яё]* )?подготовк[а-яё]*/iu)
  assert.match(onboarding, /сосуд[^.]*известн[а-яё]* объ[её]м/iu)
  assert.match(onboarding, /полностью отделить настой/iu)
  assert.match(onboarding, /чайник/iu)
  assert.match(onboarding, /чист[а-яё]* вод/iu)
  assert.match(onboarding, /вес[а-яё]*/iu)
  assert.match(onboarding, /термометр[а-яё]*/iu)
  assert.match(onboarding, /полезн[а-яё]*[^.\n]*(?:повтор|измер)|(?:повтор|измер)[^.\n]*полезн[а-яё]*/iu)
  assert.match(onboarding, /маркировк[а-яё]*/iu)
  assert.match(onboarding, /шэн/iu)
  assert.match(onboarding, /шу/iu)
  assert.match(onboarding, /тип[^.\n]*неизвестен|неизвестн[а-яё]* тип/iu)
  assert.match(onboarding, /мягк[а-яё]* режим/iu)
  assert.match(onboarding, /не[^.\n]*по цвету/iu)

  assertGlobalRangeRule(onboarding, 'G-P001')

  assert.doesNotMatch(guideManuscript(), /безопасная чашка/iu)
})

test('recognizes the global numeric-range boundary and rejects weakened variants', () => {
  const bounded = 'Все числовые диапазоны заваривания во всём гиде — редакционные стартовые ориентиры: они не являются стандартами и не гарантируют результат.'
  assert.doesNotThrow(() => assertGlobalRangeRule(bounded, 'bounded example'))

  for (const weakened of [
    'Этот числовой диапазон заваривания в гиде — редакционный стартовый ориентир: он не является стандартом и не гарантирует результат.',
    'Все числовые диапазоны заваривания в гиде — редакционные стартовые ориентиры и стандарты, которые не гарантируют результат.',
    'Все числовые диапазоны заваривания в гиде — редакционные стартовые ориентиры и гарантируют результат.',
  ]) assert.throws(() => assertGlobalRangeRule(weakened, 'weakened example'))
})

test('separates adaptive brewing from controlled comparison and standardizes recipe cards', () => {
  const guide = guideManuscript()
  for (const concept of ['стартовый диапазон', 'адаптивная настройка', 'контролируемое сравнение']) {
    assert.match(guide, new RegExp(concept, 'iu'), concept)
  }

  const firstPage = guidePage('G-P001')
  assert.match(firstPage, /стартов[а-яё]* редакционн[а-яё]* ориентир/iu)
  assert.match(firstPage, /не (?:являются|считаются) стандартом[^.]*не гарантируют/iu)
  assert.match(firstPage, /адаптивн[а-яё]* настройк[а-яё]*[^.]*в пределах (?:одной )?сессии/iu)
  assert.match(firstPage, /контролируем[а-яё]* сравнени[а-яё]*[^.]*две свеж[а-яё]* эквивалентн[а-яё]* порци/iu)
  assert.match(firstPage, /контролируем[а-яё]* сравнени[а-яё]*[\s\S]*одн[а-яё]* величин[а-яё]*[\s\S]*повтор[а-яё]* исходн[а-яё]* режим/iu)

  const recipePages = guideRecipePageIds()
  assert.equal(recipePages.length, 16)
  for (const pageId of recipePages) {
    const page = guidePage(pageId)
    for (const field of ['Стартовый диапазон', 'Наблюдайте', 'Первая коррекция', 'Остановитесь', 'Для сравнения']) {
      assert.match(page, new RegExp(`\\*\\*${field}:\\*\\*`, 'u'), `${pageId}: ${field}`)
    }
    assertControlledComparison(guideField(page, 'Для сравнения', pageId), pageId)
    assert.doesNotMatch(page, /\*\*(?:Исходная карточка|Следующий настой|Устранение ошибки|Остановка|Одна переменная):\*\*/u, pageId)
  }
})

test('rejects a controlled-comparison field with a weakened experimental contract', () => {
  const valid = 'Возьмите свежие эквивалентные порции, измените только температуру, затем вернитесь к исходной настройке.'
  assert.doesNotThrow(() => assertControlledComparison(valid, 'valid example'))

  for (const weakened of [
    'Возьмите эквивалентные порции, измените только температуру, затем вернитесь к исходной настройке.',
    'Возьмите свежие порции, измените только температуру, затем вернитесь к исходной настройке.',
    'Возьмите свежие эквивалентные порции, измените температуру и время, затем вернитесь к исходной настройке.',
    'Возьмите свежие эквивалентные порции и измените только температуру.',
  ]) assert.throws(() => assertControlledComparison(weakened, 'weakened example'))
})

test('preserves the ordered guide page-to-claim inventory', () => {
  const inventory = json('flatplan/guide.json').pages.flatMap(({ id: pageId }) => (
    [...guidePage(pageId).matchAll(/^<!-- claim:([^ ]+) -->$/gmu)]
      .map(([, claimId]) => ({ pageId, claimId }))
  ))
  assert.equal(inventory.length, 19)
  assert.deepEqual(inventory, [
    { pageId: 'G-P001', claimId: 'medical-food-storage-safety' },
    { pageId: 'G-P004', claimId: 'storage-mould-is-damage' },
    { pageId: 'G-P007', claimId: 'hist-modern-authenticity' },
    { pageId: 'G-P008', claimId: 'storage-mould-is-damage' },
    { pageId: 'G-P008', claimId: 'prod-material-attribution-boundaries' },
    { pageId: 'G-P009', claimId: 'prod-material-attribution-boundaries' },
    { pageId: 'G-P010', claimId: 'storage-regional-labels' },
    { pageId: 'G-P011', claimId: 'storage-mould-is-damage' },
    { pageId: 'G-P029', claimId: 'medical-food-storage-safety' },
    { pageId: 'G-P031', claimId: 'storage-mould-is-damage' },
    { pageId: 'G-P035', claimId: 'storage-mould-is-damage' },
    { pageId: 'G-P046', claimId: 'medical-tea-not-treatment' },
    { pageId: 'G-P047', claimId: 'medical-caffeine-alertness-sleep' },
    { pageId: 'G-P047', claimId: 'medical-no-universal-cup-limit' },
    { pageId: 'G-P047', claimId: 'medical-pregnancy-caffeine-guidance' },
    { pageId: 'G-P047', claimId: 'medical-interactions-individualize' },
    { pageId: 'G-P048', claimId: 'medical-food-storage-safety' },
    { pageId: 'G-P048', claimId: 'medical-mycotoxin-evidence-limited' },
    { pageId: 'G-P048', claimId: 'storage-no-guaranteed-improvement' },
  ])
})

test('preserves each key safety page boundary without inventing a universal checklist', () => {
  const expectedBoundaries = new Map([
    ['G-P001', [/плесен/iu, /намокан/iu, /вредител/iu, /затхл[^.\n]*запах|запах[^.\n]*затхл/iu, /чуж[^.\n]*запах|запах[^.\n]*чуж/iu, /не заваривайте/iu, /не пробуйте/iu]],
    ['G-P011', [/плесен/iu, /намокан/iu, /вредител/iu, /затхл[^.\n]*запах|запах[^.\n]*затхл/iu, /чуж[^.\n]*запах|запах[^.\n]*чуж/iu, /не заваривайте/iu, /отказаться от пробы|не дегустировать/iu]],
    ['G-P029', [/плесен/iu, /намокан/iu, /вредител/iu, /затхл[^.\n]*запах|запах[^.\n]*затхл/iu, /чуж[^.\n]*запах|запах[^.\n]*чуж/iu, /отказ от пробы/iu]],
    ['G-P031', [/плесен/iu, /намокан/iu, /чуж[^.\n]*запах|запах[^.\n]*чуж/iu, /ополаскиван[^.\n]*не исправляет/iu]],
    ['G-P035', [/плесен/iu, /затхл/iu, /чуж[^.\n]*запах|запах[^.\n]*чуж/iu, /не пробуйте дальше/iu]],
    ['G-P048', [/плесен/iu, /след[а-яё]* вод|намокан/iu, /вредител/iu, /затхл[^.\n]*запах|запах[^.\n]*затхл/iu, /чуж[^.\n]*запах|запах[^.\n]*чуж/iu, /не пробуют/iu, /ополаскиван[^.\n]*кипяток[^.\n]*не возвращают/iu]],
  ])

  for (const [pageId, boundaries] of expectedBoundaries) {
    const page = guidePage(pageId)
    for (const boundary of boundaries) assert.match(page, boundary, `${pageId}: ${boundary}`)
  }
})

test('closes every guide section and the whole guide with an operational checkpoint', () => {
  const expectedLastPages = new Map([
    ['00-quick-start.md', 'G-P006'],
    ['01-choose-tea.md', 'G-P012'],
    ['02-tools-and-water.md', 'G-P020'],
    ['03-sheng.md', 'G-P028'],
    ['04-shou.md', 'G-P036'],
    ['05-simple-methods.md', 'G-P042'],
    ['06-tasting.md', 'G-P046'],
    ['07-storage-and-safety.md', 'G-P048'],
  ])
  for (const [name, expectedPageId] of expectedLastPages) {
    const manuscript = read(`manuscript/guide/${name}`)
    const finalPage = guidePageBlocks(manuscript).at(-1)
    assert.equal(finalPage.pageId, expectedPageId, name)
    for (const field of ['Сделайте', 'Запишите', 'Остановитесь']) {
      assert.match(finalPage.text, new RegExp(`\\*\\*${field}:\\*\\*`, 'u'), `${name}: ${field}`)
    }
  }

  const finalPage = guidePage('G-P048')
  assert.match(finalPage, /\*\*Итог всего гида\.\*\*/u)
  assert.match(finalPage, /стартов[а-яё]* диапазон/iu)
  assert.match(finalPage, /адаптивн[а-яё]* настройк/iu)
  assert.match(finalPage, /контролируем[а-яё]* сравнени/iu)
  assert.match(finalPage, /\*\*Сделайте:\*\*[\s\S]*\*\*Запишите:\*\*[\s\S]*\*\*Остановитесь:\*\*/u)
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
