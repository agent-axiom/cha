import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const bookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.dirname(bookRoot)
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
const json = (relativePath) => JSON.parse(read(relativePath))
const claims = json('book/data/claims.json')
const sources = json('book/data/sources.json')
const album = json('book/flatplan/album.json')
const guide = json('book/flatplan/guide.json')
const assets = json('book/data/assets.json')
const reviews = json('book/data/reviews.json')
const claim = (id) => claims.find((item) => item.id === id)
const source = (id) => sources.find((item) => item.id === id)
const albumPage = (number) => album.pages[number - 1]
const guidePage = (number) => guide.pages[number - 1]

test('bounds the Warring States chronology to what the Jiang article actually states', () => {
  const record = claim('hist-warring-states-remains')
  assert.match(record.text, /ранн(?:ий|его) период(?:а)? Воюющих царств/iu)
  assert.match(record.text, /около 2400 лет назад/iu)
  assert.match(record.text, /Jiang[^.]*не (?:приводит|да[её]т)[^.]*точн[а-яё]* диапазон/iu)
  assert.doesNotMatch(record.text, /453\s*[–—-]\s*410/u)

  const corpus = [
    read('book/manuscript/album/00-entry.md'),
    read('book/manuscript/album/90-chronology.md'),
    read('src/content/history.ts'),
  ].join('\n')
  assert.doesNotMatch(corpus, /453\s*[–—-]\s*410/u)
  assert.match(corpus, /около 2400 лет назад/iu)
})

test('keeps Zhao Xueming nested attributions separate in every reader channel', () => {
  const qing = claim('hist-qing-puer-administration').text
  assert.match(qing, /出雲南普洱府[^.]*отдельн/iu)
  assert.match(qing, /雲南志[^.]*Пуэр[^.]*север[^.]*Чэли[^.]*(?:чай[^.]*раст|раст[^.]*чай)/iu)
  assert.match(qing, /南詔備考[^.]*Пуэр[^.]*производ[^.]*чай[^.]*шест[^.]*гор/iu)
  assert.match(qing, /按[^.]*пятицзинев/iu)
  assert.doesNotMatch(qing, /雲南志[^.]*локализац[^.]*Пуэрск[а-яё]* управ/iu)

  const sourceNote = source('zhao-facsimile-pku').note
  assert.match(sourceNote, /出雲南普洱府[^.]*отдельн/iu)
  assert.match(sourceNote, /雲南志[^.]*север[^.]*車里/u)
  assert.match(sourceNote, /南詔備考[^.]*шест[а-яё]*(?:\s+названн[а-яё]*)?\s+гор/iu)

  const corpus = [
    read('book/manuscript/album/02-roads-and-name.md'),
    read('book/manuscript/album/90-chronology.md'),
    read('src/content/history.ts'),
  ].join('\n')
  assert.doesNotMatch(corpus, /雲南志[^.;\n]*Пуэрск[а-яё]* управ/iu)
  assert.match(corpus, /Пуэр[^.\n]*север[^.\n]*Чэли/iu)
})

