import type { Source } from '../content/types'

interface SourceCitationProps {
  source: Source
}

export function sourceCitationLabel(source: Source) {
  return [source.author, source.year, source.title, source.locator]
    .filter((part): part is string => Boolean(part))
    .join(' · ')
}

export function SourceCitation({ source }: SourceCitationProps) {
  return (
    <a
      data-claim-id={source.claimId}
      href={source.href}
      target="_blank"
      rel="noreferrer"
    >
      {sourceCitationLabel(source)}
      <span aria-hidden="true"> ↗</span>
      <span className="visually-hidden"> (открывается в новой вкладке)</span>
    </a>
  )
}
