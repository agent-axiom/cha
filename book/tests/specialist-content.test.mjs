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

const albumFiles = [
  '00-entry.md',
  '01-living-mountain.md',
  '02-roads-and-name.md',
  '03-maocha.md',
  '04-sheng-and-shou.md',
  '05-microcosm.md',
  '06-tea-and-body.md',
  '07-tea-room.md',
  '89-publication-notes.md',
  '90-chronology.md',
  '91-glossary.md',
  '92-bibliography.md',
]

const albumManuscript = () => albumFiles
  .map((name) => read(`manuscript/album/${name}`))
  .join('\n')

const albumPageBlocks = (manuscript) => {
  const markers = [...manuscript.matchAll(/^<!-- page:(A-P\d{3}) -->$/gmu)]
  return markers.map((marker, index) => ({
    pageId: marker[1],
    text: manuscript.slice(marker.index, markers[index + 1]?.index ?? manuscript.length),
  }))
}

const allAlbumPageBlocks = () => albumFiles.flatMap((name) => (
  albumPageBlocks(read(`manuscript/album/${name}`))
))

const albumPage = (pageId) => {
  const page = allAlbumPageBlocks().find((block) => block.pageId === pageId)
  assert.ok(page, `missing album page ${pageId}`)
  return page.text
}

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

const allGuidePageBlocks = () => guideFiles.flatMap((name) => (
  guidePageBlocks(read(`manuscript/guide/${name}`))
))

const guideRecipePages = () => json('flatplan/guide.json').pages
  .filter(({ recipe }) => recipe !== undefined)

const guideRecipePageIds = () => guideRecipePages().map(({ id }) => id)

const guideField = (page, field, label = field) => {
  const match = page.match(new RegExp(`\\*\\*${field}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n\\*\\*[^\\n*]+:\\*\\*|$)`, 'u'))
  assert.ok(match, `${label}: missing ${field}`)
  return match[1]
}

const brewingVariablePatterns = [
  ['temperature', /температур[а-яё]*/iu],
  ['leaf mass', /масс[а-яё]*/iu],
  ['contact time', /(?:врем[а-яё]*|контакт[а-яё]*)/iu],
  ['vessel preheating', /прогрев[а-яё]*/iu],
  ['rinse', /ополаскиван[а-яё]*/iu],
  ['lid position', /(?:положен[а-яё]*[^,.;\n]*крыш|крыш[а-яё]*[^,.;\n]*положен)[а-яё]*/iu],
  ['kettle', /чайник[а-яё]*/iu],
  ['volume', /объ[её]м[а-яё]*/iu],
  ['water', /вод[а-яё]*/iu],
  ['drain', /слив[а-яё]*/iu],
]

const comparisonChangeAction = /(?:измен|уменьш|сократ|повыс|пониз|увелич|добав|убав|смен|помен|варьир|примен)[а-яё]*/iu

