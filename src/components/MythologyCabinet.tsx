import { myths } from '../content/mythology'
import { sourceById } from '../content/sources'

export function MythologyCabinet() {
  return (
    <section className="story-section myths-section" id="myths" aria-labelledby="myths-title">
      <header className="section-heading">
        <p className="eyebrow">06 · Мифология</p>
        <h2 id="myths-title">Предания не обязаны быть фактами, чтобы быть важными</h2>
        <p>
          Эти сюжеты рассказывают, как люди объясняли происхождение знания,
          связывали горы с героями и наделяли редкий чай силой.
        </p>
      </header>

      <figure className="myths-still-life">
        <img
          src="/cha/images/puer-material-culture.webp"
          alt="Прессованный блин пуэра, волокнистая обёртка, чайный нож и гайвань в традиционной мастерской"
          loading="lazy"
          decoding="async"
        />
        <figcaption>Материальные вещи переживают рассказы — и помогают им меняться.</figcaption>
      </figure>

      <div className="myth-grid">
        {myths.map((myth, index) => (
          <article className="myth-card" key={myth.id}>
            <p className="myth-card__number">{String(index + 1).padStart(2, '0')}</p>
            <p className="myth-card__han">{myth.chinese}</p>
            <h3>{myth.title}</h3>
            <dl>
              <div>
                <dt>Сюжет</dt>
                <dd>{myth.story}</dd>
              </div>
              <div>
                <dt>Как читать сегодня</dt>
                <dd>{myth.reading}</dd>
              </div>
            </dl>
            <div className="source-links" aria-label="Источники мифа">
              {myth.sourceIds.map((sourceId) => {
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
    </section>
  )
}
