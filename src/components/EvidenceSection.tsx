import { useState } from 'react'
import { medicineClaims } from '../content/medicine'
import { sourceById } from '../content/sources'
import type { MedicalEvidenceType } from '../content/types'
import { InlineDefinition } from './InlineDefinition'
import { SectionTakeaway } from './SectionTakeaway'
import { SourceCitation } from './SourceCitation'

type EvidenceFilter = 'all' | 'historical' | 'laboratory' | 'human' | 'safety'

const filters: Array<{ id: EvidenceFilter; label: string }> = [
  { id: 'all', label: 'Вся картина' },
  { id: 'historical', label: 'Исторические' },
  { id: 'laboratory', label: 'Лаборатория' },
  { id: 'human', label: 'Люди' },
  { id: 'safety', label: 'Безопасность' },
]

const evidenceTypesByFilter: Record<
  Exclude<EvidenceFilter, 'all'>,
  readonly MedicalEvidenceType[]
> = {
  historical: ['historical'],
  laboratory: ['chemistry', 'preclinical'],
  human: ['human'],
  safety: ['guidance', 'quality-control'],
}

function matchesFilter(filter: EvidenceFilter, evidenceType: MedicalEvidenceType) {
  if (filter === 'all') return true
  return evidenceTypesByFilter[filter].includes(evidenceType)
}

export function EvidenceSection() {
  const [filter, setFilter] = useState<EvidenceFilter>('all')
  const visibleClaims = medicineClaims.filter((claim) =>
    matchesFilter(filter, claim.evidenceType),
  )

  return (
    <section className="story-section evidence-section" id="medicine" aria-labelledby="evidence-title">
      <header className="section-heading section-heading--split">
        <div>
          <p className="eyebrow">06 · Медицина</p>
          <h2 id="evidence-title">Что изучают — и чего ещё не знают</h2>
        </div>
        <p>
          Лабораторный эффект, исследование экстракта и польза чашки чая — не
          одно и то же. Фильтр разделяет исторические, лабораторные,
          человеческие данные и практическую безопасность.
        </p>
      </header>

      <div className="evidence-review-note" role="note" aria-label="Граница медицинского раздела">
        <p><strong>Граница:</strong> это обзор данных, не индивидуальная рекомендация.</p>
        <p><strong>Поиск и редакционная проверка:</strong> 21 июля 2026.</p>
        <p><strong>Внешняя медицинская рецензия:</strong> не получена; внешних одобрений: 0.</p>
      </div>

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
          <article
            aria-labelledby={`${claim.id}-title`}
            className={`evidence-card evidence-card--${claim.kind}`}
            data-evidence-type={claim.evidenceType}
            key={claim.id}
          >
            <h3 id={`${claim.id}-title`}>{claim.title}</h3>
            {claim.id === 'human-metabolic-trials' ? (
              <p className="evidence-card__glossary">
                <InlineDefinition
                  term="суррогатный исход"
                  definition="Измеряемый промежуточный показатель, который используют вместо события, непосредственно важного для здоровья."
                />{' '}
                не равен доказанному улучшению здоровья.
              </p>
            ) : null}
            <p>{claim.summary}</p>
            <dl className="evidence-card__meta">
              <div className="evidence-card__meta-row evidence-card__meta-row--type">
                <dt>Тип данных</dt>
                <dd>{claim.evidenceLabel}</dd>
              </div>
              <div className="evidence-card__meta-row">
                <dt>Форма продукта</dt>
                <dd>{claim.productForm}</dd>
              </div>
              <div className="evidence-card__meta-row">
                <dt>Применимость к обычной чашке</dt>
                <dd>{claim.applicability}</dd>
              </div>
              <div className="evidence-card__meta-row">
                <dt>Ключевое ограничение</dt>
                <dd>{claim.limitations}</dd>
              </div>
            </dl>
            <div className="source-links" aria-label="Источники медицинской записи">
              {claim.sourceIds.map((sourceId) => {
                const source = sourceById.get(sourceId)
                if (!source) return null
                return <SourceCitation key={sourceId} source={source} />
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

      <SectionTakeaway
        title="Как читать обещание о пользе"
        className="section-takeaway--conclusion"
      >
        <p>
          Проверяйте форму продукта, тип данных и ограничение. Результат
          экстракта или суррогатный исход не обещает эффект обычной чашки.
        </p>
      </SectionTakeaway>
    </section>
  )
}
