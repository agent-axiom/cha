import { processSteps } from '../content/process'
import { sourceById } from '../content/sources'
import type { TeaPath } from '../content/types'

interface ProcessForkProps {
  selectedPath: TeaPath
}

const pathMeta: Record<TeaPath, { name: string; chinese: string; tempo: string }> = {
  sheng: { name: 'Шэн', chinese: '生茶', tempo: 'контролируемое хранение' },
  shou: { name: 'Шу', chinese: '熟茶', tempo: 'влажное кучевание — водуй' },
}

export function ProcessFork({ selectedPath }: ProcessForkProps) {
  return (
    <section className="story-section process-section" id="craft" aria-labelledby="process-title">
      <header className="section-heading section-heading--split">
        <div>
          <p className="eyebrow">03 · Ремесло</p>
          <h2 id="process-title">Один лист. Два пути.</h2>
        </div>
        <p>
          Первые семь шагов общие. После изготовления шэн поступает в контролируемое
          хранение без обязательного срока, а шу проходит влажное кучевание — водуй.
        </p>
      </header>

      <figure className="process-plate">
        <img
          src="/cha/images/sheng-shou-paths.webp"
          alt="Свежий чайный лист между светлым янтарным настоем шэн и тёмным рубиновым настоем шу"
          loading="lazy"
          decoding="async"
        />
        <figcaption>
          Разница заметна в чашке, но начинается гораздо раньше — в выборе
          технологического пути.
        </figcaption>
      </figure>

      <div className="process-fork">
        {(['sheng', 'shou'] as const).map((path) => {
          const meta = pathMeta[path]
          const steps = processSteps.filter((step) => step.path === path)

          return (
            <article
              className={`process-path process-path--${path}`}
              data-active={selectedPath === path}
              key={path}
            >
              <header className="process-path__header">
                <span className="process-path__han" aria-hidden="true">{meta.chinese}</span>
                <div>
                  <p>{meta.tempo}</p>
                  <h3>{meta.name}</h3>
                </div>
              </header>

              <ol aria-label={`Этапы ${meta.name}`}>
                {steps.map((step) => (
                  <li key={step.id} aria-current={selectedPath === path ? 'step' : undefined}>
                    <span className="process-step__number" aria-hidden="true">
                      {String(step.order).padStart(2, '0')}
                    </span>
                    <div>
                      {step.chinese ? <p className="process-step__chinese">{step.chinese}</p> : null}
                      <h4>{step.title}</h4>
                      <p>{step.summary}</p>
                      <details>
                        <summary>Что меняется</summary>
                        <p>{step.transformation}</p>
                      </details>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          )
        })}
      </div>

      <div className="source-links source-links--center" aria-label="Источники технологии">
        {['gbt-22111', 'lv-2013'].map((sourceId) => {
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
    </section>
  )
}
