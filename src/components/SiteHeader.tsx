const sections = [
  ['history', 'Время'],
  ['geography', 'Горы'],
  ['craft', 'Два пути'],
  ['science', 'Ферментация'],
  ['medicine', 'Медицина'],
  ['myths', 'Мифология'],
  ['sources', 'Источники'],
]

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="site-header__brand" href="#top" aria-label="Пуэр — к началу страницы">
        <span aria-hidden="true">普</span>
        <span>PU·ER</span>
      </a>
      <nav aria-label="Разделы">
        <ul>
          {sections.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`}>{label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
