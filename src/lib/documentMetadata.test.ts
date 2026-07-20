import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'

describe('document metadata', () => {
  it('states the online-companion product contract in the title and description', () => {
    expect(html).toMatch(/<title>Пуэр\. Живая гора — онлайн-компаньон<\/title>/u)
    expect(html).toMatch(
      /name="description"[\s\S]*content="Онлайн-компаньон к книге «Пуэр\. Живая гора»[^"]*шэн и шу[^"]*легенд[^"]*медицин/u,
    )
    expect(html).toMatch(
      /name="twitter:description"[\s\S]*content="Онлайн-компаньон[^"]*шэн и шу[^"]*легенд[^"]*медицин/u,
    )
    expect(html).toMatch(
      /"headline": "Пуэр\. Живая гора — онлайн-компаньон"[\s\S]*"description": "Онлайн-компаньон[^"]*шэн и шу[^"]*легенд[^"]*медицин/u,
    )
  })
})
