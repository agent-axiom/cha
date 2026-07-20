import { describe, expect, it } from 'vitest'
import experienceCss from '../styles/experience.css?raw'
import responsiveCss from '../styles/responsive.css?raw'

describe('responsive interaction CSS', () => {
  it('releases mobile navigation from desktop paint containment', () => {
    expect(experienceCss).toMatch(/\.site-header\s*\{[^}]*contain:\s*paint/u)
    expect(responsiveCss).toMatch(
      /@media \(max-width: 680px\)[\s\S]*\.site-header\s*\{[^}]*contain:\s*none/u,
    )
  })

  it('draws an explicit rotating disclosure affordance', () => {
    expect(experienceCss).toMatch(
      /\.disclosure-chevron::before\s*\{[^}]*content:\s*['"]›['"]/u,
    )
    expect(experienceCss).toMatch(
      /details\[open\][^}]*\.disclosure-chevron[^}]*transform:\s*rotate\(90deg\)/u,
    )
  })
})
