import { useState } from 'react'

const sections = [
  ['history', 'Время'],
  ['myths', 'Мифология'],
  ['geography', 'Горы'],
  ['craft', 'Два пути'],
  ['science', 'Водуй'],
  ['medicine', 'Медицина'],
  ['sources', 'Источники'],
]

export function SiteHeader() {
  const [isContentsOpen, setIsContentsOpen] = useState(false)

  return (
    <header className="site-header">
      <a className="site-header__brand" href="#top" aria-label="Пуэр — к началу страницы">
        <span aria-hidden="true">普</span>
        <span>PU·ER</span>
      </a>
      <button
        className="site-header__contents"
        type="button"
        aria-expanded={isContentsOpen}
        aria-controls="site-sections"
        onClick={() => setIsContentsOpen((open) => !open)}
      >
        <span>Содержание</span>
        <span aria-hidden="true">{isContentsOpen ? '×' : '☰'}</span>
      </button>
      <nav id="site-sections" aria-label="Разделы" data-open={isContentsOpen}>
        <ul>
          {sections.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={() => setIsContentsOpen(false)}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
