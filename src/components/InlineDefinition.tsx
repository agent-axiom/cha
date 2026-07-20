import { useId, useState } from 'react'

interface InlineDefinitionProps {
  term: string
  definition: string
}

export function InlineDefinition({ term, definition }: InlineDefinitionProps) {
  const definitionId = useId()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <span className="inline-definition">
      <dfn>
        <button
          type="button"
          aria-label={`Определение: ${term}`}
          aria-expanded={isOpen}
          aria-controls={definitionId}
          onClick={() => setIsOpen((open) => !open)}
        >
          {term}
        </button>
      </dfn>
      {isOpen ? (
        <span
          className="inline-definition__note"
          id={definitionId}
          role="note"
          aria-label={`Определение термина «${term}»`}
        >
          {definition}
        </span>
      ) : null}
    </span>
  )
}
