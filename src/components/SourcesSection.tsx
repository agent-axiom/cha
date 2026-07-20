import {
  citedSources,
  furtherReadingSources,
} from '../content/citations'
import { siteEditorialReviewDate } from '../content/editorial'
import {
  sourceDocumentClassLabels,
  sourceEvidenceRoleLabels,
} from '../content/sources'
import type { Source } from '../content/types'
import { formatSourceCount } from '../lib/formatSourceCount'
import { DisclosureChevron } from './DisclosureChevron'
import { SectionTakeaway } from './SectionTakeaway'

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
    matches: (source) => source.group === 'primary-asian' && [
      'primary-text',
      'textual-witness',
      'catalog-provenance',
      'disputed-retrospective-attribution',
    ].includes(source.evidenceRole),
  },
  {
    id: 'institutional-retrospectives',
    title: 'Институциональные ретроспективы',
    subtitle: 'Поздние музейные, ведомственные и корпоративные версии событий, а не синхронные документы.',
    matches: (source) => [
      'institutional-retrospective',
      'corporate-retrospective',
    ].includes(source.evidenceRole),
  },
  {
    id: 'research-asian',
    title: 'Азиатские исследователи',
    subtitle: 'История, химия, производство и безопасность из университетов региона.',
    matches: (source) => source.group === 'research-asian' && source.evidenceRole === 'research-evidence',
  },
  {
    id: 'research-western',
    title: 'Западные исследования',
    subtitle: 'Историография Китая, клинические и токсикологические работы.',
    matches: (source) => source.group === 'research-western' && source.evidenceRole === 'research-evidence',
  },
  {
    id: 'trial-registrations',
    title: 'Реестры исследований',
    subtitle: 'Регистрационные записи описывают план исследования, но не заменяют опубликованные результаты.',
    matches: (source) => source.evidenceRole === 'trial-registry-record',
  },
  {
    id: 'guidance',
    title: 'Стандарты и рекомендации',
    subtitle: 'Официальные определения, географическое указание и безопасность кофеина.',
    matches: (source) => source.group === 'guidance' && [
      'normative-standard',
      'safety-guidance',
      'contextual-institutional-record',
    ].includes(source.evidenceRole),
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
    <details
      className="source-stratum"
      aria-labelledby={`sources-${id}-title`}
      open={id === 'cited'}
    >
      <summary className="source-stratum__header">
        <span className="source-stratum__heading">
          <span className="source-stratum__count">{formatSourceCount(entries.length)}</span>
          <span
            className="source-stratum__title"
            id={`sources-${id}-title`}
            role="heading"
            aria-level={3}
          >
            {title}
          </span>
        </span>
        <span className="source-stratum__description">{description}</span>
        <DisclosureChevron />
      </summary>

      <div className="source-groups">
        {groups.map((group) => {
          const groupSources = entries.filter(group.matches)
          if (groupSources.length === 0) return null

          const headingId = `sources-${id}-${group.id}`
          return (
            <details
              className="source-group"
              key={group.id}
              aria-labelledby={headingId}
              open={id === 'cited'}
            >
              <summary>
                <span className="source-group__heading">
                  <span className="source-group__count">
                    {formatSourceCount(groupSources.length)}
                  </span>
                  <span
                    className="source-group__title"
                    id={headingId}
                    role="heading"
                    aria-level={4}
                    aria-label={`${group.title} — ${title}`}
                  >
                    {group.title}
                  </span>
                </span>
                <span className="source-group__description">{group.subtitle}</span>
                <DisclosureChevron />
              </summary>
              <ol>
                {groupSources.map((source) => (
                  <li key={source.id} data-source-id={source.id}>
                    <a href={source.href} target="_blank" rel="noreferrer">
                      <span className="source-entry__year">{source.year}</span>
                      <span>
                        <strong>{source.title}</strong>
                        <small>{source.author} · {source.origin}</small>
                        <span className="source-entry__class">
                          <span>Вид документа: {sourceDocumentClassLabels.get(source.documentClass)}</span>
                          <span>Роль в книге: {sourceEvidenceRoleLabels.get(source.evidenceRole)}</span>
                        </span>
                        <em>{source.note}</em>
                      </span>
                      <span aria-hidden="true">↗</span>
                      <span className="visually-hidden"> (открывается в новой вкладке)</span>
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          )
        })}
      </div>
    </details>
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

      <SectionTakeaway
        title="Как проверить утверждение"
        className="section-takeaway--conclusion"
      >
        <p>
          Откройте ссылку рядом с нужным тезисом. Сопоставьте вид документа,
          его роль и точный фрагмент, если он указан.
        </p>
      </SectionTakeaway>

      <footer className="site-footer">
        <p className="site-footer__mark" aria-hidden="true">茶</p>
        <p>Читайте медленно. Проверяйте тщательно. Заваривайте по вкусу.</p>
        <a href="#top">К началу ↑</a>
      </footer>
    </section>
  )
}
