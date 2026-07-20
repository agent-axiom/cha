import { processSteps } from '../content/process'
import { sourceById } from '../content/sources'
import type { TeaPath } from '../content/types'
import { DisclosureChevron } from './DisclosureChevron'
import { SectionTakeaway } from './SectionTakeaway'
import { SourceCitation } from './SourceCitation'

interface ProcessForkProps {
  selectedPath: TeaPath
}

const pathMeta: Record<TeaPath, { name: string; chinese: string; tempo: string }> = {
  sheng: { name: 'Шэн', chinese: '生茶', tempo: 'контролируемое хранение' },
  shou: { name: 'Шу', chinese: '熟茶', tempo: 'влажное кучевание — водуй' },
}

function stepsForPath(path: TeaPath) {
  return processSteps
    .filter((step) => step.path === path)
    .sort((first, second) => first.order - second.order)
}

const sharedSteps = processSteps
  .filter((step) => step.path === 'shared')
  .sort((first, second) => first.order - second.order)

interface ProcessStepListProps {
  label: string
  steps: typeof processSteps
}

function ProcessStepList({ label, steps }: ProcessStepListProps) {
  return (
    <ol aria-label={label}>
      {steps.map((step) => (
        <li key={step.id}>
          <span className="process-step__number" aria-hidden="true">
            {String(step.order).padStart(2, '0')}
          </span>
          <div>
            {step.chinese ? <p className="process-step__chinese">{step.chinese}</p> : null}
            <h4>{step.title}</h4>
            <p>{step.summary}</p>
            <details>
              <summary>
                Что меняется
                <DisclosureChevron />
              </summary>
              <p>{step.transformation}</p>
            </details>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function ProcessFork({ selectedPath }: ProcessForkProps) {
  const displayedSourceIds = [
    ...new Set(processSteps.flatMap((step) => step.sourceIds)),
  ]

  return (
    <section className="story-section process-section" id="craft" aria-labelledby="process-title">
      <header className="section-heading section-heading--split">
        <div>
          <p className="eyebrow">04 · Ремесло</p>
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

      <article className="process-shared">
        <header>
          <p className="eyebrow">Общая основа</p>
          <h3>До развилки: шайцин-маоча</h3>
        </header>
        <ProcessStepList label="Общие этапы до шайцин-маоча" steps={sharedSteps} />
      </article>

      <div className="process-fork">
        {(['sheng', 'shou'] as const).map((path) => {
          const meta = pathMeta[path]
          const steps = stepsForPath(path)

          return (
            <article
              className={`process-path process-path--${path}`}
              data-highlighted={selectedPath === path}
              key={path}
            >
              <header className="process-path__header">
                <span className="process-path__han" aria-hidden="true">{meta.chinese}</span>
                <div>
                  <p>{meta.tempo}</p>
                  <h3>{meta.name}</h3>
                </div>
              </header>

              <ProcessStepList label={`Этапы ${meta.name}`} steps={steps} />
            </article>
          )
        })}
      </div>

      <div
        className="source-links source-links--center"
        aria-label="Источники всех отображаемых технологических ветвей"
      >
        {displayedSourceIds.map((sourceId) => {
          const source = sourceById.get(sourceId)
          if (!source) return null
          return <SourceCitation key={sourceId} source={source} />
        })}
      </div>

      <SectionTakeaway
        title="Главное о развилке"
        className="section-takeaway--conclusion"
      >
        <p>
          Сначала идёт общий путь до шайцин-маоча; после него — пар, пресс и
          хранение шэна либо водуй, сушка и сортировка шу.
        </p>
      </SectionTakeaway>
    </section>
  )
}
