import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TeaMountainsMap } from './TeaMountainsMap'

describe('TeaMountainsMap', () => {
  it('attributes the Yibang taste note to Chai E rather than Zhao Xueming', async () => {
    const user = userEvent.setup()
    render(<TeaMountainsMap />)

    await user.click(screen.getByRole('button', { name: /ибан/i }))

    expect(screen.getByRole('heading', { name: /ибан/i })).toBeInTheDocument()
    expect(screen.getByText(/чай э.*1926/i, { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /чай э/i })).toBeInTheDocument()
    expect(screen.queryByText(/особо отмеченный чжао/i)).not.toBeInTheDocument()
  })

  it(
    'does not present a general historical taste phrase as Zhao\'s Manzhuan tasting note',
    async () => {
      const user = userEvent.setup()
      render(<TeaMountainsMap />)

      await user.click(screen.getByRole('button', { name: /маньчжуань/i }))

      expect(
        screen.getByRole('heading', { name: /маньчжуань/i }),
      ).toBeInTheDocument()
      expect(screen.getByText(/формула о вкусе.*чай э/i)).toBeInTheDocument()
      expect(
        screen.queryByText(/особо отмеченный чжао/i),
      ).not.toBeInTheDocument()
    },
  )
})
