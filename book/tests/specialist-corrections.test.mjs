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
const claim = (id) => claims.find((item) => item.id === id)
const source = (id) => sources.find((item) => item.id === id)

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
  assert.match(microcosm, /сухого листа.*настое.*доз/u)
  assert.doesNotMatch(body, /узким терапевтическим диапазоном/u)
  assert.doesNotMatch(claim('medical-interactions-individualize').text, /narrow therapeutic index/u)
  assert.match(body, /Tasly Pharmaceuticals USA/u)
  assert.match(claim('medical-human-efficacy-is-extract-evidence').text, /17 июля 2026 года/u)
  assert.match(source('haas-2013').note, /конфликт/u)
})
