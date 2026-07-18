import { useState } from 'react'
import { fermentationLayers } from '../content/process'
import { sourceById } from '../content/sources'

export function FermentationLab() {
  const [activeId, setActiveId] = useState(fermentationLayers[0]?.id ?? 'microbes')
  const active = fermentationLayers.find((layer) => layer.id === activeId) ?? fermentationLayers[0]

  if (!active) return null

  return (
    <section className="story-section lab-section" id="science" aria-labelledby="lab-title">
      <header className="section-heading">
        <p className="eyebrow">04 · Взаимодействующая система</p>
        <h2 id="lab-title">Влажное кучевание шу — водуй</h2>
        <p>
          Этот раздел относится только к водуй: в нём взаимодействуют лист, вода,
          тепло, кислород, микробное сообщество и действия производителя.
        </p>
      </header>

      <div className="fermentation-lab">
        <div className="fermentation-lab__visual">
          <img
            className="fermentation-lab__image"
            src="/cha/images/fermentation-microcosm.webp"
            alt=""
            loading="lazy"
            decoding="async"
          />
          <svg viewBox="0 0 640 540" role="img" aria-labelledby="micro-title micro-desc">
            <title id="micro-title">Схематическая модель влажного кучевания шу — водуй</title>
            <desc id="micro-desc">
              Иллюстративная схема взаимодействия сырья, условий и микробного сообщества во время водуй; это не микрофотография и не модель всего пуэра.
            </desc>
            <defs>
              <radialGradient id="cell-glow">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.9" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>
            <g className={`lab-layer lab-layer--microbes ${active.id === 'microbes' ? 'is-active' : ''}`}>
              <circle cx="190" cy="172" r="74" />
              <circle cx="414" cy="135" r="42" />
              <circle cx="448" cy="342" r="91" />
              <circle cx="238" cy="382" r="48" />
              <path d="M171 170 C230 94 344 91 411 136 S518 265 449 340 S296 433 238 382 S110 246 171 170" />
            </g>
            <g className={`lab-layer lab-layer--climate ${active.id === 'climate' ? 'is-active' : ''}`}>
              <path d="M74 400 C106 248 152 103 311 82 C474 60 567 212 571 384 C473 321 175 496 74 400 Z" />
              <path d="M112 364 C216 308 221 168 337 142 C452 116 494 220 540 325" />
              <path d="M140 420 C252 359 365 441 524 362" />
            </g>
            <g className={`lab-layer lab-layer--chemistry ${active.id === 'chemistry' ? 'is-active' : ''}`}>
              {Array.from({ length: 13 }).map((_, index) => (
                <circle
                  key={index}
                  cx={120 + ((index * 83) % 410)}
                  cy={112 + ((index * 127) % 330)}
                  r={8 + (index % 4) * 6}
                />
              ))}
              <path d="M110 330 C205 151 401 112 526 294" />
              <path d="M124 378 C282 475 452 441 523 321" />
            </g>
          </svg>
          <p className="fermentation-lab__caption">Схема объясняет влажное кучевание шу; это не микрофотография и не изображение всего производства пуэра.</p>
        </div>

        <div className="fermentation-lab__controls">
          <div className="lab-tabs" role="group" aria-label="Слои модели влажного кучевания шу">
            {fermentationLayers.map((layer, index) => (
              <button
                key={layer.id}
                type="button"
                aria-pressed={active.id === layer.id}
                onClick={() => setActiveId(layer.id)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {layer.eyebrow}
              </button>
            ))}
          </div>

          <article className="lab-note" aria-live="polite">
            <p className="eyebrow">{active.eyebrow}</p>
            <h3>{active.title}</h3>
            <p>{active.description}</p>
            <div className="source-links" aria-label="Источники объяснения">
              {active.sourceIds.map((sourceId) => {
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
      </div>
    </section>
  )
}
