import {
  citedSources,
  furtherReadingSources,
} from '../content/citations'
import { siteEditorialReviewDate } from '../content/editorial'
import type { Source, SourcePublicationClass } from '../content/types'
import { formatSourceCount } from '../lib/formatSourceCount'

const groups: Array<{
  id: string
  title: string
  subtitle: string
  matches: (source: Source) => boolean
}> = [
  {
    id: 'primary-asian',
    title: 'Китайские исторические тексты, издания и копии',
    subtitle: 'Факсимиле, копии доступа и каталоги выполняют разные доказательные функции.',
    matches: (source) => source.group === 'primary-asian' && source.publicationClass !== 'retrospective',
  },
  {
    id: 'institutional-retrospectives',
    title: 'Институциональные ретроспективы',
    subtitle: 'Поздние музейные, ведомственные и корпоративные версии событий, а не синхронные документы.',
    matches: (source) => source.publicationClass === 'retrospective',
  },
  {
    id: 'research-asian',
    title: 'Азиатские исследователи',
    subtitle: 'История, химия, производство и безопасность из университетов региона.',
    matches: (source) => source.group === 'research-asian' && source.publicationClass === 'research',
  },
  {
    id: 'research-western',
    title: 'Западные исследования',
    subtitle: 'Историография Китая, клинические и токсикологические работы.',
    matches: (source) => source.group === 'research-western' && source.publicationClass === 'research',
  },
  {
    id: 'trial-registrations',
    title: 'Реестры исследований',
    subtitle: 'Регистрационные записи описывают план исследования, но не заменяют опубликованные результаты.',
    matches: (source) => source.publicationClass === 'trial-registration',
  },
  {
    id: 'guidance',
    title: 'Стандарты и рекомендации',
    subtitle: 'Официальные определения, географическое указание и безопасность кофеина.',
    matches: (source) => source.group === 'guidance' && source.publicationClass === 'standard-guidance',
  },
]

const publicationClassLabels: Record<SourcePublicationClass, string> = {
  'primary-text': 'Первичный текст',
  facsimile: 'Факсимиле',
  'critical-edition': 'Критическое издание',
  'print-edition-catalog': 'Печатное издание: каталогическая запись',
  'manuscript-catalog': 'Каталог рукописи; без факсимиле листа',
  'access-copy': 'Копия доступа',
  retrospective: 'Ретроспектива',
  research: 'Исследование',
  'standard-guidance': 'Стандарт или руководство',
  'trial-registration': 'Регистрация исследования; результатов нет',
  'provenance-only': 'Только редакционное происхождение',
}

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
          <p className="source-stratum__count">{formatSourceCount(entries.length)}</p>
          <h3 id={`sources-${id}-title`}>{title}</h3>
        </div>
        <p>{description}</p>
      </header>

      <div className="source-groups">
        {groups.map((group) => {
          const groupSources = entries.filter(group.matches)
          if (groupSources.length === 0) return null

          const headingId = `sources-${id}-${group.id}`
          return (
            <section className="source-group" key={group.id} aria-labelledby={headingId}>
              <header>
                <div>
                  <p className="source-group__count">
                    {formatSourceCount(groupSources.length)}
                  </p>
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
                        <span className="source-entry__class">
                          {publicationClassLabels[source.publicationClass]}
                        </span>
                        <em>{source.note}</em>
                      </span>
                      <span aria-hidden="true">↗</span>
                      <span className="visually-hidden"> (открывается в новой вкладке)</span>
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
        <h2 id="sources-title">Проверяйте нас по источникам</h2>
        <p>
          История пуэра особенно подвержена красивым повторениям. Поэтому мы отделяем
          опоры конкретных утверждений от литературы для самостоятельного продолжения.
        </p>
      </header>

      <aside className="editorial-method" aria-labelledby="editorial-method-title">
        <p className="eyebrow">
          Редакционная проверка · {siteEditorialReviewDate.display}
        </p>
        <h3 id="editorial-method-title">Как мы работаем с источниками</h3>
        <p>
          Мы сверяем, что источник поддерживает именно сформулированное утверждение,
          отмечаем ограничения и не превращаем статус автора или учреждения в гарантию
          вывода. Ссылки могут вести на полный текст, доступную копию, аннотацию, запись
          каталога или страницу издателя; доступность материалов меняется.
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

      <p className="source-link-note">
        Ссылки на источники открываются в новой вкладке.
      </p>

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
