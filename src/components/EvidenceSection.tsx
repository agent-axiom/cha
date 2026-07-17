import { useState } from 'react'
import { medicineClaims } from '../content/medicine'
import { sourceById } from '../content/sources'

type EvidenceFilter = 'all' | 'historical' | 'preclinical' | 'human' | 'safety'

const filters: Array<{ id: EvidenceFilter; label: string }> = [
  { id: 'all', label: 'Вся картина' },
  { id: 'historical', label: 'Старинные тексты' },
  { id: 'preclinical', label: 'Лаборатория и животные' },
  { id: 'human', label: 'Исследования на людях' },
  { id: 'safety', label: 'Безопасность' },
]

function matchesFilter(filter: EvidenceFilter, level: number, kind: string) {
  if (filter === 'all') return true
  if (filter === 'historical') return kind === 'historical'
  if (filter === 'preclinical') return level === 2 || level === 3
  if (filter === 'human') return level === 4
  return kind === 'safety'
}

export function EvidenceSection() {
  const [filter, setFilter] = useState<EvidenceFilter>('all')
  const visibleClaims = medicineClaims.filter((claim) =>
    matchesFilter(filter, claim.evidenceLevel, claim.kind),
  )

  return (
    <section className="story-section evidence-section" id="medicine" aria-labelledby="evidence-title">
      <header className="section-heading section-heading--split">
        <div>
          <p className="eyebrow">05 · Медицина</p>
          <h2 id="evidence-title">Что изучают — и чего ещё не знают</h2>
        </div>
        <p>
          Лабораторный эффект, исследование экстракта и польза чашки чая — не
          одно и то же. Фильтр показывает, на каком уровне находится вывод.
        </p>
      </header>

      <div className="evidence-filters" role="group" aria-label="Фильтр медицинских данных">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="evidence-grid" aria-live="polite">
        {visibleClaims.map((claim) => (
          <article className={`evidence-card evidence-card--${claim.kind}`} key={claim.id}>
            <div className="evidence-card__level">
              <span>Уровень</span>
              <strong>{claim.evidenceLevel}/5</strong>
            </div>
            <p className="eyebrow">{claim.evidenceLabel}</p>
            <h3>{claim.title}</h3>
            <p>{claim.summary}</p>
            <div className="source-links" aria-label="Источники медицинской записи">
              {claim.sourceIds.map((sourceId) => {
                const source = sourceById.get(sourceId)
                if (!source) return null
                return (
                  <a key={sourceId} href={source.href} target="_blank" rel="noreferrer">
                    {source.author}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                )
              })}
            </div>
          </article>
        ))}
      </div>

      <aside className="medical-boundary" aria-label="Важное медицинское предупреждение">
        <span aria-hidden="true">✦</span>
        <div>
          <h3>Чай не заменяет медицинскую помощь</h3>
          <p>
            При заболеваниях, беременности, приёме лекарств или выраженной
            чувствительности к кофеину обсудите напиток с медицинским специалистом.
          </p>
        </div>
      </aside>
    </section>
  )
}

