import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const bookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.dirname(bookRoot)
const packageDir = path.join(bookRoot, 'output/review/specialist-review-2026-01')

const loadVerifier = async () => import('../scripts/verify-review-package.mjs').catch(() => ({}))

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

const makeFixture = () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'puer-review-verify-'))
  const copiedPackage = path.join(temp, 'package')
  const dispatchPath = path.join(temp, 'review-dispatch.json')
  fs.cpSync(packageDir, copiedPackage, { recursive: true })
  fs.copyFileSync(path.join(bookRoot, 'production/review-dispatch.json'), dispatchPath)
  return {
    temp,
    packageDir: copiedPackage,
    dispatchPath,
    cleanup: () => fs.rmSync(temp, { recursive: true, force: true }),
  }
}

const rewriteManifest = (fixture, mutate) => {
  const filename = path.join(fixture.packageDir, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'))
  mutate(manifest)
  const contents = `${JSON.stringify(manifest, null, 2)}\n`
  fs.writeFileSync(filename, contents)
  const dispatch = JSON.parse(fs.readFileSync(fixture.dispatchPath, 'utf8'))
  dispatch.manifestSha256 = sha256(Buffer.from(contents))
  fs.writeFileSync(fixture.dispatchPath, `${JSON.stringify(dispatch, null, 2)}\n`)
}

const rewritePackageFile = (fixture, relative, mutate) => {
  const filename = path.join(fixture.packageDir, relative)
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'))
  mutate(data)
  const contents = `${JSON.stringify(data, null, 2)}\n`
  fs.writeFileSync(filename, contents)
  rewriteManifest(fixture, (manifest) => {
    const entry = manifest.files.find(({ path: candidate }) => candidate === relative)
    assert.ok(entry, `manifest entry for ${relative}`)
    entry.sha256 = sha256(Buffer.from(contents))
  })
}

const treeFingerprint = (root) => {
  const entries = []
  const visit = (folder) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const filename = path.join(folder, entry.name)
      if (entry.isDirectory()) visit(filename)
      else if (entry.isFile()) {
        entries.push([
          path.relative(root, filename).split(path.sep).join('/'),
          fs.statSync(filename).mtimeMs,
          fs.readFileSync(filename).toString('base64'),
        ])
      }
    }
  }
  visit(root)
  return entries
}

test('package scripts expose a read-only review verification command', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
  assert.equal(
    packageJson.scripts['book:review:verify'],
    'node book/scripts/verify-review-package.mjs',
  )
})

test('treats checked and verified claims as the active publication corpus', async () => {
  const { publicationClaimIds } = await loadVerifier()
  assert.equal(typeof publicationClaimIds, 'function')
  assert.deepEqual(
    publicationClaimIds([
      { id: 'checked-claim', status: 'checked' },
      { id: 'verified-claim', status: 'verified' },
      { id: 'rejected-claim', status: 'rejected' },
    ]),
    ['checked-claim', 'verified-claim'],
  )
})

test('verifies the frozen package on disk without modifying it', async () => {
  const { verifyReviewPackage } = await loadVerifier()
  assert.equal(typeof verifyReviewPackage, 'function')
  const before = treeFingerprint(packageDir)

  const report = verifyReviewPackage({
    bookRoot,
    packageDir,
  })

  assert.deepEqual(report, {
    cycleId: 'specialist-review-2026-01',
    files: 16,
    roles: 3,
    activeClaims: 70,
    proofs: 2,
    proofStructureVerified: true,
  })
  assert.deepEqual(treeFingerprint(packageDir), before)
})

test('rejects a missing package file', async () => {
  const fixture = makeFixture()
  try {
    fs.rmSync(path.join(fixture.packageDir, 'README.md'))
    const { verifyReviewPackage } = await loadVerifier()
    assert.throws(
      () => verifyReviewPackage({ bookRoot, ...fixture }),
      /package file set mismatch.*missing README\.md/u,
    )
  } finally {
    fixture.cleanup()
  }
})

test('rejects an extra package file', async () => {
  const fixture = makeFixture()
  try {
    fs.writeFileSync(path.join(fixture.packageDir, 'unexpected.txt'), 'extra')
    const { verifyReviewPackage } = await loadVerifier()
    assert.throws(
      () => verifyReviewPackage({ bookRoot, ...fixture }),
      /package file set mismatch.*extra unexpected\.txt/u,
    )
  } finally {
    fixture.cleanup()
  }
})

test('rejects a package file whose bytes no longer match the manifest', async () => {
  const fixture = makeFixture()
  try {
    fs.appendFileSync(path.join(fixture.packageDir, 'README.md'), '\ntampered\n')
    const { verifyReviewPackage } = await loadVerifier()
    assert.throws(
      () => verifyReviewPackage({ bookRoot, ...fixture }),
      /package file hash mismatch: README\.md/u,
    )
  } finally {
    fixture.cleanup()
  }
})

