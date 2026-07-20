import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { processSteps } from '../content/process'
import { sourceById } from '../content/sources'
import { sourceCitationLabel } from './SourceCitation'
import { ProcessFork } from './ProcessFork'

describe('ProcessFork', () => {
  it('renders the shared maocha sequence once before branch-only steps', () => {
    render(<ProcessFork selectedPath="sheng" />)

    const shared = screen.getByRole('list', { name: /общие этапы до шайцин-маоча/i })
    const sheng = screen.getByRole('list', { name: /этапы шэн/i })
    const shou = screen.getByRole('list', { name: /этапы шу/i })

    expect(within(shared).getAllByRole('listitem')).toHaveLength(7)
    expect(within(sheng).getAllByRole('listitem')).toHaveLength(2)
    expect(within(shou).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getAllByRole('heading', { name: 'Свежий лист' })).toHaveLength(1)
    expect(within(sheng).queryByRole('heading', { name: 'Свежий лист' })).not.toBeInTheDocument()
    expect(within(shou).queryByRole('heading', { name: 'Свежий лист' })).not.toBeInTheDocument()
  })

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

  it.each(['sheng', 'shou'] as const)('exposes every source used by both visible paths when %s is selected', (path) => {
    render(<ProcessFork selectedPath={path} />)

    const sourceLinks = screen.getByLabelText('Источники всех отображаемых технологических ветвей')
    const expectedSourceIds = [
      ...new Set(processSteps.flatMap((step) => step.sourceIds)),
    ]

    expect(within(sourceLinks).getAllByRole('link')).toHaveLength(expectedSourceIds.length)
    expect(sourceLinks).toHaveAccessibleName('Источники всех отображаемых технологических ветвей')

    expectedSourceIds.forEach((sourceId) => {
      const source = sourceById.get(sourceId)
      expect(source, `missing site source ${sourceId}`).toBeDefined()
      const label = source ? sourceCitationLabel(source) : ''
      expect(within(sourceLinks).getByRole('link', {
        name: (accessibleName) => accessibleName.startsWith(label),
      })).toHaveAttribute(
        'href',
        source?.href,
      )
    })
  })

  it('does not mark every item in the selected branch as the current step', () => {
    const { container } = render(<ProcessFork selectedPath="sheng" />)

    expect(container.querySelectorAll('li[aria-current]')).toHaveLength(0)
  })

  it('highlights one complete branch without hiding or disabling the other', () => {
    const { container } = render(<ProcessFork selectedPath="shou" />)

    const sheng = container.querySelector<HTMLElement>('.process-path--sheng')
    const shou = container.querySelector<HTMLElement>('.process-path--shou')
    expect(sheng).toHaveAttribute('data-highlighted', 'false')
    expect(shou).toHaveAttribute('data-highlighted', 'true')
    expect(sheng).not.toHaveAttribute('hidden')
    expect(shou).not.toHaveAttribute('hidden')
    expect(screen.getByRole('list', { name: /этапы шэн/i })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /этапы шу/i })).toBeInTheDocument()
  })
})
