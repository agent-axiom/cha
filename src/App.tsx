import { useState } from 'react'
import type { TeaPath } from './content/types'
import { Hero } from './components/Hero'
import { HistoryTimeline } from './components/HistoryTimeline'
import { MythologyCabinet } from './components/MythologyCabinet'
import { SiteHeader } from './components/SiteHeader'
import { TeaMountainsMap } from './components/TeaMountainsMap'

export function App() {
  const [teaPath, setTeaPath] = useState<TeaPath>('sheng')

  return (
    <div className="app" data-tea={teaPath}>
      <SiteHeader />
      <main>
        <Hero teaPath={teaPath} onTeaPathChange={setTeaPath} />
        <HistoryTimeline />
        <TeaMountainsMap />
        <MythologyCabinet />
      </main>
    </div>
  )
}
