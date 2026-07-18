import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { medicineClaims } from '../content/medicine'
import { EvidenceSection } from './EvidenceSection'

describe('EvidenceSection', () => {
  it('uses named evidence metadata instead of a numeric score', () => {
    expect(medicineClaims).not.toHaveLength(0)

    for (const claim of medicineClaims) {
      expect(claim).toMatchObject({
        evidenceType: expect.any(String),
        evidenceLabel: expect.any(String),
        productForm: expect.any(String),
        applicability: expect.any(String),
        limitations: expect.any(String),
        kind: expect.any(String),
      })
      expect(claim).not.toHaveProperty('evidenceLevel')
    }

    expect(new Set(medicineClaims.map((claim) => claim.evidenceType))).toEqual(
      new Set([
        'historical',
        'chemistry',
        'preclinical',
        'human',
        'guidance',
        'quality-control',
      ]),
    )
  })

  it('shows the evidence type, product form, cup applicability, and limitation on every card', () => {
    render(<EvidenceSection />)

    expect(screen.queryAllByText(/^уровень$/i)).toHaveLength(0)
    expect(screen.queryAllByText(/^\d\/5$/)).toHaveLength(0)

    for (const claim of medicineClaims) {
      const card = screen
        .getByRole('heading', { name: claim.title })
        .closest('article')

      expect(card).toHaveAttribute('data-evidence-type', claim.evidenceType)
      expect(card).toHaveTextContent('Тип данных')
      expect(card).toHaveTextContent(claim.evidenceLabel)
      expect(card).toHaveTextContent('Форма продукта')
      expect(card).toHaveTextContent(claim.productForm)
      expect(card).toHaveTextContent('Применимость к обычной чашке')
      expect(card).toHaveTextContent(claim.applicability)
      expect(card).toHaveTextContent('Ключевое ограничение')
      expect(card).toHaveTextContent(claim.limitations)
    }
  })

  it('places the review date and non-individual boundary above the cards', () => {
    render(<EvidenceSection />)

    const boundary = screen.getByText(/не индивидуальная рекомендация/i)
    const reviewDate = screen.getByText(/17 июля 2026/i)
    const firstCard = screen.getAllByRole('article')[0]
    const finalCaveat = screen.getByRole('complementary', {
      name: /важное медицинское предупреждение/i,
    })

    expect(
      boundary.compareDocumentPosition(firstCard) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      reviewDate.compareDocumentPosition(firstCard) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      firstCard.compareDocumentPosition(finalCaveat) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(document.body).toHaveTextContent(/внешняя медицинская рецензия:\s*не получена/i)
    expect(document.body).toHaveTextContent(/внешних одобрений:\s*0/i)
  })

  it('filters cards by named evidence types', async () => {
    const user = userEvent.setup()
    render(<EvidenceSection />)

    const visibleTypes = () =>
      screen
        .getAllByRole('article')
        .map((card) => card.getAttribute('data-evidence-type'))

    await user.click(screen.getByRole('button', { name: 'Исторические' }))
    expect(visibleTypes()).toEqual(['historical'])

    await user.click(screen.getByRole('button', { name: 'Лаборатория' }))
    expect(visibleTypes()).toEqual(['chemistry', 'preclinical'])

    await user.click(screen.getByRole('button', { name: 'Люди' }))
    expect(visibleTypes()).toEqual(['human'])

    await user.click(screen.getByRole('button', { name: 'Безопасность' }))
    expect(visibleTypes()).toEqual(['guidance', 'guidance', 'quality-control'])
  })

  it('states the limitations of the human extract trials', async () => {
    const user = userEvent.setup()
    render(<EvidenceSection />)

    await user.click(screen.getByRole('button', { name: 'Люди' }))

    const card = screen
      .getByRole('heading', { name: /небольшие испытания экстрактов/i })
      .closest('article')

    expect(card).toHaveTextContent(/изучали экстракты/i)
    expect(card).toHaveTextContent(/небольшие и краткие исследования/i)
    expect(card).toHaveTextContent(/преимущественно суррогатные исходы/i)
    expect(card).toHaveTextContent(/не дают основания рекомендовать.*для похудения/i)
    expect(card).toHaveTextContent(/Jensen.*выбыв/i)
    expect(card).toHaveTextContent(/спонсор/i)
    expect(card).toHaveTextContent(/конфликт интересов/i)
    expect(screen.getByText(/чай не заменяет медицинскую помощь/i)).toBeInTheDocument()
  })

  it('keeps WHO and EFSA pregnancy contexts distinct', async () => {
    const user = userEvent.setup()
    render(<EvidenceSection />)

    await user.click(screen.getByRole('button', { name: 'Безопасность' }))

    const card = screen
      .getByRole('heading', { name: /беременность требует отдельной осторожности/i })
      .closest('article')

    expect(card).toHaveTextContent(/ВОЗ.*более 300 мг.*снижать высокое потребление/i)
    expect(card).toHaveTextContent(/EFSA.*до 200 мг/i)
    expect(card).toHaveTextContent(/суммарный кофеин из всех источников/i)
    expect(card).toHaveTextContent(/не.*персональной гарантией/i)
  })

  it('describes the limits of sensory storage checks on the site', async () => {
    const user = userEvent.setup()
    render(<EvidenceSection />)

    await user.click(screen.getByRole('button', { name: 'Безопасность' }))

    const card = screen
      .getByRole('heading', { name: /благородная выдержка/i })
      .closest('article')

    const content = card?.textContent ?? ''
    expect(content).toMatch(/сенсорный осмотр.*очевидную порчу/is)
    expect(content).toMatch(/нормальный (?:вид|внешний вид).*запах.*не доказыва/is)
    expect(content).toMatch(/отсутствия микотоксинов/i)
    expect(content).toMatch(/промывка.*кипяток.*не.*лабораторным контролем/is)
  })
})
