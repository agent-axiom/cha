import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const bookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(bookRoot, relativePath), 'utf8'))
const readText = (relativePath) => fs.readFileSync(path.join(bookRoot, relativePath), 'utf8')

const claims = readJson('data/claims.json')
const sources = readJson('data/sources.json')
const reviews = readJson('data/reviews.json')
const claim = (id) => claims.find((item) => item.id === id)
const source = (id) => sources.find((item) => item.id === id)
const review = (id) => reviews.find((item) => item.claimId === id)

test('preserves the nested Qing source attributions and the authentic Fantianlu boundary', () => {
  assert.match(claim('hist-zhao-six-mountains').text, /南詔備考/u)
  assert.match(claim('hist-qing-puer-administration').text, /雲南志/u)

  assert.ok(source('fantianlu-vol18-scan'))
  assert.ok(claim('hist-popular-text-attribution-corrections').sourceIds.includes('fantianlu-vol18-scan'))
  assert.match(claim('hist-fantianlu-composite-quote').text, /竹箬/u)
  assert.doesNotMatch(claim('hist-fantianlu-composite-quote').text, /текст и границы остальной цитаты.*не установлены/u)
})

test('represents Guangdong and Yunnan as separate retrospective branches of shou chronology', () => {
  assert.ok(source('guangzhou-db4401-258-2024'))
  for (const id of ['prod-shou-antecedents', 'prod-shou-chronology-disagreement']) {
    assert.ok(claim(id).sourceIds.includes('guangzhou-db4401-258-2024'))
    assert.match(claim(id).text, /1955/u)
    assert.match(claim(id).text, /1959/u)
  }
})

test('registers the disputed heicha classification boundary without turning aging into a category rule', () => {
  const classification = claim('prod-heicha-classification-boundary')
  const officialResponse = source('yunnan-agri-2018-shou')

  assert.ok(classification)
  assert.equal(classification.status, 'checked')
  assert.match(classification.text, /классификац.*спорн/iu)
  assert.match(classification.text, /GB\/T 22111.*шэн.*шу/iu)
  assert.match(classification.text, /хэй ча.*систем.*прежде всего.*шу/iu)
  assert.match(classification.text, /выдержка сама по себе.*не переводит шэн.*шу.*технологическую категорию/iu)
  assert.doesNotMatch(classification.text, /выдержк.*автоматически.*хэй ча/iu)
  assert.deepEqual(
    new Set(classification.sourceIds),
    new Set(['gbt-22111', 'yunnan-agri-2018-shou']),
  )
  assert.equal(officialResponse.documentClass, 'institutional-record')
  assert.equal(officialResponse.evidenceRole, 'institutional-retrospective')
  assert.match(officialResponse.note, /классификац.*спорн/iu)
  assert.match(officialResponse.note, /GB\/T 22111.*шэн.*шу/iu)
  assert.match(officialResponse.note, /хэй ча.*систем.*прежде всего.*шу/iu)
})

test('keeps Ma chemical trajectories nonmonotonic and the Chau result matrix-bound', () => {
  assert.match(claim('micro-ma-chemical-shifts').text, /дню 7/u)
  assert.match(claim('micro-ma-chemical-shifts').text, /неодинаковые временные траектории/u)

  const chau = claim('micro-chau-market-safety').text
  assert.match(chau, /шести микотоксинов/u)
  assert.match(chau, /31 сух/u)
  assert.doesNotMatch(chau, /MRL/u)
})

test('makes the medical evidence boundaries and disclosures visible in the manuscript', () => {
  const microcosm = readText('manuscript/album/05-microcosm.md')
  const body = readText('manuscript/album/06-tea-and-body.md')

  assert.match(microcosm, /<!-- claim:medical-mycotoxin-evidence-limited -->/u)
  assert.match(microcosm, /сух(?:ой|ого) лист.*насто[ей].*доз/iu)
  assert.doesNotMatch(body, /узким терапевтическим диапазоном/u)
  assert.doesNotMatch(claim('medical-interactions-individualize').text, /narrow therapeutic index/u)
  assert.match(body, /Tasly Pharmaceuticals USA/u)
  assert.match(claim('medical-human-efficacy-is-extract-evidence').text, /21 июля 2026 года/u)
  assert.match(source('haas-2013').note, /конфликт/u)
})

