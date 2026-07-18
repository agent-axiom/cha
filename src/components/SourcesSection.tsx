import {
  citedSources,
  furtherReadingSources,
} from '../content/citations'
import type { Source, SourceGroup } from '../content/types'

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

interface SourceStratumProps {
  id: 'cited' | 'further-reading'
  title: string
  description: string
  entries: Source[]
}

function SourceStratum({ id, title, description, entries }: SourceStratumProps) {
  return (
    <section className="source-stratum" aria-labelledby={`sources-${id}-title`}>
      <header className="source-stratum__header">
        <div>
          <p className="source-stratum__count">{entries.length} источников</p>
          <h3 id={`sources-${id}-title`}>{title}</h3>
        </div>
        <p>{description}</p>
      </header>

      <div className="source-groups">
        {groups.map((group) => {
          const groupSources = entries.filter((source) => source.group === group.id)
          if (groupSources.length === 0) return null

          const headingId = `sources-${id}-${group.id}`
          return (
            <section className="source-group" key={group.id} aria-labelledby={headingId}>
              <header>
                <div>
                  <p className="source-group__count">{groupSources.length} источников</p>
                  <h4 id={headingId} aria-label={`${group.title} — ${title}`}>
                    {group.title}
                  </h4>
                </div>
                <p>{group.subtitle}</p>
              </header>
              <ol>
                {groupSources.map((source) => (
                  <li key={source.id} data-source-id={source.id}>
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
    </section>
  )
}

export function SourcesSection() {
  return (
    <section className="story-section sources-section" id="sources" aria-labelledby="sources-title">
      <header className="section-heading">
        <p className="eyebrow">07 · Библиография</p>
        <h2 id="sources-title">Проверяйте нас по первоисточникам</h2>
        <p>
          История пуэра особенно подвержена красивым повторениям. Поэтому мы отделяем
          опоры конкретных утверждений от литературы для самостоятельного продолжения.
        </p>
      </header>

      <aside className="editorial-method" aria-labelledby="editorial-method-title">
        <p className="eyebrow">Редакционная проверка · 18 июля 2026</p>
        <h3 id="editorial-method-title">Как мы работаем с источниками</h3>
        <p>
          В библиографию входят проверенные и доступные читателю материалы. Мы сверяем,
          что источник поддерживает именно сформулированное утверждение, отмечаем
          ограничения и не превращаем статус автора или учреждения в гарантию вывода.
        </p>
        <dl>
          <div>
            <dt>История</dt>
            <dd>
              Различаем исторический источник, позднее ретроспективное свидетельство и
              современное исследование. Ссылка может вести на доступную цифровую копию,
              а не на оригинал рукописи или первое издание.
            </dd>
          </div>
          <div>
            <dt>Медицина</dt>
            <dd>
              Называем тип данных: историческое свидетельство, химический анализ,
              доклиническая модель, исследование на людях, руководство или контроль
              качества. Эти категории описывают данные, а не складываются в числовой
              рейтинг пользы.
            </dd>
          </div>
          <div>
            <dt>Границы вывода</dt>
            <dd>
              Стандарт и официальное руководство отвечают не на тот же вопрос, что
              исследование или контроль качества. Отсутствие найденных доказательств не
              доказывает отсутствия эффекта или риска.
            </dd>
          </div>
        </dl>
      </aside>

      <div className="source-strata">
        <SourceStratum
          id="cited"
          title="Цитируются на этой странице"
          description="Эти материалы прямо поддерживают записи истории, мифологии, карты, технологии, ферментации или медицинского раздела."
          entries={citedSources}
        />
        <SourceStratum
          id="further-reading"
          title="Дальнейшее чтение"
          description="Проверенные материалы, которые расширяют тему, но не служат прямой опорой утверждений на этой версии страницы."
          entries={furtherReadingSources}
        />
      </div>

      <footer className="site-footer">
        <p className="site-footer__mark" aria-hidden="true">茶</p>
        <p>Читайте медленно. Проверяйте тщательно. Заваривайте по вкусу.</p>
        <a href="#top">К началу ↑</a>
      </footer>
    </section>
  )
}
