import { SectionTakeaway } from './SectionTakeaway'
import { InlineDefinition } from './InlineDefinition'

const repository = 'https://github.com/agent-axiom/cha/tree/main/book/manuscript'

export function TeaPathsOverview() {
  return (
    <section
      className="story-section paths-overview"
      id="paths-overview"
      aria-labelledby="paths-overview-title"
    >
      <header className="section-heading section-heading--split">
        <div>
          <p className="eyebrow">Перед началом · Два пути</p>
          <h2 id="paths-overview-title">Сначала — карта двух путей</h2>
        </div>
        <p>
          Общая основа — свежий лист,{' '}
          <InlineDefinition
            term="шацин"
            definition="Прогрев листа, который снижает активность собственных ферментов растения; традиционно его проводят в котле."
          />
          , скручивание,{' '}
          <InlineDefinition
            term="шайцин-маоча"
            definition="Чай-сырец после первичной обработки и солнечной сушки. Не путать шайцин (晒青) с шацином (杀青) — предшествующим прогревом листа."
          />. Развилка начинается после получения этого чайного сырья.
        </p>
      </header>

      <div className="paths-overview__routes">
        <article>
          <p className="eyebrow">生茶 · медленное изменение</p>
          <h3>Шэн</h3>
          <p>
            Маоча размягчают паром, прессуют и тщательно сушат. Затем чай может
            меняться при контролируемом хранении; обязательного срока нет.
          </p>
        </article>
        <article>
          <p className="eyebrow">熟茶 · управляемое преобразование</p>
          <h3>Шу</h3>
          <p>
            Маоча проходит влажное кучевание — водуй, затем сушку и сортировку.
            Это отдельная технология, а не ускоренная версия выдержанного шэна.
          </p>
        </article>
      </div>

      <a className="paths-overview__onward" href="#craft">
        Перейти к полной технологической схеме ↓
      </a>

      <SectionTakeaway title="Три формата одного проекта" className="companion-formats">
        <p>Выберите глубину и ритм, которые нужны сейчас.</p>
        <ul>
          <li><a href="#top">Интерактивный сайт</a> — короткий маршрут с раскрываемыми деталями.</li>
          <li><a href={`${repository}/album`}>Подарочный альбом</a> — развернутое повествование.</li>
          <li><a href={`${repository}/guide`}>Краткий гид</a> — практические рамки заваривания.</li>
        </ul>
        <p className="companion-formats__status">
          Альбом и гид остаются редакционными материалами; статус печатного выпуска здесь не заявляется.
        </p>
      </SectionTakeaway>
    </section>
  )
}
