import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FermentationLab } from './FermentationLab'

describe('FermentationLab', () => {
  it('bounds the model to wet piling of shou without presenting it as microscopy', () => {
    render(<FermentationLab />)

    expect(screen.getByRole('heading', { name: /влажное кучевание шу/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /схематическая модель влажного кучевания шу — водуй/i })).toBeInTheDocument()
    expect(screen.getAllByText(/не микрофотография/i)).toHaveLength(2)
    expect(screen.queryByText(/невидимые мастера/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /ферментация пуэра/i })).not.toBeInTheDocument()
  })

  it('keeps its layer controls interactive and exposes their pressed state', async () => {
    const user = userEvent.setup()
    render(<FermentationLab />)

    const chemistry = screen.getByRole('button', { name: /химические изменения/i })
    expect(chemistry).toHaveAttribute('aria-pressed', 'false')

    await user.click(chemistry)

    expect(chemistry).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: /совместные изменения состава/i })).toBeInTheDocument()
  })
})
