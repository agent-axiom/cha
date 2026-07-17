import { describe, expect, it } from 'vitest'
import { history } from '../content/history'
import { medicineClaims } from '../content/medicine'
import { sources } from '../content/sources'
import { findBrokenSourceRefs, findDuplicateIds } from './contentValidation'

describe('content integrity', () => {
  it('links every factual claim to a known source', () => {
    expect(findBrokenSourceRefs([...history, ...medicineClaims], sources)).toEqual([])
  })

  it('keeps every content id unique', () => {
    expect(findDuplicateIds([...history, ...medicineClaims])).toEqual([])
  })

  it('never presents preliminary medical evidence as treatment', () => {
    expect(
      medicineClaims.every(
        (claim) => claim.evidenceLevel < 5 || claim.kind === 'safety',
      ),
    ).toBe(true)
  })
})
