import type { TeaPath } from '../content/types'
import { FogCanvas } from './FogCanvas'
import { InlineDefinition } from './InlineDefinition'
import { TeaPathSwitch } from './TeaPathSwitch'
import { ReaderContract } from './ReaderContract'
import { puerClassificationClaim } from '../content/editorial'
import { sourceById } from '../content/sources'
import { SourceCitation } from './SourceCitation'

interface HeroProps {
  teaPath: TeaPath
  onTeaPathChange: (path: TeaPath) => void
}

const pathCopy: Record<TeaPath, { eyebrow: string; note: string }> = {
  sheng: {
    eyebrow: 'Шэн · 生 · медленное время',
    note: 'Солнечно высушенный лист, пресс и годы перемен — без обязательного срока «готовности».',
  },
  shou: {
    eyebrow: 'Шу · 熟 · управляемое тепло',
    note: 'Управляемое влажное преобразование идёт неделями; это отдельный процесс, а не эквивалент выдержки шэна.',
  },
}

export function Hero({ teaPath, onTeaPathChange }: HeroProps) {
  const copy = pathCopy[teaPath]

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <img
        className="hero__image"
        src="/cha/images/puer-hero.webp"
        alt="Старинное чайное дерево над туманными горными склонами Юньнани"
        fetchPriority="high"
      />
      <div className="hero__mist" aria-hidden="true" />
      <FogCanvas />
      <div className="hero__content">
        <p className="eyebrow">Пуэр · Юньнань · проверяемая история</p>
        <h1 id="hero-title">
          Две судьбы{' '}
          <span>одного листа</span>
        </h1>
        <p className="hero__lede">
          Чайный лес помнит больше одной правды. Проследите путь от древних
          легенд до микробиологии шэн- и шу-пуэра.
        </p>
        <ReaderContract />
        <p
          className="hero__taxonomy"
          data-claim-id={puerClassificationClaim.id}
        >
          В русской торговой речи пуэр часто зовут «чёрным». Классификация пуэра
          спорна: GB/T 22111 объединяет шэн и шу в географическом указании «пуэр»,
          но не решает этот вопрос одинаково для всех школ. Отнесение к{' '}
          <InlineDefinition
            term="хэй ча"
            definition="Китайская категория тёмных чаёв; её границы применительно к пуэру зависят от принятой классификационной системы."
          />{' '}
          зависит от принятой системы и часто касается прежде всего шу. Выдержка
          сама по себе не превращает шэн в шу или в иную технологическую категорию.
          <span
            className="source-links hero__taxonomy-sources"
            aria-label="Источники классификационной оговорки"
          >
            {puerClassificationClaim.sourceIds.map((sourceId) => {
              const source = sourceById.get(sourceId)
              return source ? <SourceCitation key={sourceId} source={source} /> : null
            })}
          </span>
        </p>
        <TeaPathSwitch value={teaPath} onChange={onTeaPathChange} />
        <p className="hero__path-note">
          <strong>{copy.eyebrow}</strong>
          <span>{copy.note}</span>
        </p>
        <a className="hero__scroll" href="#paths-overview">
          <span>Сравнить два пути</span>
          <span aria-hidden="true">↓</span>
        </a>
      </div>
      <p className="hero__coordinates" aria-hidden="true">
        22.0° N · 100.8° E
      </p>
    </section>
  )
}