test('bounds the checked Ruan retrospective without upgrading the rejected Xu claim', () => {
  const ruan = claim('hist-ruan-retrospective')
  assert.equal(ruan.status, 'checked')
  assert.match(ruan.text, /спорно приписываем[а-яё]* Жуань Фу/iu)
  assert.match(ruan.text, /поздн[а-яё]* ретроспектив/iu)
  assert.match(ruan.text, /каталог[^.]*существован/iu)
  assert.match(ruan.text, /не[^.]*прям[а-яё]*[^.]*танск/iu)
  assert.equal(claim('hist-xu-bowuzhi-western-fan').status, 'rejected')
  assert.match(source('ruan-puer-cha-ji-access').author, /приписыва/iu)
  assert.match(source('ruan-dianbi-catalog').author, /каталогическ[а-яё]* атрибуц/iu)
  assert.doesNotMatch(claim('hist-xu-bowuzhi-western-fan').text, /выводом Жуань Фу/iu)

  const site = read('src/content/history.ts')
  assert.match(site, /доступн[а-яё]* электронн[а-яё]* копи/iu)
  assert.match(site, /приписываем[а-яё]* тексту Жуань Фу/iu)
  assert.match(site, /критическ[а-яё]* издани[а-яё]* и факсимиле[^.]*нет/iu)
  assert.doesNotMatch(site, /date:\s*['"]Около 1825[–—-]1826/iu)

  const review = reviews.find(({ claimId }) => claimId === 'hist-ruan-retrospective')
  assert.equal(review.status, 'pending')
  assert.match(review.note, /checked.*ограничен|проверен.*ограничен/iu)
  assert.doesNotMatch(review.note, /понижен.*draft/iu)
})

test('anchors the late tea-horse-road frame in direct historiography without inventing an ancient single road', () => {
  const framing = claim('hist-tea-horse-road-framing')
  const direct = source('pku-tea-horse-road-historiography')

  assert.ok(framing.sourceIds.includes('pku-tea-horse-road-historiography'))
  assert.equal(direct.documentClass, 'institutional-record')
  assert.equal(direct.evidenceRole, 'institutional-retrospective')
  assert.match(direct.note, /1990.*1992/iu)
  assert.match(direct.note, /сет/iu)
  assert.match(direct.note, /не[^.]*архив/iu)

  const site = read('src/content/history.ts')
  assert.match(site, /pku-tea-horse-road-historiography/u)
  assert.match(site, /fan-chuo-zhao-1985/u)
  assert.doesNotMatch(site, /sortYear:\s*-2737/u)

  const research = read('book/research/history.md')
  assert.match(research, /1990.*1992/iu)
  assert.match(research, /Пекинск.*университет/iu)
})

test('keeps the six-mountains map and maocha diagram on their correct proof pages', () => {
  assert.deepEqual(albumPage(37).assetIds, ['map-six-mountains'])
  assert.equal(albumPage(37).assetIds.includes('map-jingmai-landscape'), false)
  assert.equal(source('zhao-renmin-1957').documentClass, 'catalog-record')
  assert.equal(source('ruan-dianbi-catalog').documentClass, 'manuscript-catalog')

  const map = assets.find(({ id }) => id === 'map-six-mountains')
  assert.equal(map.status, 'preview')
  assert.equal(map.rights, 'pending')
  assert.equal(map.cartography.reviewStatus.printUse, 'blocked')
  assert.equal(map.cartography.reviewStatus.chineseCartographicReview, 'pending')

  assert.deepEqual(albumPage(79).assetIds, [])
  assert.deepEqual(albumPage(90).assetIds, ['diagram-maocha-process'])
})

test('groups institutional retrospectives and trial registrations independently in the bibliography', () => {
  for (const id of ['puer-wuhou', 'yunnan-net-shou-2021', 'yunnan-agri-2018-shou', 'guangzhou-db4401-258-2024']) {
    assert.equal(source(id).evidenceRole, 'institutional-retrospective', id)
  }
  assert.equal(source('dayi-history-1973').evidenceRole, 'corporate-retrospective')
  assert.equal(source('nct06401161').documentClass, 'trial-registration')
  assert.equal(source('nct06401161').evidenceRole, 'trial-registry-record')

  const bibliography = read('book/manuscript/album/92-bibliography.md')
  assert.match(bibliography, /^## Институциональные ретроспективы$/mu)
  assert.match(bibliography, /^## Реестры исследований$/mu)
  assert.match(bibliography, /\*\*Вид документа:\*\* Каталогическая запись издания/u)
  assert.match(bibliography, /\*\*Роль в книге:\*\* Запись о планируемом исследовании; результатов нет/u)
  const retrospectiveStart = bibliography.indexOf('## Институциональные ретроспективы')
  const trialStart = bibliography.indexOf('## Реестры исследований')
  for (const id of ['dayi-history-1973', 'puer-wuhou', 'yunnan-net-shou-2021', 'yunnan-agri-2018-shou', 'guangzhou-db4401-258-2024']) {
    const offset = bibliography.indexOf(`<!-- source:${id} -->`)
    assert.ok(offset > retrospectiveStart, id)
    assert.ok(trialStart === -1 || offset < trialStart, id)
  }
})

test('uses the corrected maocha chain, flatplan terminology, and shou adjustment order', () => {
  const maocha = read('book/manuscript/album/03-maocha.md')
  assert.match(maocha, /солнечн[а-яё]* сушк[а-яё]*\s*[→—-]+\s*шайцин-маоча\s*\(晒青毛茶\)/iu)
  assert.doesNotMatch(maocha, /солнечн[а-яё]* сушк[а-яё]*\s*[→—-]+\s*упаков/iu)

  const diagram = read('book/assets/diagrams/maocha-process.svg')
  assert.match(diagram, /Пять операций/u)
  assert.match(diagram, /Выход · шайцин-маоча/u)
  assert.match(diagram, /data-shape="open-tray"/u)
  assert.doesNotMatch(diagram, /Семь операций|Упаковка · шайцин-маоча/u)

  const page90 = maocha.split('<!-- page:A-P090 -->')[1].split('<!-- page:A-P091 -->')[0]
  assert.match(page90, /читается сверху вниз/iu)
  assert.match(page90, /Соединительные линии показывают порядок/iu)
  assert.match(page90, /общий боковой блок перечисляет наблюдения/iu)
  assert.doesNotMatch(page90, /слева направо|стрелки|под каждой стадией стоят три вопроса/iu)

  assert.equal(albumPage(80).spreadTitle, 'Раскладка (摊青) и предварительная потеря влаги')
  assert.equal(albumPage(81).spreadTitle, 'Раскладка (摊青) и предварительная потеря влаги')
  assert.equal(albumPage(82).spreadTitle, 'Шацин: ограничить активность ферментов листа')
  assert.equal(albumPage(83).spreadTitle, 'Шацин: ограничить активность ферментов листа')
  assert.equal(albumPage(102).spreadTitle, 'Шэн: прессование без влажного кучевания')
  assert.equal(albumPage(103).spreadTitle, 'Шэн: прессование без влажного кучевания')

  const guideText = read('book/manuscript/guide/04-shou.md')
  const required = 'При тяжёлом послевкусии сначала проверьте быстрый полный слив; межпроливное тепло уменьшайте только в отдельном повторе, если тяжесть сохраняется.'
  assert.match(guideText, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'))
  assert.equal(guidePage(33).recipe.adjustmentNote, required)
  const guidePage33 = guideText.split('<!-- page:G-P033 -->')[1].split('<!-- page:G-P034 -->')[0]
  assert.equal((guidePage33.match(/межпроливное тепло уменьшайте только/giu) ?? []).length, 1)
})

test('matches the A-P103 reader directions to the left-right branch diagram', () => {
  const forkPage = read('book/manuscript/album/04-sheng-and-shou.md')
    .split('<!-- page:A-P103 -->')[1]
    .split('<!-- page:A-P104 -->')[0]
  assert.match(forkPage, /расходится на две линии/iu)
  assert.match(forkPage, /Левая ветвь/iu)
  assert.match(forkPage, /Правая\s+[—–-]/iu)
  assert.doesNotMatch(forkPage, /две стрелки|верхняя ветвь|нижняя\s+[—–-]|стрелки не сходятся/iu)
})

test('assigns process and storage visuals only to reader-matched pages', () => {
  const comparisonPages = [albumPage(108), albumPage(109)]
  assert.ok(comparisonPages.every(({ spreadTemplate }) => spreadTemplate === 'process'))
  assert.ok(comparisonPages.every(({ assetIds }) => assetIds.length === 0))
  assert.ok(comparisonPages.every(({ visualPlaceholder }) => visualPlaceholder.status === 'commission-brief'))
  assert.deepEqual(comparisonPages[0].visualPlaceholder, comparisonPages[1].visualPlaceholder)
  assert.match(comparisonPages[0].visualPlaceholder.brief, /сравнить одинаковое прессование шэна и шу/iu)

  const freshCakePages = [albumPage(110), albumPage(111)]
  assert.ok(freshCakePages.every(({ assetIds }) => assetIds.length === 0))
  assert.ok(freshCakePages.every(({ visualPlaceholder }) => visualPlaceholder.status === 'commission-brief'))
  assert.deepEqual(freshCakePages[0].visualPlaceholder, freshCakePages[1].visualPlaceholder)
  assert.match(freshCakePages[0].visualPlaceholder.brief, /карточк[а-яё]* осмотра свежей прессовки/iu)

  assert.deepEqual(albumPage(115).assetIds, ['map-storage-climates'])
  assert.equal(albumPage(115).template, 'map')
  assert.deepEqual(guidePage(47).assetIds, [])
  assert.deepEqual(guidePage(48).assetIds, ['diagram-storage-variables'])
})

test('matches the A-P133 reader description to the actual staged heat diagram', () => {
  const page133 = read('book/manuscript/album/05-microcosm.md')
    .split('<!-- page:A-P133 -->')[1]
    .split('<!-- page:A-P134 -->')[0]
  assert.match(page133, /увлажнение\s*→\s*куча\s*→\s*переворот\s*→\s*наблюдение\s*→\s*сушка/iu)
  assert.match(page133, /значки[^.]*ниже (?:графика|линии|оси)/iu)
  assert.doesNotMatch(page133, /последовательные осмотры|перевороты|разбор|над линией/iu)
})

test('aligns medical evidence classes, caffeine scope, and site storage sources', () => {
  const body = read('book/manuscript/album/06-tea-and-body.md')
  assert.match(body, /A\s*[—–-]\s*(?:актуальная )?официальная рекомендация или применимая официальная оценка безопасности\/риска/iu)
  const microcosmTransition = read('book/manuscript/album/05-microcosm.md').split('<!-- page:A-P154 -->')[1]
  const applicabilityCorpus = [
    microcosmTransition,
    body,
    read('book/manuscript/album/07-tea-room.md'),
    read('book/assets/diagrams/evidence-scale.svg'),
    read('book/research/medicine.md'),
    read('book/editorial/style-sheet.md'),
  ].join('\n')
  assert.doesNotMatch(applicabilityCorpus, /(?:Уровень\s+[A-E]|лестниц(?:а|ы)|ступен(?:ь|и|ей|ями|ях)|шкала\s+(?:силы|доказательств)|медицинские уровни)/iu)
  assert.match(body, /Тип A;/u)

  const caffeine = claim('medical-caffeine-alertness-sleep')
  for (const effect of ['бодр', 'сон', 'тремор', 'тревог', 'сердцебиен', 'желудочно-кишечн']) {
    assert.match(caffeine.text, new RegExp(effect, 'iu'), effect)
  }
  assert.deepEqual(caffeine.sourceIds, ['efsa-caffeine', 'fda-caffeine-2024'])

  const medicine = read('src/content/medicine.ts')
  const caffeineBlock = medicine.slice(medicine.indexOf("id: 'caffeine-safety'"), medicine.indexOf("id: 'pregnancy-safety'"))
  assert.match(caffeineBlock, /fda-caffeine-2024/u)
  const storageBlock = medicine.slice(medicine.indexOf("id: 'storage-safety'"))
  for (const id of ['db5308-storage-2020', 'sedova-2018', 'haas-2013', 'zhang-microbiome-2016', 'chau-2023']) assert.match(storageBlock, new RegExp(id, 'u'), id)
  assert.match(storageBlock, /выборк|панел|сух[а-яё]* лист|наст[оа]й/iu)
  const medicalDossier = read('book/research/medicine.md')
  assert.match(medicalDossier, /NCT06401161[^\n]*trial-registration\/supporting/iu)
  assert.doesNotMatch(medicalDossier, /ClinicalTrials\.gov[^.]*guidance\/supporting/iu)
})

test('records the third cycle findings as internal AI review only', () => {
  const findings = read('book/production/ai-reviews/specialist-review-2026-03/final-findings.md')
  assert.match(findings, /внутренн[а-яё]* AI/iu)
  assert.match(findings, /не[^.]*внешн[а-яё]* (?:одобрени|рецензи)/iu)
  assert.match(findings, /externalApprovals[^\n]*0/u)
  for (const section of ['История', 'Технология', 'Медицина', 'Claim → source']) {
    assert.match(findings, new RegExp(section, 'u'), section)
  }
})

test('keeps the A-S074 placeholder as an explicit accepted production stop-gate', () => {
  const pages = [albumPage(146), albumPage(147)]
  assert.deepEqual(pages.map(({ spreadId }) => spreadId), ['A-S074', 'A-S074'])
  assert.ok(pages.every(({ assetIds }) => assetIds.length === 0))
  assert.ok(pages.every(({ visualPlaceholder }) => visualPlaceholder.status === 'commission-brief'))
  assert.deepEqual(pages[0].visualPlaceholder, pages[1].visualPlaceholder)
  const preflight = read('book/production/preflight-report.md')
  assert.match(preflight, /A-P146[–—-]A-P147[^\n]*(?:принят|accepted)[^\n]*production stop-gate/iu)
  assert.match(preflight, /не[^\n]*print-ready/iu)
})
