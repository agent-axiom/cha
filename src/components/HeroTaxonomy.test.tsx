import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Hero } from './Hero'

describe('Puer classification boundary in the hero', () => {
  it('presents heicha as a disputed classification rather than an automatic result of aging', () => {
    const { container } = render(
      <Hero teaPath="sheng" onTeaPathChange={vi.fn()} />,
    )
    const text = container.textContent ?? ''

    expect(text).toMatch(/классификация пуэра спорна/i)
    expect(text).toMatch(/GB\/T 22111.*объединяет.*шэн.*шу.*пуэр/i)
    expect(text).toMatch(/хэй ча.*зависит от принятой системы.*прежде всего.*шу/i)
    expect(text).toMatch(
      /выдержка сама по себе.*не превращает шэн.*шу.*иную технологическую категорию/i,
    )
    expect(text).not.toMatch(/выдержанн.*относят к.*хэй ча/i)

    expect(
      container.querySelector(
        'a[href^="https://nync.yn.gov.cn/html/2018/tianjianyibanli2018_0612/375055.html"]',
      ),
    ).not.toBeNull()
    expect(
      container.querySelector(
        'a[href^="https://openstd.samr.gov.cn/bzgk/std/newGbInfo"]',
      ),
    ).not.toBeNull()
  })
})
