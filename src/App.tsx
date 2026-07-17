import { useState } from 'react'
import type { TeaPath } from './content/types'
import { EvidenceSection } from './components/EvidenceSection'
import { FermentationLab } from './components/FermentationLab'
import { Hero } from './components/Hero'
import { HistoryTimeline } from './components/HistoryTimeline'
import { MythologyCabinet } from './components/MythologyCabinet'
import { ProcessFork } from './components/ProcessFork'
import { SiteHeader } from './components/SiteHeader'
import { SourcesSection } from './components/SourcesSection'
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
        <ProcessFork selectedPath={teaPath} />
        <FermentationLab />
        <EvidenceSection />
        <MythologyCabinet />
        <SourcesSection />
      </main>
    </div>
  )
}
