import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

afterEach(() => {
  cleanup()
  document.body.removeAttribute('data-tea')
})
