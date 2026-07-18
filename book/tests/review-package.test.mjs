import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildReviewPackage,
  sha256,
  verifyFrozenProofs,
  writePreparedState,
} from '../scripts/build-review-package.mjs'

const bookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('freezes the same active corpus, proof set, snapshot and deadline for all roles', () => {
  const result = buildReviewPackage({ root: bookRoot, verifyProofs: false })
  const activeIds = result.claimIndex
    .filter(({ claimStatus }) => claimStatus === 'checked')
    .map(({ claimId }) => claimId)
    .sort()

  assert.equal(activeIds.length, 70)
  assert.equal(result.claimIndex.filter(({ claimStatus }) => claimStatus === 'rejected').length, 11)
  assert.deepEqual(Object.keys(result.requests).sort(), ['historian', 'medical', 'technologist'])
  for (const request of Object.values(result.requests)) {
    assert.deepEqual(request.activeClaims.map(({ claimId }) => claimId).sort(), activeIds)
    assert.equal(request.proofSetSha256, result.manifest.proofSetSha256)
    assert.equal(request.snapshotSha256, result.manifest.snapshotSha256)
    assert.equal(request.deadline, result.manifest.deadline)
    assert.equal(request.status, 'blank-review-request')
  }
})

test('uses the declared cross-disciplinary focus matrix without changing claim statuses', () => {
  const result = buildReviewPackage({ root: bookRoot, verifyProofs: false })
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(result.requests).map(([role, request]) => [
        role,
        [request.primaryFocus.length, request.excludedFocus.length],
      ]),
    ),
    {
      historian: [25, 4],
      technologist: [41, 6],
      medical: [23, 1],
    },
  )
  assert.ok(result.requests.historian.primaryFocus.some(({ claimId }) => claimId === 'prod-shou-chronology-disagreement'))
  assert.ok(result.requests.medical.primaryFocus.some(({ claimId }) => claimId === 'micro-safety-method-dependent'))
  assert.ok(result.requests.technologist.primaryFocus.some(({ claimId }) => claimId === 'medical-food-storage-safety'))
  assert.equal(result.claimIndex.some(({ claimStatus }) => claimStatus === 'verified'), false)
})

test('maps active claims to proof pages or an explicit registry-only exception', () => {
  const result = buildReviewPackage({ root: bookRoot, verifyProofs: false })
  const unlinked = result.claimIndex.filter(
    ({ claimStatus, occurrences }) => claimStatus === 'checked' && occurrences.length === 0,
  )
  assert.deepEqual(
    unlinked.map(({ claimId }) => claimId).sort(),
    ['storage-gbt30375-current'],
  )
  for (const claim of unlinked) {
    assert.ok(claim.registryOnlyReason)
    assert.ok(claim.contextPageIds.length > 0)
  }
  for (const claim of result.claimIndex.filter(({ claimStatus }) => claimStatus === 'checked')) {
    assert.ok(claim.occurrences.length > 0 || claim.registryOnlyReason)
    assert.ok(claim.sources.length > 0)
    assert.ok(claim.sources.every(({ status }) => status === 'checked'))
  }
})

test('includes the exact generated bibliography and blank response templates', () => {
  const result = buildReviewPackage({ root: bookRoot, verifyProofs: false })
  const bibliography = result.files.get('bibliography.md')
  const sourceIds = JSON.parse(result.files.get('data/sources-frozen.json'))
    .map(({ id }) => id)
    .sort()
  const bibliographyIds = [...bibliography.matchAll(/<!-- source:([^ ]+) -->/gu)]
    .map(([, id]) => id)
    .sort()
  assert.equal(bibliographyIds.length, 49)
  assert.deepEqual(bibliographyIds, sourceIds)
  assert.match(bibliography, /<!-- source:xu-2022 -->/u)
  assert.equal(result.manifest.bibliography.sha256, sha256(Buffer.from(bibliography)))
  for (const role of ['historian', 'technologist', 'medical']) {
    const template = JSON.parse(result.files.get(`responses/${role}.template.json`))
    assert.equal(template.role, role)
    assert.equal(template.reviewer.name, null)
    assert.equal(template.overallDecision, null)
    assert.ok(template.decisions.every(({ decision }) => decision === null))
    assert.ok(template.decisions.every(({ pageIdsReviewed }) => pageIdsReviewed.length === 0))
    assert.ok(template.decisions.every(({ pageIdsToReview }) => pageIdsToReview.length > 0))
  }
  const medical = JSON.parse(result.files.get('responses/medical.template.json'))
  assert.deepEqual(
    medical.decisions.find(({ claimId }) => claimId === 'medical-mycotoxin-evidence-limited').pageIdsToReview,
    ['A-P146'],
  )
})

