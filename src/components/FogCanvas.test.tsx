import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FogCanvas } from './FogCanvas'

describe('FogCanvas', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not animate when reduced motion is requested', () => {
    const requestAnimationFrame = vi.fn()

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )

    const { container } = render(<FogCanvas />)

    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })
})
