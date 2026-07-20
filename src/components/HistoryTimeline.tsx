import { history } from '../content/history'
import { sourceById } from '../content/sources'
import type { HistoryKind } from '../content/types'
import { SourceCitation } from './SourceCitation'

const kindLabels: Record<HistoryKind, string> = {
  legend: 'Легенда',
  source: 'Письменный источник',
  retrospective: 'Поздняя реконструкция',
  modern: 'Современное знание',
}
export function HistoryTimeline() {
  return (
    <section className="story-section timeline-section" id="history" aria-labelledby="history-title">
      <header className="section-heading">
        <p className="eyebrow">01 · Корни</p>
        <h2 id="history-title">История растёт не по прямой</h2>
        <p>
          Предание, документ, реконструкция и научный вывод — разные способы помнить.
          Мы сохраняем каждый, но не смешиваем их.
        </p>
      </header>

      <ol className="timeline">
        {history.map((entry, index) => (
          <li className={`timeline__item timeline__item--${entry.kind}`} key={entry.id}>
            <div className="timeline__marker" aria-hidden="true">
              <span>{String(index + 1).padStart(2, '0')}</span>
            </div>
            <article>
              <div className="timeline__meta">
                <span className="timeline__date">{entry.date}</span>
                <span className="timeline__kind">{kindLabels[entry.kind]}</span>
              </div>
              <h3>{entry.title}</h3>
              <p className="timeline__summary">{entry.summary}</p>
              <details className="timeline__disclosure">
                <summary>Подробнее и источники</summary>
                <p className="timeline__detail">{entry.detail}</p>
                <div className="source-links" aria-label="Источники записи">
                  {entry.sourceIds.map((sourceId) => {
                    const source = sourceById.get(sourceId)
                    if (!source) return null

                    return <SourceCitation key={sourceId} source={source} />
                  })}
                </div>
              </details>
            </article>
          </li>
        ))}
      </ol>
    </section>
  )
}
