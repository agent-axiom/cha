import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EvidenceSection } from './EvidenceSection'

describe('EvidenceSection', () => {
  it('filters human research without hiding the medical boundary', async () => {
    const user = userEvent.setup()
    render(<EvidenceSection />)

    await user.click(screen.getByRole('button', { name: /исследования на людях/i }))

    expect(screen.getByText(/небольшие испытания экстрактов/i)).toBeInTheDocument()
    expect(screen.getByText(/чай не заменяет медицинскую помощь/i)).toBeInTheDocument()
  })
})