test('updates the medical corpus without converting heterogeneous studies into cup efficacy', () => {
  const requiredSources = [
    'zhao-2026-ripened-review',
    'takeda-2019-powdered-beverage',
    'sun-2024-y562-human',
    'sun-2025-citrus-puer-human',
    'li-2026-theabrownin-human',
    'nct03613688',
    'umin000053941',
    'qiu-2023-postfermented-fumonisins',
    'li-2022-patulin-tea',
    'kiseleva-2021-infusion-transfer',
    'wan-2025-tea-infusion-mycotoxins',
  ]

  for (const id of requiredSources) {
    const item = source(id)
    assert.ok(item, `missing medical source ${id}`)
    assert.equal(item.status, 'checked')
  }

  for (const id of ['nct03613688', 'umin000053941']) {
    assert.equal(source(id).publicationClass, 'trial-registration')
    assert.equal(source(id).documentClass, 'trial-registration')
    assert.equal(source(id).evidenceRole, 'trial-registry-record')
    assert.match(source(id).note, /результат/u)
  }

  const human = claim('medical-human-efficacy-is-extract-evidence')
  assert.match(human.text, /экстракт.*порош.*цитрусов.*коммерческ.*шу/iu)
  assert.match(human.text, /обычн.*домашн.*насто[йя].*не установлен/iu)
  assert.match(human.text, /реестр.*не.*результат/iu)
  for (const id of requiredSources.slice(0, 7)) assert.ok(human.sourceIds.includes(id))

  const review = claim('medical-enzyme-review-not-clinical')
  assert.match(review.text, /2026.*23.*клиническ/iu)
  assert.match(review.text, /смеш/iu)
  assert.equal(review.evidence, 'medical-d')
})

test('expands the mycotoxin evidence while preserving matrix and exposure boundaries', () => {
  const safety = claim('medical-mycotoxin-evidence-limited')
  for (const id of [
    'qiu-2023-postfermented-fumonisins',
    'li-2022-patulin-tea',
    'kiseleva-2021-infusion-transfer',
    'wan-2025-tea-infusion-mycotoxins',
  ]) assert.ok(safety.sourceIds.includes(id))

  assert.match(safety.text, /120.*60.*пуэр/iu)
  assert.match(safety.text, /219/u)
  assert.match(safety.text, /сух.*лист.*настой.*доз/iu)
  assert.match(safety.text, /не.*всей категор/iu)

  const currentFiles = [
    readText('manuscript/album/05-microcosm.md'),
    readText('manuscript/album/06-tea-and-body.md'),
    readText('research/medicine.md'),
  ].join('\n')
  assert.doesNotMatch(currentFiles, /на 17 июля 2026 года шесть/iu)
  assert.doesNotMatch(currentFiles, /две записи о напитке/iu)
  assert.doesNotMatch(currentFiles, /две работы, где напиток/iu)
  assert.doesNotMatch(currentFiles, /нет непосредственно применимого систематического обзора/iu)
})

test('keeps corrected medical registry and publication metadata exact', () => {
  const searchLog = readText('research/medical-search-log.csv')

  assert.match(source('umin000053941').note, /Complete: follow-up continuing/u)
  assert.match(source('umin000053941').note, /опубликованных результатов нет/iu)
  assert.match(searchLog, /UMIN000053941[^\n]*Complete: follow-up continuing[^\n]*опубликованных результатов нет/iu)
  assert.equal(source('takeda-2019-powdered-beverage').pages, '532–542')
  assert.match(source('qiu-2023-postfermented-fumonisins').note, /трёх категорий чая/iu)
  assert.equal(
    source('kiseleva-2021-infusion-transfer').author,
    'Mariya Kiseleva; Zakhar Chalyy; Irina Sedova',
  )
  assert.equal(source('nct03613688').author, 'Tasly Pharmaceuticals')
})

