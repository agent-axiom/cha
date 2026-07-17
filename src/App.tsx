import { useState } from 'react'
import type { TeaPath } from './content/types'
import { Hero } from './components/Hero'
import { SiteHeader } from './components/SiteHeader'

export function App() {
  const [teaPath, setTeaPath] = useState<TeaPath>('sheng')

  return (
    <div className="app" data-tea={teaPath}>
      <SiteHeader />
      <main>
        <Hero teaPath={teaPath} onTeaPathChange={setTeaPath} />
        <div id="history" aria-hidden="true" />
      </main>
    </div>
  )
}
