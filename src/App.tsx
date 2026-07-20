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
import { TeaPathsOverview } from './components/TeaPathsOverview'

export function App() {
  const [teaPath, setTeaPath] = useState<TeaPath>('sheng')

  return (
    <div className="app" data-tea={teaPath}>
      <a className="skip-link" href="#content">
        Перейти к основному содержанию
      </a>
      <SiteHeader />
      <main id="content">
        <Hero teaPath={teaPath} onTeaPathChange={setTeaPath} />
        <TeaPathsOverview />
        <HistoryTimeline />
        <MythologyCabinet />
        <TeaMountainsMap />
        <ProcessFork selectedPath={teaPath} />
        <FermentationLab />
        <EvidenceSection />
        <SourcesSection />
      </main>
    </div>
  )
}
