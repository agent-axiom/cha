import { sources } from '../content/sources'
import type { SourceGroup } from '../content/types'

const groups: Array<{ id: SourceGroup; title: string; subtitle: string }> = [
  {
    id: 'primary-asian',
    title: 'Китайские первоисточники',
    subtitle: 'Тексты эпох Тан и Цин читаются в контексте своего времени.',
  },
  {
    id: 'research-asian',
    title: 'Азиатские исследователи',
    subtitle: 'История, химия, производство и безопасность из университетов региона.',
  },
  {
    id: 'research-western',
    title: 'Западные исследования',
    subtitle: 'Историография Китая, клинические и токсикологические работы.',
  },
  {
    id: 'guidance',
    title: 'Стандарты и рекомендации',
    subtitle: 'Официальные определения, географическое указание и безопасность кофеина.',
  },
]

export function SourcesSection() {
  return (
    <section className="story-section sources-section" id="sources" aria-labelledby="sources-title">
      <header className="section-heading">
        <p className="eyebrow">07 · Библиография</p>
        <h2 id="sources-title">Проверяйте нас по первоисточникам</h2>
        <p>
          История пуэра особенно подвержена красивым повторениям. Поэтому каждая
          существенная запись на этой странице ведёт к своей опоре.
        </p>
      </header>

      <div className="source-groups">
        {groups.map((group) => {
          const groupSources = sources.filter((source) => source.group === group.id)
          return (
            <section className="source-group" key={group.id} aria-labelledby={`source-${group.id}`}>
              <header>
                <div>
                  <p className="source-group__count">{groupSources.length} источников</p>
                  <h3 id={`source-${group.id}`}>{group.title}</h3>
                </div>
                <p>{group.subtitle}</p>
              </header>
              <ol>
                {groupSources.map((source) => (
                  <li key={source.id}>
                    <a href={source.href} target="_blank" rel="noreferrer">
                      <span className="source-entry__year">{source.year}</span>
                      <span>
                        <strong>{source.title}</strong>
                        <small>{source.author} · {source.origin}</small>
                        <em>{source.note}</em>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )
        })}
      </div>

      <footer className="site-footer">
        <p className="site-footer__mark" aria-hidden="true">茶</p>
        <p>Читайте медленно. Проверяйте тщательно. Заваривайте по вкусу.</p>
        <a href="#top">К началу ↑</a>
      </footer>
    </section>
  )
}