test('uses exclusion-specific decisions for rejected claims', () => {
  const result = buildReviewPackage({ root: bookRoot, verifyProofs: false })
  for (const role of ['historian', 'technologist', 'medical']) {
    const request = result.files.get(`requests/${role}.md`)
    const exclusionLedger = request.split('# Журнал исключённых тезисов профильной области')[1]
    assert.match(exclusionLedger, /confirm-exclusion/u)
    assert.match(exclusionLedger, /reopen-excluded/u)
    assert.doesNotMatch(exclusionLedger, /approve-wording/u)
    const response = JSON.parse(result.files.get(`responses/${role}.template.json`))
    assert.ok(response.excludedDecisions.every(({ decision }) => decision === null))
    assert.ok(response.excludedDecisions.every(({ decisionOptions }) => (
      decisionOptions.join(',') === 'confirm-exclusion,reopen-excluded,not-in-scope'
    )))
  }
})

test('rejects an invalid deadline and a tampered frozen proof', () => {
  const invalid = JSON.parse(fs.readFileSync(path.join(bookRoot, 'config/review-cycle.json'), 'utf8'))
  invalid.deadline = '2026-08-01'
  assert.throws(
    () => buildReviewPackage({ root: bookRoot, config: invalid, verifyProofs: false }),
    /deadline must be RFC3339 with an explicit offset/,
  )

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'puer-review-proof-'))
  try {
    const proof = path.join(temp, 'proof.pdf')
    fs.writeFileSync(proof, 'frozen proof')
    const config = {
      proofs: [{ id: 'album', path: proof, sha256: sha256(Buffer.from('different')) }],
    }
    assert.throws(() => verifyFrozenProofs({ root: '/', config }), /frozen proof is not a PDF: album/)
  } finally {
    fs.rmSync(temp, { recursive: true, force: true })
  }
})

test('rejects impossible calendar dates, false proof page metadata, and fake commits', () => {
  const base = JSON.parse(fs.readFileSync(path.join(bookRoot, 'config/review-cycle.json'), 'utf8'))
  const impossible = structuredClone(base)
  impossible.deadline = '2026-02-30T12:00:00+03:00'
  assert.throws(
    () => buildReviewPackage({ root: bookRoot, config: impossible, verifyProofs: false }),
    /deadline is not a real RFC3339 date-time/,
  )

  const falsePages = structuredClone(base)
  falsePages.proofs.find(({ id }) => id === 'album').pages = 207
  assert.throws(
    () => buildReviewPackage({ root: bookRoot, config: falsePages, verifyProofs: false }),
    /proof page count mismatch: album/,
  )

  const fakeCommit = structuredClone(base)
  fakeCommit.gitCommit = 'not-a-real-commit'
  assert.throws(
    () => buildReviewPackage({ root: bookRoot, config: fakeCommit, verifyProofs: false }),
    /gitCommit must be a full lowercase commit SHA/,
  )
})

test('checked-in dispatch and closeout remain explicitly prepared, never approved', () => {
  const dispatch = JSON.parse(
    fs.readFileSync(path.join(bookRoot, 'production/review-dispatch.json'), 'utf8'),
  )
  const closeout = fs.readFileSync(path.join(bookRoot, 'production/review-closeout.md'), 'utf8')
  assert.equal(dispatch.status, 'prepared-not-dispatched')
  assert.equal(dispatch.externalApprovals, 0)
  assert.match(closeout, /NOT CLOSED/u)
  assert.doesNotMatch(closeout, /overallDecision:\s*approved/iu)
})

test('package scripts expose the frozen review preparation command', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(bookRoot, '..', 'package.json'), 'utf8'),
  )
  assert.equal(
    packageJson.scripts['book:review:prepare'],
    'node book/scripts/build-review-package.mjs',
  )
})

test('prepared tracked state is idempotent and cannot overwrite later review work', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'puer-review-state-'))
  const filename = path.join(temp, 'review-closeout.md')
  try {
    assert.equal(writePreparedState(filename, 'NOT CLOSED\n'), true)
    assert.equal(writePreparedState(filename, 'NOT CLOSED\n'), false)
    assert.throws(
      () => writePreparedState(filename, 'replacement\n'),
      /refusing to overwrite non-identical tracked review state/,
    )
    assert.equal(fs.readFileSync(filename, 'utf8'), 'NOT CLOSED\n')
  } finally {
    fs.rmSync(temp, { recursive: true, force: true })
  }
})
