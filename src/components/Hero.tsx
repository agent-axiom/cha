import type { TeaPath } from '../content/types'
import { FogCanvas } from './FogCanvas'
import { TeaPathSwitch } from './TeaPathSwitch'

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
    note: 'Влажная куча, микробное сообщество и технология XX века — зрелость за недели, не за десятилетия.',
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
        <p className="hero__taxonomy">
          В русской торговой речи пуэр часто зовут «чёрным». В китайской
          классификации выдержанный и постферментированный чай относят к{' '}
          <i>хэй ча</i> — «тёмным чаям»; шэн и шу при этом идут разными путями.
        </p>
        <TeaPathSwitch value={teaPath} onChange={onTeaPathChange} />
        <p className="hero__path-note">
          <strong>{copy.eyebrow}</strong>
          <span>{copy.note}</span>
        </p>
        <a className="hero__scroll" href="#history">
          <span>Перейти к истории</span>
          <span aria-hidden="true">↓</span>
        </a>
      </div>
      <p className="hero__coordinates" aria-hidden="true">
        22.0° N · 100.8° E
      </p>
    </section>
  )
}