test('rejects a stale dispatch hash for the exact manifest bytes', async () => {
  const fixture = makeFixture()
  try {
    const dispatch = JSON.parse(fs.readFileSync(fixture.dispatchPath, 'utf8'))
    dispatch.manifestSha256 = '0'.repeat(64)
    fs.writeFileSync(fixture.dispatchPath, `${JSON.stringify(dispatch, null, 2)}\n`)
    const { verifyReviewPackage } = await loadVerifier()
    assert.throws(
      () => verifyReviewPackage({ bookRoot, ...fixture }),
      /dispatch manifest hash mismatch/u,
    )
  } finally {
    fixture.cleanup()
  }
})

test('rejects a stale composite snapshot hash', async () => {
  const fixture = makeFixture()
  try {
    rewriteManifest(fixture, (manifest) => {
      manifest.snapshotSha256 = '0'.repeat(64)
    })
    const dispatch = JSON.parse(fs.readFileSync(fixture.dispatchPath, 'utf8'))
    dispatch.snapshotSha256 = '0'.repeat(64)
    fs.writeFileSync(fixture.dispatchPath, `${JSON.stringify(dispatch, null, 2)}\n`)
    const { verifyReviewPackage } = await loadVerifier()
    assert.throws(
      () => verifyReviewPackage({ bookRoot, ...fixture }),
      /snapshotSha256 mismatch/u,
    )
  } finally {
    fixture.cleanup()
  }
})

test('rejects role requests with different active claim IDs', async () => {
  const fixture = makeFixture()
  try {
    rewritePackageFile(fixture, 'requests/historian.json', (request) => {
      request.activeClaims.pop()
    })
    const { verifyReviewPackage } = await loadVerifier()
    assert.throws(
      () => verifyReviewPackage({ bookRoot, ...fixture }),
      /active claim IDs differ: historian/u,
    )
  } finally {
    fixture.cleanup()
  }
})

test('rejects a response template that could be mistaken for approval', async () => {
  const fixture = makeFixture()
  try {
    rewritePackageFile(fixture, 'responses/medical.template.json', (template) => {
      template.approved = true
    })
    const { verifyReviewPackage } = await loadVerifier()
    assert.throws(
      () => verifyReviewPackage({ bookRoot, ...fixture }),
      /response template is not blank: medical/u,
    )
  } finally {
    fixture.cleanup()
  }
})

test('rejects album and guide entries that resolve to the same proof path', async () => {
  const fixture = makeFixture()
  try {
    rewriteManifest(fixture, (manifest) => {
      manifest.proofs[1].path = manifest.proofs[0].path
    })
    const { verifyReviewPackage } = await loadVerifier()
    assert.throws(
      () => verifyReviewPackage({ bookRoot, ...fixture }),
      /proof paths must be distinct/u,
    )
  } finally {
    fixture.cleanup()
  }
})

test('rejects self-rehashed frozen claim content that differs from the source registry', async () => {
  const fixture = makeFixture()
  try {
    rewritePackageFile(fixture, 'data/claims-frozen.json', (claims) => {
      claims[0].text = `${claims[0].text} Подмена.`
    })
    const { verifyReviewPackage } = await loadVerifier()
    assert.throws(
      () => verifyReviewPackage({ bookRoot, ...fixture }),
      /package differs from deterministic frozen source: data\/claims-frozen\.json/u,
    )
  } finally {
    fixture.cleanup()
  }
})

test('rejects manifest commit and proof declarations that differ from the frozen review cycle', async () => {
  const cases = [
    {
      mutateManifest: (manifest) => { manifest.gitCommit = '0'.repeat(40) },
      mutateDispatch: (dispatch) => { dispatch.gitCommit = '0'.repeat(40) },
      expected: /manifest gitCommit differs from review cycle/u,
    },
    {
      mutateManifest: (manifest) => { manifest.proofs[0].pages -= 1 },
      mutateDispatch: () => {},
      expected: /manifest proofs differ from review cycle/u,
    },
  ]
  const { verifyReviewPackage } = await loadVerifier()
  for (const scenario of cases) {
    const fixture = makeFixture()
    try {
      rewriteManifest(fixture, scenario.mutateManifest)
      const dispatch = JSON.parse(fs.readFileSync(fixture.dispatchPath, 'utf8'))
      scenario.mutateDispatch(dispatch)
      fs.writeFileSync(fixture.dispatchPath, `${JSON.stringify(dispatch, null, 2)}\n`)
      assert.throws(
        () => verifyReviewPackage({ bookRoot, ...fixture }),
        scenario.expected,
      )
    } finally {
      fixture.cleanup()
    }
  }
})
