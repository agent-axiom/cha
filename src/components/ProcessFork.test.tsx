import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { processSteps } from '../content/process'
import { sourceById } from '../content/sources'
import { ProcessFork } from './ProcessFork'

describe('ProcessFork', () => {
  it('keeps wet piling exclusive to the shou path', () => {
    render(<ProcessFork selectedPath="sheng" />)

    const sheng = screen.getByRole('list', { name: /этапы шэн/i })
    const shou = screen.getByRole('list', { name: /этапы шу/i })

    expect(within(sheng).queryByText(/влажное кучевание/i)).not.toBeInTheDocument()
    expect(within(shou).getByText(/влажное кучевание/i)).toBeInTheDocument()
  })

  it('describes controlled sheng storage without prescribing an aging period', () => {
    render(<ProcessFork selectedPath="sheng" />)

    const sheng = screen.getByRole('list', { name: /этапы шэн/i })

    expect(within(sheng).getByText(/поступает в контролируемое хранение/i)).toBeInTheDocument()
    expect(within(sheng).getByText(/обязательного срока нет/i)).toBeInTheDocument()
    expect(screen.queryByText(/долгое открытое время/i)).not.toBeInTheDocument()
  })

  it('states that wetting precedes pile formation in shou wodui', () => {
    render(<ProcessFork selectedPath="shou" />)

    const shou = screen.getByRole('list', { name: /этапы шу/i })
    const woduiStep = within(shou).getByText(/влажное кучевание/i).closest('li')

    expect(woduiStep).not.toBeNull()

    const wording = woduiStep?.textContent ?? ''
    expect(wording).toMatch(/увлажняют[\s\S]*формируют кучу[\s\S]*укрывают/i)
    expect(wording).toMatch(/ведут[\s\S]*переворачивают[\s\S]*разбивают комки/i)
  })

  it.each(['sheng', 'shou'] as const)('exposes every source used by the selected %s path', (path) => {
    render(<ProcessFork selectedPath={path} />)

    const sourceLinks = screen.getByLabelText(/источники технологии/i)
    const expectedSourceIds = [
      ...new Set(
        processSteps
          .filter((step) => step.path === path)
          .flatMap((step) => step.sourceIds),
      ),
    ]

    expect(within(sourceLinks).getAllByRole('link')).toHaveLength(expectedSourceIds.length)

    expectedSourceIds.forEach((sourceId) => {
      const source = sourceById.get(sourceId)
      expect(source, `missing site source ${sourceId}`).toBeDefined()
      expect(within(sourceLinks).getByRole('link', { name: source?.author })).toHaveAttribute(
        'href',
        source?.href,
      )
    })
  })

  it('does not mark every item in the selected branch as the current step', () => {
    const { container } = render(<ProcessFork selectedPath="sheng" />)

    expect(container.querySelectorAll('li[aria-current]')).toHaveLength(0)
  })
})
