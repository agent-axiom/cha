import { useId, type ReactNode } from 'react'

interface SectionTakeawayProps {
  title: string
  children: ReactNode
  className?: string
}

export function SectionTakeaway({
  title,
  children,
  className = '',
}: SectionTakeawayProps) {
  const titleId = useId()
  return (
    <aside
      className={`section-takeaway ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <h3 id={titleId}>{title}</h3>
      {children}
    </aside>
  )
}
