import { useEffect, useId, useRef, useState } from 'react'

interface InlineDefinitionProps {
  term: string
  definition: string
}

const DEFINITION_OPEN_EVENT = 'cha:inline-definition-open'

export function InlineDefinition({ term, definition }: InlineDefinitionProps) {
  const definitionId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const closeWhenAnotherDefinitionOpens = (event: Event) => {
      const openedId = (event as CustomEvent<string>).detail
      if (openedId !== definitionId) setIsOpen(false)
    }

    document.addEventListener(
      DEFINITION_OPEN_EVENT,
      closeWhenAnotherDefinitionOpens,
    )
    return () => {
      document.removeEventListener(
        DEFINITION_OPEN_EVENT,
        closeWhenAnotherDefinitionOpens,
      )
    }
  }, [definitionId])

  useEffect(() => {
    if (!isOpen) return undefined

    const closeOutside = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('focusin', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('focusin', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const toggleDefinition = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    document.dispatchEvent(
      new CustomEvent<string>(DEFINITION_OPEN_EVENT, { detail: definitionId }),
    )
    setIsOpen(true)
  }

  return (
    <span className="inline-definition" ref={rootRef}>
      <dfn>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Определение: ${term}`}
          aria-expanded={isOpen}
          aria-controls={definitionId}
          onClick={toggleDefinition}
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
