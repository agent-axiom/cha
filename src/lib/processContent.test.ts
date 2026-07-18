import { describe, expect, it } from 'vitest'
import { fermentationLayers, processSteps } from '../content/process'

const canonicalSharedChain = ['鲜叶', '摊青', '杀青', '揉捻', '解块', '日光干燥', '晒青毛茶']

function chineseTerm(chinese: string | undefined) {
  return chinese?.split(' · ')[0]
}

describe('process content', () => {
  it.each(['sheng', 'shou'] as const)('uses the exact canonical shared chain for %s', (path) => {
    const sharedChain = processSteps
      .filter((step) => step.path === path)
      .slice(0, canonicalSharedChain.length)

    expect(sharedChain.map((step) => chineseTerm(step.chinese))).toEqual(canonicalSharedChain)
    expect(sharedChain.map((step) => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('names maocha as sun-dried raw tea and does not assert hand-picking', () => {
    const text = processSteps.map((step) => `${step.title} ${step.summary} ${step.transformation}`).join(' ')
    const maocha = processSteps.find((step) => step.id === 'sheng-maocha')

    expect(maocha?.summary).toMatch(/шайцин-маоча/i)
    expect(maocha?.summary).toMatch(/чай-сырец солнечной сушки/i)
    expect(text).not.toMatch(/ворсистый чай/i)
    expect(text).not.toMatch(/собирают вручную/i)
    expect(text).toMatch(/способ сбора сам по себе не определяет технологическую категорию/i)
  })

  it('keeps wodui exclusive to shou and records the complete ordered handling sequence', () => {
    const shengText = processSteps
      .filter((step) => step.path === 'sheng')
      .map((step) => `${step.title} ${step.chinese} ${step.summary} ${step.transformation}`)
      .join(' ')
    const shouWodui = processSteps.find((step) => step.id === 'shou-wodui')
    const sequence = `${shouWodui?.summary ?? ''} ${shouWodui?.transformation ?? ''}`

    expect(shengText).not.toMatch(/водуй|渥堆|wòduī/i)
    expect(shouWodui).toBeDefined()
    expect(sequence).toMatch(/увлажняют[\s\S]*формируют кучу[\s\S]*укрывают[\s\S]*ведут[\s\S]*переворачивают[\s\S]*разбивают комки/i)

    const sortStep = processSteps.find((step) => step.id === 'shou-sort')
    expect(sortStep?.summary).toMatch(/сушат[\s\S]*сортируют/i)
  })

  it('uses bounded formulations for process effects and storage', () => {
    const text = processSteps.map((step) => `${step.summary} ${step.transformation}`).join(' ')

    expect(text).toMatch(/в исследованиях наблюдались совместные изменения/i)
    expect(text).toMatch(/может меняться; направление зависит от партии и условий/i)
    expect(text).not.toMatch(/тепло формирует основу аромата/i)
    expect(text).not.toMatch(/слишком сильное воздействие делает вкус грубее/i)
    expect(text).not.toMatch(/ускоряют/i)
    expect(text).not.toMatch(/смягчить аромат/i)
    expect(text).not.toMatch(/отдельный ботанический вид/i)
  })

  it('does not infer a process route from pressed or loose form', () => {
    const formStep = processSteps.find((step) => step.id === 'shou-press')

    expect(formStep?.transformation).toMatch(/форма не меняет технологическую категорию/i)
    expect(formStep?.transformation).toMatch(/не доказывает технологический маршрут/i)
  })

  it('separates a wodui community, laboratory detection, and visible mold damage', () => {
    const microbes = fermentationLayers.find((layer) => layer.id === 'microbes')

    expect(microbes?.description).toMatch(/управляемых условиях водуй/i)
    expect(microbes?.description).toMatch(/лабораторное обнаружение грибного таксона/i)
    expect(microbes?.description).toMatch(/видимый рост плесени на готовом чае — признак повреждения/i)
    expect(microbes?.description).toMatch(/отказаться от пробы/i)
  })

  it('describes research associations without a universal molecule-to-flavor chain', () => {
    const chemistry = fermentationLayers.find((layer) => layer.id === 'chemistry')

    expect(chemistry?.title).toMatch(/совместные изменения состава/i)
    expect(chemistry?.description).toMatch(/в исследованиях влажного кучевания шу наблюдались совместные изменения/i)
    expect(chemistry?.description).toMatch(/направление зависит от партии и условий/i)
    expect(chemistry?.description).not.toMatch(/формируя[\s\S]*(мягкость|землист)/i)
  })
})
