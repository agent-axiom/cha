import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { TeaPathSwitch } from './TeaPathSwitch'

it('switches from sheng to shou with an accessible pressed state', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  const { rerender } = render(
    <TeaPathSwitch value="sheng" onChange={onChange} />,
  )

  await user.click(screen.getByRole('button', { name: /шу/i }))
  expect(onChange).toHaveBeenCalledWith('shou')

  rerender(<TeaPathSwitch value="shou" onChange={onChange} />)
  expect(screen.getByRole('button', { name: /шу/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
