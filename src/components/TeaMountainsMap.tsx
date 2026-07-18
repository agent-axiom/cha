import { useState } from 'react'
import { regions } from '../content/regions'
import { sourceById } from '../content/sources'

export function TeaMountainsMap() {
  const [selectedId, setSelectedId] = useState(regions[0]?.id ?? '')
  const selected = regions.find((region) => region.id === selectedId) ?? regions[0]

  if (!selected) return null

  return (
    <section className="story-section map-section" id="geography" aria-labelledby="map-title">
      <header className="section-heading section-heading--split">
        <div>
          <p className="eyebrow">03 · Терруар</p>
          <h2 id="map-title">Горы, которые стали именами</h2>
        </div>
        <p>
          Схема показывает культурную географию, а не точную навигационную карту.
          Выберите точку, чтобы открыть полевую запись.
        </p>
      </header>

      <div className="tea-map">
        <div className="tea-map__canvas">
          <svg
            className="tea-map__relief"
            viewBox="0 0 900 620"
            role="img"
            aria-labelledby="relief-title relief-description"
          >
            <title id="relief-title">Схематический рельеф юга Юньнани</title>
            <desc id="relief-description">
              Слои гор, река Ланьцанцзян и положения исторических чайных мест.
            </desc>
            <defs>
              <linearGradient id="ridge-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.08" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.28" />
              </linearGradient>
              <filter id="soft-glow">
                <feGaussianBlur stdDeviation="12" />
              </filter>
            </defs>
            <path className="tea-map__mist" d="M75 430 C240 290 360 520 510 356 S730 205 860 315" />
            <path className="tea-map__ridge" d="M0 485 L112 312 L193 404 L307 205 L405 365 L512 158 L625 338 L738 188 L900 422 L900 620 L0 620 Z" />
            <path className="tea-map__ridge tea-map__ridge--far" d="M0 378 L130 222 L254 348 L397 110 L548 282 L691 89 L900 310 L900 620 L0 620 Z" />
            <path className="tea-map__river" d="M286 0 C390 112 246 220 356 315 C448 394 320 501 419 620" />
            <path className="tea-map__route" d="M238 359 C386 312 500 370 622 304 S760 279 841 346" />
          </svg>

          <div className="tea-map__markers" aria-label="Чайные места">
            {regions.map((region) => (
              <button
                key={region.id}
                className={`map-marker map-marker--${region.category}`}
                type="button"
                aria-pressed={selected.id === region.id}
                aria-label={`${region.name}, ${region.chinese}`}
                style={{ left: `${region.x}%`, top: `${region.y}%` }}
                onClick={() => setSelectedId(region.id)}
              >
                <span aria-hidden="true" />
                <strong>{region.name}</strong>
              </button>
            ))}
          </div>
          <p className="tea-map__river-label" aria-hidden="true">Ланьцанцзян · 澜沧江</p>
        </div>

        <article className="field-note" aria-live="polite" aria-atomic="true">
          <p className="eyebrow">
            {selected.category === 'mountain' ? 'Историческая гора' : 'Чайный ландшафт'}
          </p>
          <p className="field-note__han" aria-hidden="true">{selected.chinese}</p>
          <h3>{selected.name}</h3>
          <p>{selected.description}</p>
          <div className="source-links" aria-label="Источники полевой записи">
            {selected.sourceIds.map((sourceId) => {
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
      </div>
    </section>
  )
}