const assertControlledComparison = (field, label) => {
  assert.match(field, /свеж[а-яё]*/iu, `${label}: use fresh portions`)
  assert.match(field, /эквивалентн[а-яё]*/iu, `${label}: use equivalent portions`)
  assert.match(field, /порци(?:и|й|ям|ями|ях)/iu, `${label}: use multiple portions`)

  assert.doesNotMatch(field, /(?:одн[а-яё]*|единственн[а-яё]*)[^,.;\n]{0,80}порци[а-яё]*/iu, `${label}: do not use a single portion`)

  assert.match(field, /(?:измен|уменьш|сократ|повыс|примен|соседн[а-яё]* температур)[а-яё]*/iu, `${label}: name a changed variable`)
  const changeSegment = field.split(/(?:,?\s+(?:и\s+)?сохранив|,?\s+при прежн[а-яё]*|,?\s+оставив неизменн[а-яё]*|,?\s+одинаков[а-яё]*\s+(?:прогрев|подач)[а-яё]*|[;,]\s*(?:(?:и|а)\s+)?затем)/iu, 1)[0]
  const changedVariables = brewingVariablePatterns
    .filter(([, pattern]) => pattern.test(changeSegment))
    .map(([name]) => name)
  if (
    changedVariables.includes('vessel preheating')
    && changedVariables.includes('kettle')
    && /(?:прогрев[а-яё]*[^,.;\n]*чайник|чайник[а-яё]*[^,.;\n]*прогрев)/iu.test(changeSegment)
  ) changedVariables.splice(changedVariables.indexOf('kettle'), 1)
  if (changedVariables.length === 0 && /одн[а-яё]*\s+(?:величин|переменн)[а-яё]*/iu.test(changeSegment)) {
    changedVariables.push('explicit single variable')
  }
  const offersOneOfTwoVariables = changedVariables.length === 2 && /только[^,.;\n]*\sили\s/iu.test(changeSegment)
  assert.ok(
    changedVariables.length === 1 || offersOneOfTwoVariables,
    `${label}: change exactly one variable, found ${changedVariables.join(', ') || 'none'}`,
  )
  const baseline = field.match(/(?:повтор|верн)[а-яё]*[^.\n]*(?:исходн|базов)[а-яё]*[^.\n]*(?:режим|настройк|вариант)/iu)
  assert.ok(baseline, `${label}: return to the baseline`)
  const beforeBaseline = field.slice(0, baseline.index)
  const sequencedTail = beforeBaseline.match(/(?:затем|после этого|далее)\s+([^.;\n]*)$/iu)?.[1] ?? ''
  assert.doesNotMatch(sequencedTail, comparisonChangeAction, `${label}: do not change another variable before returning to the baseline`)
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

const parseStartingRange = (field, label) => {
  const match = field.match(/сосуд\s+(\d+(?:[.,]\d+)?)\s*мл\s*;\s*лист\s+(\d+(?:[.,]\d+)?)(?:\s*[–—-]\s*(\d+(?:[.,]\d+)?))?\s*г\s*;\s*вода\s+(\d+(?:[.,]\d+)?)\s*[–—-]\s*(\d+(?:[.,]\d+)?)\s*°\s*C\s*;\s*перв(?:ый|ое)\s+(?:настой|настаивание|контакт)\s+(\d+(?:[.,]\d+)?)\s*[–—-]\s*(\d+(?:[.,]\d+)?)\s*секунд/iu)
  assert.ok(match, `${label}: parse starting range`)
  const number = (value) => Number(value.replace(',', '.'))
  const leafMinimum = number(match[2])
  return {
    vesselVolumeMl: number(match[1]),
    leafMassG: match[3] === undefined ? leafMinimum : [leafMinimum, number(match[3])],
    temperatureRangeC: [number(match[4]), number(match[5])],
    firstInfusionRangeSec: [number(match[6]), number(match[7])],
  }
}

const assertStartingRangeMatchesRecipe = (field, recipe, label) => {
  assert.deepEqual(parseStartingRange(field, label), {
    vesselVolumeMl: recipe.vesselVolumeMl,
    leafMassG: recipe.leafMassG,
    temperatureRangeC: recipe.temperatureRangeC,
    firstInfusionRangeSec: recipe.firstInfusionRangeSec,
  }, `${label}: manuscript range must match flatplan recipe`)
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

test('states the gift-album reader promise by A-P006 without losing the sensory opening', () => {
  const opening = allAlbumPageBlocks()
    .filter(({ pageId }) => pageId >= 'A-P001' && pageId <= 'A-P006')
    .map(({ text }) => text)
    .join('\n')

  assert.match(albumPage('A-P001'), /крышк[а-яё]* гайван[а-яё]*[\s\S]*пар[а-яё]*[\s\S]*мокр[а-яё]* кор[а-яё]*/iu)
  assert.match(opening, /подарочн[а-яё]* научно-популярн[а-яё]* альбом/iu)
  assert.match(opening, /не требует специальн[а-яё]* подготовк/iu)
  assert.match(opening, /маршрут[а-яё]* чтени/iu)
  assert.match(opening, /различ[а-яё]* легенд[а-яё]*[^.]*документ[а-яё]*[^.]*современн[а-яё]* провер/iu)
  assert.match(opening, /шэн[а-яё]*[^.]*шу[^.]*дв[а-яё]* технолог/iu)
  assert.match(opening, /осторожн[а-яё]*[^.]*медицинск[а-яё]* обещан/iu)
})

test('points to the six evidence windows on A-P011 before the first repeated label', () => {
  const openingThroughLegend = allAlbumPageBlocks()
    .filter(({ pageId }) => pageId >= 'A-P001' && pageId <= 'A-P011')
    .map(({ text }) => text)
    .join('\n')
  const labels = [...openingThroughLegend.matchAll(/\[(?:ИСТОЧНИК|РЕТРОСПЕКТИВА|ЛЕГЕНДА|ГИПОТЕЗА|СОВРЕМЕННАЯ ПРОВЕРКА|ОТКЛОНЕНО)\]/gu)]
  assert.ok(labels.length >= 2, 'opening must exercise the evidence navigation')
  const pointer = openingThroughLegend.search(/шесть окон[^.\n]*с\.\s*11/iu)
  assert.ok(pointer >= 0, 'opening must point to the six-window legend on p. 11')
  assert.ok(pointer < labels[1].index, 'six-window pointer must precede the first repeated evidence label')
})

test('keeps internal album folio ids and nonbreaking hyphens out of reader-visible prose', () => {
  const visibleAlbum = albumManuscript().replace(/<!--[\s\S]*?-->/gu, '')
  assert.doesNotMatch(visibleAlbum, /\bA[-‐‑‒–—−]P\d{3}\b/u)
  assert.doesNotMatch(visibleAlbum, /\u2011/u)
})

test('closes every major album chapter with one compact three-observation checkpoint', () => {
  for (const pageId of ['A-P046', 'A-P076', 'A-P100', 'A-P130', 'A-P154', 'A-P176', 'A-P192']) {
    const page = albumPage(pageId)
    assert.equal((page.match(/\*\*После этой главы видно:\*\*/gu) ?? []).length, 1, pageId)
    const checkpoint = page.match(/\*\*После этой главы видно:\*\*\s*\n((?:- [^\n]+\n?){3})/u)
    assert.ok(checkpoint, `${pageId}: checkpoint must contain exactly three bullet observations`)
    const observations = checkpoint[1].trim().split('\n')
    assert.equal(observations.length, 3, pageId)
    for (const observation of observations) {
      assert.ok(observation.length <= 150, `${pageId}: observation is not compact`)
      assert.doesNotMatch(observation, /\b(?:сделайте|запишите|попробуйте|сравните)\b/iu, `${pageId}: checkpoint is an outcome, not an exercise`)
    }
  }
})

test('uses one chapter method callout where evidence boundaries repeat most densely', () => {
  const medical = read('manuscript/album/06-tea-and-body.md')
  assert.equal((medical.match(/\*\*Метод главы\.\*\*/gu) ?? []).length, 1)
  const method = albumPage('A-P156')
  assert.match(method, /тип[^.]*форм[^.]*ограничени/iu)
  assert.match(method, /сначала[^.]*явлени|явлени[^.]*сначала/iu)
  assert.match(method, /экстракт[^.]*чашк/iu)
  assert.match(method, /механизм[^.]*клиническ/iu)
  assert.doesNotMatch(albumPage('A-P161'), /экстракт не превращается в чашку/iu)
  assert.doesNotMatch(albumPage('A-P172'), /заменить исследованный концентрат чашкой/iu)
  for (let number = 155; number <= 176; number += 1) {
    const pageId = `A-P${String(number).padStart(3, '0')}`
    const visible = albumPage(pageId).replace(/<!--.*?-->/gsu, '').trim()
    const paragraphs = visible.split(/\n\s*\n/u).filter((paragraph) => !/^#{1,6}\s/u.test(paragraph))
    assert.doesNotMatch(paragraphs[0], /^\[(?:ИСТОЧНИК|РЕТРОСПЕКТИВА|ЛЕГЕНДА|ГИПОТЕЗА|СОВРЕМЕННАЯ ПРОВЕРКА|ОТКЛОНЕНО)\]/u, `${pageId}: describe the phenomenon before its evidence boundary`)
  }
})

test('keeps Ruan Fu as a checked disputed retrospective and removes reader-visible draft', () => {
  assert.doesNotMatch(albumManuscript(), /\bdraft\b/iu)
  const claim = json('data/claims.json').find(({ id }) => id === 'hist-ruan-retrospective')
  assert.equal(claim.status, 'checked')
  assert.equal(claim.evidence, 'retrospective')
  assert.match(claim.text, /приписыва[а-яё]*|атрибуц[а-яё]*/iu)
  assert.match(claim.text, /поздн[а-яё]*|ретроспектив/iu)
  assert.match(claim.text, /не[^.]*прям[а-яё]*[^.]*танск/iu)
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

test('keeps the first local recipe concise under the guide-wide numeric rule', () => {
  const localRecipe = guidePage('G-P001').match(/^\*\*Стартовый диапазон:\*\*\s*(.+)$/mu)
  assert.ok(localRecipe, 'G-P001: local starting range')
  assert.match(localRecipe[1], /общ[а-яё]* правил[а-яё]*[^.\n]*выше|правил[а-яё]*[^.\n]*для всего гида/iu)
  assert.doesNotMatch(localRecipe[1], /не[^.\n]*стандарт[а-яё]*[^.\n]*не[^.\n]*гарантир[а-яё]*/iu)
})

test('separates adaptive brewing from controlled comparison and standardizes recipe cards', () => {
  const guide = guideManuscript()
  for (const concept of ['стартовый диапазон', 'адаптивная настройка', 'контролируемое сравнение']) {
    assert.match(guide, new RegExp(concept, 'iu'), concept)
  }

  const firstPage = guidePage('G-P001')
  for (const boundary of [/редакционн[а-яё]*/iu, /стартов[а-яё]*/iu, /ориентир[а-яё]*/iu]) {
    assert.match(firstPage, boundary)
  }
  assert.match(firstPage, /не (?:являются|считаются) стандарт[а-яё]*[^.]*не гарантируют/iu)
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

test('matches every recipe starting range to its flatplan declaration', () => {
  const recipes = guideRecipePages()
  assert.equal(recipes.length, 16)
  for (const { id: pageId, recipe } of recipes) {
    assertStartingRangeMatchesRecipe(guideField(guidePage(pageId), 'Стартовый диапазон', pageId), recipe, pageId)
  }

  const [{ id: samplePageId, recipe: sampleRecipe }] = recipes
  const sample = guideField(guidePage(samplePageId), 'Стартовый диапазон', samplePageId)
  for (const drifted of [
    sample.replace(/сосуд\s+100\s*мл/iu, 'сосуд 110 мл'),
    sample.replace(/лист\s+5\s*г/iu, 'лист 4–5 г'),
  ]) assert.throws(() => assertStartingRangeMatchesRecipe(drifted, sampleRecipe, 'mutated recipe'))
})

test('applies the controlled-comparison contract to every guide page that names it', () => {
  const comparisonPages = allGuidePageBlocks().filter(({ text }) => /контролируемое сравнение/iu.test(text))
  for (const { pageId, text } of comparisonPages) {
    const contracts = text.split(/\n\s*\n/u)
      .filter((paragraph) => !/^#{1,6}\s/mu.test(paragraph) && /контролируемое сравнение/iu.test(paragraph))
    assert.ok(contracts.length > 0, `${pageId}: explicit controlled-comparison paragraph`)
    for (const contract of contracts) assertControlledComparison(contract, pageId)
  }
  assert.deepEqual(comparisonPages.map(({ pageId }) => pageId), ['G-P001', 'G-P015', 'G-P017'])
})

test('rejects a controlled-comparison field with a weakened experimental contract', () => {
  const valid = 'Возьмите свежие эквивалентные порции, измените только температуру, затем вернитесь к исходной настройке.'
  assert.doesNotThrow(() => assertControlledComparison(valid, 'valid example'))

  for (const weakened of [
    'Возьмите эквивалентные порции, измените только температуру, затем вернитесь к исходной настройке.',
    'Возьмите свежие порции, измените только температуру, затем вернитесь к исходной настройке.',
    'Возьмите свежие эквивалентные порции, измените температуру и время, затем вернитесь к исходной настройке.',
    'Возьмите одну свежую эквивалентную порцию, измените температуру и время, сохранив массу, затем повторите исходный режим.',
    'Возьмите единственную свежую эквивалентную порцию, измените только температуру, затем повторите исходный режим.',
    'Возьмите две свежие эквивалентные порции, измените только температуру; затем сократите время и повторите исходный режим.',
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
  assert.equal(sources.length, 61)
  assert.ok(sources.every(({ publicationClass }) => allowed.has(publicationClass)))
  assert.equal(sources.find(({ id }) => id === 'vinogrodsky-user-excerpt').publicationClass, 'provenance-only')
  assert.equal(sources.find(({ id }) => id === 'vinogrodsky-user-excerpt').evidenceRole, 'provenance-only')

  const bibliography = read('manuscript/album/92-bibliography.md')
  const publishedIds = [...bibliography.matchAll(/<!-- source:([^ ]+) -->/gu)].map(([, id]) => id)
  assert.equal(publishedIds.length, 60)
  assert.equal(publishedIds.includes('vinogrodsky-user-excerpt'), false)
  for (const label of ['Факсимиле', 'Каталогическая запись издания', 'Копия исторического текста', 'Институциональная запись', 'Исследовательская публикация', 'Стандарт', 'Регистрация исследования']) {
    assert.match(bibliography, new RegExp(`\\*\\*Вид документа:\\*\\* ${label}`, 'u'), label)
  }
  for (const label of ['Текстологическое свидетельство', 'Каталогическое подтверждение', 'Спорная поздняя атрибуция', 'Исследовательская опора', 'Институциональная ретроспектива', 'Нормативный ориентир', 'Запись о планируемом исследовании; результатов нет']) {
    assert.match(bibliography, new RegExp(`\\*\\*Роль в книге:\\*\\* ${label}`, 'u'), label)
  }

  const claims = json('data/claims.json')
  assert.ok(claims.some(({ sourceIds = [] }) => sourceIds.includes('vinogrodsky-user-excerpt')))
})
