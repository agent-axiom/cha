import { describe, expect, it } from 'vitest'
import rawClaims from '../../book/data/claims.json'
import { history } from '../content/history'
import { medicineClaims } from '../content/medicine'
import { myths } from '../content/mythology'
import { regions } from '../content/regions'

function historyEntry(id: string) {
  const entry = history.find((candidate) => candidate.id === id)
  expect(entry, `missing history entry ${id}`).toBeDefined()
  return entry!
}

function regionEntry(id: string) {
  const entry = regions.find((candidate) => candidate.id === id)
  expect(entry, `missing region entry ${id}`).toBeDefined()
  return entry!
}

describe('editorial history boundaries', () => {
  it('adds separate archaeological and written thresholds for early tea', () => {
    const archaeological = historyEntry('warring-states-tea-remains')
    expect(
      `${archaeological.date} ${archaeological.summary} ${archaeological.detail}`,
    ).toMatch(/ранн.*Воюющих царств.*2400/i)
    expect(`${archaeological.date} ${archaeological.detail}`).not.toMatch(/453.*410/i)
    expect(archaeological.detail).toMatch(/не.*пуэр/i)
    expect(archaeological.sourceIds).toContain('jiang-2021-warring-tea')

    const written = historyEntry('wang-bao-tea-contract')
    expect(`${written.date} ${written.summary}`).toMatch(/59.*до н\.\s?э\./i)
    expect(written.detail).toMatch(/филолог|неоднознач/i)
    expect(written.sourceIds).toEqual(
      expect.arrayContaining(['lu-2016-earliest-tea', 'benn-2015']),
    )
  })

  it('separates Zhao Xueming from the sources compiled in his Puer section', () => {
    const zhao = historyEntry('zhao-six-mountains')
    const text = `${zhao.date} ${zhao.summary} ${zhao.detail}`

    expect(zhao.date).toMatch(/1765.*позд/i)
    expect(text).toContain('雲南志')
    expect(text).toContain('南詔備考')
    expect(text).toContain('按')
    expect(text).toMatch(/出雲南普洱府/i)
    expect(text).toMatch(/север.*Чэли/i)
    expect(text).toMatch(/шест.*гор/i)
    expect(text).not.toMatch(/雲南志[^.]*Пуэрск.*управ/i)
    expect(text).toMatch(/пятицзинев/i)
    expect(text).toMatch(/чай.*паст/i)
    expect(zhao.sourceIds).toEqual(
      expect.arrayContaining(['zhao-facsimile-pku', 'zhao-1765']),
    )
    expect(JSON.stringify(history)).not.toContain('Чжао Сюэминь перечисляет')
  })

  it('marks later historical syntheses as retrospective', () => {
    const ruan = historyEntry('ruan-puer-record')
    expect(ruan.kind).toBe('retrospective')
    expect(`${ruan.summary} ${ruan.detail}`).toMatch(/электронн.*копи.*приписываем/i)
    expect(ruan.detail).toMatch(/каталог.*не.*построч/i)
    expect(historyEntry('caravan-commodity').kind).toBe('retrospective')
  })

  it('keeps the Guangdong and Yunnan shou genealogies in separate retrospective cards', () => {
    const guangdong = historyEntry('guangdong-shou-line')
    const guangdongText = `${guangdong.date} ${guangdong.summary} ${guangdong.detail}`
    expect(guangdong.kind).toBe('retrospective')
    expect(guangdongText).toMatch(/1955/)
    expect(guangdongText).toMatch(/1957/)
    expect(guangdongText).toMatch(/1959/)
    expect(guangdong.sourceIds).toContain('guangzhou-db4401-258-2024')

    const yunnan = historyEntry('yunnan-shou-adoption')
    const yunnanText = `${yunnan.date} ${yunnan.summary} ${yunnan.detail}`
    expect(yunnan.kind).toBe('retrospective')
    expect(yunnanText).toMatch(/1973/)
    expect(yunnanText).toMatch(/1975/)
    expect(yunnan.sourceIds).toEqual(
      expect.arrayContaining([
        'yunnan-agri-2018-shou',
        'dayi-history-1973',
      ]),
    )

    expect(`${guangdongText} ${yunnanText}`).toMatch(
      /не.*единствен|не.*бесспор/i,
    )
  })
})

describe('editorial attribution boundaries', () => {
  it('does not classify the historical hundred-ills formula as mythology', () => {
    expect(myths.map((myth) => myth.id)).not.toContain('myth-hundred-ills')
    expect(JSON.stringify(myths)).not.toMatch(/сто болезней|能治百病/i)
  })

  it('does not attribute a taste judgement or modern map precision to Zhao', () => {
    const yibang = regionEntry('yibang')
    const manzhuan = regionEntry('manzhuan')
    const regionText = JSON.stringify(regions)

    expect(`${yibang.description} ${manzhuan.description}`).toMatch(/чай э/i)
    expect(yibang.sourceIds).toContain('fantianlu-vol18-scan')
    expect(manzhuan.sourceIds).toContain('fantianlu-vol18-scan')
    expect(regionText).not.toContain('особо отмеченный Чжао')
    expect(regionText).not.toContain('Чжао Сюэминь перечисляет')
  })

  it('does not locate Youle east of the Lancang from the historical list alone', () => {
    expect(regionEntry('youle').description).not.toContain(
      'к востоку от Ланьцанцзяна',
    )
  })

  it('does not infer a modern eastern Xishuangbanna group for Mangzhi', () => {
    expect(regionEntry('mangzhi').description).not.toMatch(
      /восточн[а-яё]* групп[а-яё]*.*Сишуанбаньн/i,
    )
  })

  it('does not connect Mansa to later Yiwu geography without support', () => {
    expect(regionEntry('mansa').description).not.toMatch(
      /более поздн[а-яё]*[^.]*Иу/i,
    )
  })
})

describe('medical source parity', () => {
  it('uses the exact canonical caffeine and storage source sets', () => {
    const claimSources = (id: string) => rawClaims.find((claim) => claim.id === id)?.sourceIds ?? []
    expect(medicineClaims.find(({ id }) => id === 'caffeine-safety')?.sourceIds).toEqual(
      claimSources('medical-caffeine-alertness-sleep'),
    )
    const storageUnion = [
      ...new Set([
        ...claimSources('medical-food-storage-safety'),
        ...claimSources('medical-mycotoxin-evidence-limited'),
      ]),
    ]
    expect(medicineClaims.find(({ id }) => id === 'storage-safety')?.sourceIds).toEqual(storageUnion)
  })
})
