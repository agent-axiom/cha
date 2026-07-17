import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateSources,
  validateClaims,
  validateReviews,
  validateAssets,
} from '../scripts/validate-data.mjs'

test('rejects duplicate source ids', () => {
  assert.throws(() => validateSources([{ id: 'a', title: 'A', href: 'https://a.example', status: 'checked' }, { id: 'a', title: 'B', href: 'https://b.example', status: 'checked' }]), /duplicate source id: a/)
})

test('rejects claims with missing sources', () => {
  assert.throws(() => validateClaims([{ id: 'c1', text: 'x', evidence: 'source', sourceIds: ['missing'], status: 'draft' }], new Set()), /unknown source missing/)
})

test('requires three review roles for verified claims', () => {
  assert.throws(() => validateReviews([{ claimId: 'c1', role: 'historian', status: 'approved' }], new Set(['c1']), new Set(['c1'])), /missing required review/)
})

test('prevents unlicensed private assets from print-ready status', () => {
  assert.throws(() => validateAssets([{ id: 'img-1', kind: 'photo', rights: 'pending', status: 'print-ready', path: 'book/assets/private/a.tif' }]), /print-ready asset requires cleared rights/)
})