test('includes commercial shou in the bounded human lipid evidence', () => {
  const lipid = claim('medical-lipid-extract-evidence')
  const body = readText('manuscript/album/06-tea-and-body.md')
  const research = readText('research/medicine.md')

  assert.equal(lipid.evidence, 'medical-c')
  assert.ok(lipid.sourceIds.includes('sun-2024-y562-human'))
  assert.match(lipid.text, /экстракт.*коммерческ.*шу/iu)
  assert.match(lipid.text, /неконтролируем.*до\/после/iu)
  assert.match(lipid.text, /множеств.*сравнен|multiple (?:comparisons|endpoints)/iu)
  assert.match(lipid.text, /суррогат/iu)
  assert.match(lipid.text, /инфаркт.*инсульт.*смертност/iu)

  assert.match(body, /claim:medical-lipid-extract-evidence[\s\S]{0,900}экстракт.*коммерческ.*шу/iu)
  assert.match(body, /claim:medical-lipid-extract-evidence[\s\S]{0,900}неконтролируем.*до\/после/iu)
  assert.match(research, /Липиды и cardiovascular claims[\s\S]{0,1600}коммерческ.*шу/iu)
  assert.match(research, /Липиды и cardiovascular claims[\s\S]{0,1600}multiple|Липиды и cardiovascular claims[\s\S]{0,1600}множеств.*сравнен/iu)
})

test('separates type C human microbiome signals from type D mechanisms', () => {
  const microbiome = claim('medical-microbiome-preclinical')
  const body = readText('manuscript/album/06-tea-and-body.md')
  const research = readText('research/medicine.md')

  assert.equal(microbiome.evidence, 'medical-c')
  assert.match(microbiome.text, /Тип D|Type D/u)
  assert.match(microbiome.text, /Тип C|Type C/u)
  assert.match(microbiome.text, /human|человеческ/iu)
  assert.match(body, /claim:medical-microbiome-preclinical[\s\S]{0,700}Типы C \+ D/iu)
  assert.match(research, /`medical-c` — 7 claims/u)
  assert.match(research, /`medical-d` — 4/u)
  assert.match(research, /Пуэр улучшает кишечник\/микробиом[\s\S]{0,700}Тип C|Пуэр улучшает кишечник\/микробиом[\s\S]{0,700}human/iu)
})

test('keeps the result-free UMIN registry out of the weight-change evidence', () => {
  const weight = claim('medical-weight-extract-evidence')
  const human = claim('medical-human-efficacy-is-extract-evidence')
  const research = readText('research/medicine.md')

  assert.ok(!weight.sourceIds.includes('umin000053941'))
  assert.ok(human.sourceIds.includes('umin000053941'))
  assert.match(research, /UMIN000053941[\s\S]{0,300}(?:без опубликованных результатов|не является evidence of efficacy)/iu)
})

test('synchronizes internal medical review notes without implying external approval', () => {
  const lipid = review('medical-lipid-extract-evidence')
  const treatment = review('medical-tea-not-treatment')
  const rejected = review('medical-disease-claims-rejected')

  for (const item of [lipid, treatment, rejected]) {
    assert.ok(item)
    assert.equal(item.status, 'pending')
    assert.equal(item.reviewer, 'Codex internal evidence search')
    assert.match(item.qualification, /internal evidence audit.*not a licensed clinician/iu)
    assert.equal(item.reviewedAt, '2026-07-21')
    assert.match(item.note, /внешн.*медицинск.*реценз/iu)
  }

  assert.match(lipid.note, /Sun 2024/u)
  assert.match(lipid.note, /коммерческ.*шу/iu)
  assert.doesNotMatch(treatment.note, /8-record|\b8\s+(?:records?|запис)/iu)
  assert.match(treatment.note, /обновлённ.*корпус|расширенн.*корпус/iu)
  assert.match(rejected.note, /Takeda 2019/u)
  assert.match(rejected.note, /Sun 2024/u)
  assert.match(rejected.note, /Sun 2025/u)
  assert.match(rejected.note, /Li 2026/u)
  assert.match(rejected.note, /Zhao 2026/u)
})
