import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HistoryTimeline } from './HistoryTimeline'

describe('HistoryTimeline', () => {
  it('keeps legends, documents and modern knowledge visibly distinct', () => {
    render(<HistoryTimeline />)

    expect(screen.getAllByText('Легенда').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Письменный источник').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Современное знание').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/мань шу/i).length).toBeGreaterThan(0)
  })
})
