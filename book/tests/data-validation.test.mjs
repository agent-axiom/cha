import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateSources,
  validateClaims,
  validateReviews,
  validateAssets,
} from '../scripts/validate-data.mjs'

test('rejects duplicate source ids', () => {
  assert.throws(() => validateSources([{ id: 'a', title: 'A', href: 'https://a.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: true }, { id: 'a', title: 'B', href: 'https://b.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: true }]), /duplicate source id: a/)
})

test('rejects invalid source groups', () => {
  assert.throws(() => validateSources([{ id: 'a', title: 'A', href: 'https://a.example', group: 'other', status: 'checked', bookUse: 'core', siteVisible: true }]), /invalid source group: other/)
})

test('rejects invalid source book use', () => {
  assert.throws(() => validateSources([{ id: 'a', title: 'A', href: 'https://a.example', group: 'guidance', status: 'checked', bookUse: 'other', siteVisible: true }]), /invalid source book use: other/)
})

test('rejects non-boolean source visibility', () => {
  assert.throws(() => validateSources([{ id: 'a', title: 'A', href: 'https://a.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: 'true' }]), /source siteVisible must be boolean: a/)
})

test('rejects claims with missing sources', () => {
  assert.throws(() => validateClaims([{ id: 'c1', text: 'x', evidence: 'source', sourceIds: ['missing'], status: 'draft' }], new Set()), /unknown source missing/)
})

test('rejects missing, empty, and whitespace-only claim ids', () => {
  for (const id of [undefined, '', '   ']) {
    assert.throws(() => validateClaims([{ id, text: 'x', evidence: 'source', sourceIds: [], status: 'draft' }], new Set()), /claim requires nonblank id/)
  }
})

test('requires three review roles for verified claims', () => {
  assert.throws(() => validateReviews([{ claimId: 'c1', role: 'historian', status: 'approved' }], new Set(['c1']), new Set(['c1'])), /missing required review/)
})

test('rejects duplicate review approvals for the same claim and role', () => {
  const reviews = [
    { claimId: 'c1', role: 'historian', status: 'approved' },
    { claimId: 'c1', role: 'historian', status: 'approved' },
  ]
  assert.throws(() => validateReviews(reviews, new Set(['c1']), new Set()), /duplicate review: c1\/historian/)
})

test('rejects conflicting review states for the same claim and role', () => {
  const reviews = [
    { claimId: 'c1', role: 'historian', status: 'approved' },
    { claimId: 'c1', role: 'historian', status: 'changes-requested' },
  ]
  assert.throws(() => validateReviews(reviews, new Set(['c1']), new Set()), /duplicate review: c1\/historian/)
})

test('prevents unlicensed private assets from print-ready status', () => {
  assert.throws(() => validateAssets([{ id: 'img-1', kind: 'photo', rights: 'pending', status: 'print-ready', path: 'book/assets/private/a.tif' }]), /print-ready asset requires cleared rights/)
})

test('rejects missing, empty, and whitespace-only asset ids', () => {
  for (const id of [undefined, '', '   ']) {
    assert.throws(() => validateAssets([{ id, kind: 'photo', rights: 'pending', status: 'concept', path: 'book/assets/private/a.tif' }]), /asset requires nonblank id/)
  }
})

test('accepts a complete valid evidence and rights registry', () => {
  const sourceIds = validateSources([{ id: 's1', title: 'Source', href: 'https://source.example', group: 'guidance', status: 'checked', bookUse: 'core', siteVisible: true }])
  const claims = [{ id: 'c1', text: 'Claim', evidence: 'source', sourceIds: ['s1'], status: 'verified' }]
  const claimIds = validateClaims(claims, sourceIds)
  const reviews = [
    { claimId: 'c1', role: 'historian', status: 'approved' },
    { claimId: 'c1', role: 'technologist', status: 'approved' },
    { claimId: 'c1', role: 'medical', status: 'approved' },
  ]

  assert.doesNotThrow(() => validateReviews(reviews, claimIds, new Set(['c1'])))
  assert.deepEqual(validateAssets([{ id: 'img-1', kind: 'photo', rights: 'licensed', status: 'print-ready', path: 'book/assets/private/a.tif' }]), new Set(['img-1']))
})
