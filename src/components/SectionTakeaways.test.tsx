import { render, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../App'

const expectedTakeaways = [
  {
    sectionId: 'history',
    title: 'Что унести из истории',
    copy: 'Смотрите не только на дату, но и на тип свидетельства',
  },
  {
    sectionId: 'myths',
    title: 'Как читать предание',
    copy: 'Сохраняйте культурный смысл сюжета, не превращая его в доказательство',
  },
  {
    sectionId: 'geography',
    title: 'Что говорит название горы',
    copy: 'Название указывает на культурную и торговую географию',
  },
  {
    sectionId: 'craft',
    title: 'Главное о развилке',
    copy: 'Сначала идёт общий путь до шайцин-маоча',
  },
  {
    sectionId: 'science',
    title: 'Что объясняет модель',
    copy: 'Обнаруженный таксон не равен видимой плесени',
  },
  {
    sectionId: 'medicine',
    title: 'Как читать обещание о пользе',
    copy: 'Результат экстракта или суррогатный исход не обещает эффект обычной чашки',
  },
  {
    sectionId: 'sources',
    title: 'Как проверить утверждение',
    copy: 'Сопоставьте вид документа, его роль и точный фрагмент',
  },
] as const

describe('substantive section takeaways', () => {
  it('closes all seven substantive sections with one concise outcome', () => {
    const { container } = render(<App />)

    for (const expected of expectedTakeaways) {
      const section = container.querySelector<HTMLElement>(`#${expected.sectionId}`)
      expect(section).not.toBeNull()
      const takeaway = within(section as HTMLElement).getByRole('complementary', {
        name: expected.title,
      })
      expect(takeaway).toHaveTextContent(expected.copy)
      expect(
        section?.querySelectorAll(':scope > .section-takeaway--conclusion'),
      ).toHaveLength(1)
    }

    expect(
      container.querySelectorAll('main > section > .section-takeaway--conclusion'),
    ).toHaveLength(7)
  })

  it('places each conclusion at the end of its substantive section content', () => {
    const { container } = render(<App />)

    for (const { sectionId } of expectedTakeaways) {
      const section = container.querySelector<HTMLElement>(`#${sectionId}`)
      const takeaway = section?.querySelector('.section-takeaway--conclusion')
      if (sectionId === 'sources') {
        expect(takeaway?.nextElementSibling).toHaveClass('site-footer')
      } else {
        expect(section?.lastElementChild).toBe(takeaway)
      }
    }
  })
})
