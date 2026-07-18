# Pu-er Gift Book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать проверяемый редакционный пакет, полный текст, визуальные материалы, proof-PDF альбома на 208 страниц и отдельного гида на 48 страниц, а затем подготовить утверждённый пакет к профессиональному PDF/X-экспорту и тиражу 300 экземпляров.

**Architecture:** Книга живёт в каталоге `book/`, но использует единый с сайтом каталог источников. JSON-реестры хранят источники, утверждения, права и плоский план; Markdown хранит рукопись; Node-валидаторы не допускают битые ссылки, неправильную пагинацию и непроверенные права. Python/ReportLab создаёт воспроизводимые редакционные proof-PDF, а финальный PDF/X-4 экспортируется по требованиям выбранной типографии и проходит отдельный preflight.

**Tech Stack:** Node.js 24, TypeScript/Vitest для регрессии сайта, JSON + Markdown, Python 3.12, uv, ReportLab, Pillow, pypdf, pdfplumber, ImageMagick, Poppler для рендеринга и визуальной проверки, профессиональная DTP-система для финального PDF/X-4.

---

## Scope and execution boundaries

Этот план создаёт одну последовательную издательскую систему. Исследование, рукопись, права, визуалы и макет не выделяются в независимые подпроекты, потому что каждый этап блокирует следующий общими идентификаторами утверждений, изображений и разворотов.

Два обязательных внешних контрольных пункта:

1. До использования документальных фотографий владелец прав предоставляет письменную лицензию.
2. До финального PDF/X-экспорта типография предоставляет технические требования, ICC-профиль, допустимую суммарную красочность, формат вылетов и правила передачи фольги/тиснения.

Proof-PDF служит для редакционной, визуальной и пагинационной проверки. Он не выдаётся за финальный офсетный оригинал-макет.

## Target file structure

```text
book/
├── README.md
├── pyproject.toml
├── config/
│   ├── publication.json
│   ├── typography.json
│   └── palette.json
├── data/
│   ├── sources.json
│   ├── claims.json
│   ├── assets.json
│   ├── reviews.json
│   └── glossary.json
├── flatplan/
│   ├── album.json
│   ├── guide.json
│   └── templates.json
├── research/
│   ├── history.md
│   ├── production.md
│   ├── microbiology.md
│   ├── medicine.md
│   └── medical-search-log.csv
├── manuscript/
│   ├── album/
│   │   ├── 00-entry.md
│   │   ├── 01-living-mountain.md
│   │   ├── 02-roads-and-name.md
│   │   ├── 03-maocha.md
│   │   ├── 04-sheng-and-shou.md
│   │   ├── 05-microcosm.md
│   │   ├── 06-tea-and-body.md
│   │   ├── 07-tea-room.md
│   │   ├── 90-chronology.md
│   │   ├── 91-glossary.md
│   │   └── 92-bibliography.md
│   └── guide/
│       ├── 00-quick-start.md
│       ├── 01-choose-tea.md
│       ├── 02-tools-and-water.md
│       ├── 03-sheng.md
│       ├── 04-shou.md
│       ├── 05-simple-methods.md
│       ├── 06-tasting.md
│       └── 07-storage-and-safety.md
├── assets/
│   ├── previews/
│   ├── maps/
│   ├── diagrams/
│   ├── private/
│   └── fonts/
│       ├── LICENSES.md
│       └── files/
├── scripts/
│   ├── validate-data.mjs
│   ├── validate-manuscript.mjs
│   ├── generate-apparatus.mjs
│   ├── build_proof.py
│   ├── verify_pdf.py
│   └── make_contact_sheet.py
├── tests/
│   ├── data-validation.test.mjs
│   ├── manuscript-validation.test.mjs
│   └── test_pdf.py
├── production/
│   ├── printer-requirements.md
│   ├── prototype-review.md
│   └── preflight-report.md
├── output/
│   └── pdf/
└── tmp/
    └── pdfs/
```

Tracked files contain text, metadata, SVG, scripts and low-resolution previews. Licensed originals, font binaries, intermediate renders and output PDF files remain local unless their licences explicitly permit publication in the public repository.

### Task 1: Scaffold the publication workspace

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`
- Create: `book/README.md`
- Create: `book/config/publication.json`
- Create: `book/config/typography.json`
- Create: `book/config/palette.json`

- [ ] **Step 1: Write the repository exclusions**

Append exactly these paths to `.gitignore`:

```gitignore
book/assets/private/
book/assets/fonts/files/
book/output/
book/tmp/
book/.venv/
```

- [ ] **Step 2: Create publication metadata**

Create `book/config/publication.json`:

```json
{
  "title": "Пуэр. Живая гора",
  "subtitle": "Путь листа от древнего мифа до современной чашки",
  "language": "ru",
  "album": { "widthMm": 240, "heightMm": 300, "pages": 208, "bleedMm": 3 },
  "guide": { "widthMm": 150, "heightMm": 220, "pages": 48, "bleedMm": 3 },
  "edition": 300,
  "citationCutoffDaysBeforePress": 90,
  "manuscriptComplete": false
}
```

- [ ] **Step 3: Create design tokens**

Create `book/config/palette.json` with CMYK-neutral working RGB values for proofs:

```json
{
  "forest": "#253C32",
  "clay": "#91432D",
  "copper": "#B88A58",
  "paper": "#E9DECA",
  "ink": "#211A16"
}
```

Create `book/config/typography.json`:

```json
{
  "display": "Cormorant",
  "body": "Literata",
  "interface": "Manrope",
  "chinese": "Noto Serif CJK SC",
  "minimumBodyPointSize": 9.5,
  "minimumCaptionPointSize": 7.5
}
```

- [ ] **Step 4: Add book commands**

Add these scripts to `package.json` without changing existing scripts:

```json
"book:test": "node --test book/tests/*.test.mjs",
"book:validate:data": "node book/scripts/validate-data.mjs",
"book:validate": "npm run book:validate:data",
"book:apparatus": "node book/scripts/generate-apparatus.mjs"
```

- [ ] **Step 5: Document the workflow**

Create `book/README.md` with the fixed order: validate data, draft with claim markers, close reviews, secure rights, build proof, render proof, inspect pages, obtain printer requirements, export PDF/X, preflight.

- [ ] **Step 6: Verify JSON and existing site tests**

Run:

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node -e "for (const f of ['publication','typography','palette']) JSON.parse(require('fs').readFileSync('book/config/'+f+'.json','utf8')); console.log('book config ok')"
/Users/if/.nvm/versions/node/v24.14.1/bin/node node_modules/vitest/vitest.mjs run
```

Expected: `book config ok`; 12 tests pass.

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json book/README.md book/config
git commit -m "feat(book): scaffold publication workspace"
```

### Task 2: Build the source, claim, review, and rights validators

**Files:**
- Create: `book/data/sources.json`
- Create: `book/data/claims.json`
- Create: `book/data/reviews.json`
- Create: `book/data/assets.json`
- Create: `book/scripts/validate-data.mjs`
- Create: `book/tests/data-validation.test.mjs`

- [ ] **Step 1: Write failing validator tests**

Create `book/tests/data-validation.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node --test book/tests/data-validation.test.mjs
```

Expected: FAIL because `validate-data.mjs` does not exist.

- [ ] **Step 3: Implement the validator**

Create `book/scripts/validate-data.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'))
const oneOf = (value, values, label) => {
  if (!values.includes(value)) throw new Error(`${label}: ${value}`)
}

export function validateSources(sources) {
  const seen = new Set()
  for (const source of sources) {
    if (!source.id || !source.title || !source.href) throw new Error('source requires id, title, and href')
    if (seen.has(source.id)) throw new Error(`duplicate source id: ${source.id}`)
    seen.add(source.id)
    oneOf(source.status, ['candidate', 'checked', 'rejected'], 'invalid source status')
  }
  return seen
}

export function validateClaims(claims, sourceIds) {
  const seen = new Set()
  for (const claim of claims) {
    if (seen.has(claim.id)) throw new Error(`duplicate claim id: ${claim.id}`)
    seen.add(claim.id)
    oneOf(claim.evidence, ['legend', 'source', 'retrospective', 'hypothesis', 'modern', 'medical-a', 'medical-b', 'medical-c', 'medical-d', 'medical-e'], 'invalid evidence')
    oneOf(claim.status, ['draft', 'checked', 'verified', 'rejected'], 'invalid claim status')
    for (const sourceId of claim.sourceIds ?? []) {
      if (!sourceIds.has(sourceId)) throw new Error(`claim ${claim.id} references unknown source ${sourceId}`)
    }
  }
  return seen
}

export function validateReviews(reviews, claimIds, verifiedClaimIds) {
  const required = ['historian', 'technologist', 'medical']
  for (const review of reviews) {
    if (!claimIds.has(review.claimId)) throw new Error(`review references unknown claim ${review.claimId}`)
    oneOf(review.role, required, 'invalid review role')
    oneOf(review.status, ['pending', 'approved', 'changes-requested'], 'invalid review status')
  }
  for (const claimId of verifiedClaimIds) {
    for (const role of required) {
      if (!reviews.some((review) => review.claimId === claimId && review.role === role && review.status === 'approved')) {
        throw new Error(`missing required review: ${claimId}/${role}`)
      }
    }
  }
}

export function validateAssets(assets) {
  const seen = new Set()
  for (const asset of assets) {
    if (seen.has(asset.id)) throw new Error(`duplicate asset id: ${asset.id}`)
    seen.add(asset.id)
    oneOf(asset.kind, ['photo', 'archive', 'illustration', 'map', 'diagram'], 'invalid asset kind')
    oneOf(asset.rights, ['owned', 'licensed', 'public-domain', 'pending', 'rejected'], 'invalid asset rights')
    oneOf(asset.status, ['concept', 'preview', 'print-ready', 'rejected'], 'invalid asset status')
    if (asset.status === 'print-ready' && !['owned', 'licensed', 'public-domain'].includes(asset.rights)) {
      throw new Error(`print-ready asset requires cleared rights: ${asset.id}`)
    }
  }
  return seen
}

export function validateAll() {
  const sources = read('sources.json')
  const claims = read('claims.json')
  const reviews = read('reviews.json')
  const assets = read('assets.json')
  const sourceIds = validateSources(sources)
  const claimIds = validateClaims(claims, sourceIds)
  const verified = new Set(claims.filter((claim) => claim.status === 'verified').map((claim) => claim.id))
  validateReviews(reviews, claimIds, verified)
  validateAssets(assets)
  return { sources: sources.length, claims: claims.length, assets: assets.length }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const totals = validateAll()
  console.log(`book data ok: ${totals.sources} sources, ${totals.claims} claims, ${totals.assets} assets`)
}
```

- [ ] **Step 4: Seed valid data**

Create the four JSON arrays. `sources.json` starts with every entry currently in `src/content/sources.ts` and adds bibliographic fields `edition`, `pages`, `doi`, `accessedAt`, `status`, `siteVisible`, and `bookUse`. Existing public records remain `checked` so the site does not lose citations, but web retranscriptions of Chinese classics receive `bookUse: "access-copy"`; Task 4 adds critical editions before they can support the printed book. Start `claims.json`, `reviews.json`, and `assets.json` as valid empty arrays; verified records are added only after their review task.

- [ ] **Step 5: Run tests and full validation**

Run:

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node --test book/tests/data-validation.test.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs
```

Expected: 4 tests pass; the validator reports the seeded source count and zero claims/assets.

- [ ] **Step 6: Commit**

```bash
git add book/data book/scripts/validate-data.mjs book/tests/data-validation.test.mjs
git commit -m "feat(book): add evidence and rights registry"
```

### Task 3: Make the book source registry authoritative for the site

**Files:**
- Modify: `src/content/sources.ts`
- Modify: `src/lib/contentValidation.test.ts`
- Test: `src/lib/contentValidation.test.ts`

- [ ] **Step 1: Add a failing shared-source test**

Add a test asserting that `sources` contains only `siteVisible: true` and `status: 'checked'` records, that every source ID referenced by the site exists, and that no `bookUse: "rejected"` record is exposed.

- [ ] **Step 2: Run the focused test**

Run:

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node node_modules/vitest/vitest.mjs run src/lib/contentValidation.test.ts
```

Expected: FAIL because the site still owns an independent source array.

- [ ] **Step 3: Import checked site sources from JSON**

`tsconfig.app.json` already enables `resolveJsonModule`. Replace the literal array in `src/content/sources.ts` with this typed mapping from `../../book/data/sources.json`:

```ts
import rawSources from '../../book/data/sources.json'
import type { Source } from './types'

type BookSource = Source & {
  status: 'candidate' | 'checked' | 'rejected'
  siteVisible: boolean
  bookUse: 'core' | 'supporting' | 'access-copy' | 'rejected'
}

export const sources: Source[] = (rawSources as unknown as BookSource[])
  .filter((source) => source.siteVisible && source.status === 'checked' && source.bookUse !== 'rejected')
  .map(({ id, title, author, year, href, group, origin, note }) => ({
    id,
    title,
    author,
    year,
    href,
    group,
    origin,
    note,
  }))

export const sourceById = new Map(sources.map((source) => [source.id, source]))
```

- [ ] **Step 4: Run all site and book tests**

Run:

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node node_modules/vitest/vitest.mjs run
/Users/if/.nvm/versions/node/v24.14.1/bin/node --test book/tests/*.test.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node node_modules/typescript/bin/tsc -b
```

Expected: 12 site tests and 4 book tests pass; TypeScript reports no errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/sources.ts src/lib/contentValidation.test.ts book/data/sources.json
git commit -m "refactor: share verified sources with book"
```

### Task 4: Research and verify the historical-mythological corpus

**Files:**
- Create: `book/research/history.md`
- Modify: `book/data/sources.json`
- Modify: `book/data/claims.json`
- Modify: `book/data/reviews.json`

- [ ] **Step 1: Build the historical question list**

The research note must answer these exact questions with page-level citations: dating and textual history of the Shennong legend; earliest unambiguous evidence for tea consumption; meaning of 荼 versus 茶; Fan Chuo's Yinsheng passage; provenance of the “Wu Hou” claim; status of the cited Southern Song chronicle; Ruan Fu's retrospective statements; Zhao Xuemin's six mountains and medical language; administrative history of Pu'er; Zhuge Liang legends; Qing tribute tea; tea-horse routes and the modern construction of the singular “Ancient Tea-Horse Road”.

- [ ] **Step 2: Replace weak web witnesses**

For Fan Chuo, Zhao Xuemin, and Ruan Fu, record a critical printed edition or library facsimile with editor, publisher, year, volume, juan, and page. Keep the public web copy only as an access aid. If the purported “Wu Hou” or Southern Song wording cannot be located in a citable edition, mark the claim `rejected` and explain that the popular attribution remains unverified.

- [ ] **Step 3: Add claim records**

Each historical statement receives an ID beginning `hist-` and one evidence label: `legend`, `source`, `retrospective`, or `hypothesis`. The Shennong date is stored as legendary chronology, not an event date. “Исцеляет сто болезней” is stored as an attributed Qing-era medical representation, never a modern medical claim.

- [ ] **Step 4: Perform historian review**

Record the reviewer name, affiliation or qualification, date, and status for each history claim. Other roles remain `pending` until the cross-disciplinary review task; therefore these claims remain `checked`, not `verified`.

- [ ] **Step 5: Validate and commit**

Run `/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs`. Expected: no duplicate IDs or missing source links.

```bash
git add book/research/history.md book/data
git commit -m "docs(book): verify history and mythology corpus"
```

### Task 5: Research production, sheng/shou, microbiology, and storage

**Files:**
- Create: `book/research/production.md`
- Create: `book/research/microbiology.md`
- Modify: `book/data/sources.json`
- Modify: `book/data/claims.json`
- Modify: `book/data/reviews.json`

- [ ] **Step 1: Fix terminology and process boundaries**

Define 大叶种, 晒青毛茶, 杀青, 揉捻, 晒干, 蒸压, 生茶, 熟茶, 渥堆, 后发酵, and storage ageing. Explicitly separate plant-enzyme oxidation, microbial pile fermentation, and slower storage transformations.

- [ ] **Step 2: Verify the supplied Vinogrodsky excerpt claim by claim**

Retain supported descriptions of pan heating, rolling, sun drying, pile wetting, turning, drying, and sorting. Reject universal claims that genuine pu-erh must ferment 3-5 or 5-8 years, that abbreviated piling defines sheng, or that all pu-erh requires years before it is ready. Record the book excerpt as a popular secondary source, not the technical authority.

- [ ] **Step 3: Establish the modern shou chronology**

Use factory histories, standards, peer-reviewed technology papers, and named archival evidence. Where Menghai and Kunming development narratives disagree on year or authorship, write the disagreement rather than choosing a single heroic origin story.

- [ ] **Step 4: Build the microbiology dossier**

For each named genus or compound, store tea type, sampling method, fermentation stage, sample count, and whether the study is descriptive or causal. Do not describe one study's community as universal for all shou.

- [ ] **Step 5: Build the storage dossier**

Cover temperature, relative humidity, water activity, airflow, odours, light, pest control, and geographic storage traditions. Avoid a universal “optimal age”.

- [ ] **Step 6: Add technologist reviews, validate, and commit**

Run `/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs` and commit:

```bash
git add book/research/production.md book/research/microbiology.md book/data
git commit -m "docs(book): verify puer production and microbiology"
```

### Task 6: Rebuild the medical evidence chapter from a current search

**Files:**
- Create: `book/research/medicine.md`
- Create: `book/research/medical-search-log.csv`
- Modify: `book/data/sources.json`
- Modify: `book/data/claims.json`
- Modify: `book/data/reviews.json`

- [ ] **Step 1: Record a reproducible search**

The CSV columns are exactly:

```csv
searched_at,database,query,filters,result_count,screened_count,included_source_ids,reviewer
```

Search PubMed, Crossref, CNKI or an institutional Chinese index, WHO, EFSA, and official food-safety sources. Record the complete query string and date.

- [ ] **Step 2: Separate interventions**

Classify every human paper as brewed beverage, water extract, concentrated extract, isolated compound, or mixed intervention. Store dose, duration, sample size, comparator, primary outcome, attrition, adverse events, funding, registration, and risk-of-bias note.

- [ ] **Step 3: Apply the A-E scale**

Assign `medical-a` only to applicable current guidance; `medical-b` to systematic review; `medical-c` to human intervention/observational evidence; `medical-d` to animal, cell, chemical, or microbiome mechanism; `medical-e` to traditional representation. No level upgrades are inferred from exciting language in an abstract.

- [ ] **Step 4: Write safety conclusions**

Cover caffeine and sleep, pregnancy guidance, medicine interactions as a consultation prompt rather than a universal contraindication, food hygiene, mould damage, mycotoxin evidence, and safe home storage. State that tea does not replace diagnosis or treatment.

- [ ] **Step 5: Obtain medical review**

The medical reviewer approves wording, not merely source selection. All proposed efficacy sentences include absolute limitations, and extract studies are named as extract studies.

- [ ] **Step 6: Validate and commit**

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs
git add book/research/medicine.md book/research/medical-search-log.csv book/data
git commit -m "docs(book): rebuild medical evidence dossier"
```

### Task 7: Build the visual asset and rights register

**Files:**
- Modify: `book/data/assets.json`
- Modify: `book/scripts/validate-data.mjs`
- Create: `book/assets/previews/README.md`
- Create: `book/assets/fonts/LICENSES.md`
- Create: `book/tests/asset-dimensions.test.mjs`

- [ ] **Step 1: Define required asset metadata**

Every record contains `id`, `kind`, `title`, `creator`, `createdAt`, `location`, `sourceUrl`, `rights`, `licenseFile`, `creditLine`, `path`, `pixelWidth`, `pixelHeight`, `effectiveDpi`, `status`, and `spreadIds`.

- [ ] **Step 2: Add a failing print-resolution test**

The test must require at least 2906 × 3614 pixels for a full 246 × 306 mm page at 300 dpi and 5811 × 3614 pixels for a full-bleed 492 × 306 mm spread. An asset may pass at lower dimensions only when its registered placement is smaller and `effectiveDpi >= 300`.

- [ ] **Step 3: Implement effective-resolution validation**

Add `placementWidthMm` and `placementHeightMm` to print-ready raster records. Replace `validateAssets` in `book/scripts/validate-data.mjs` with:

```js
export const effectiveDpi = (pixels, millimetres) => pixels / (millimetres / 25.4)

export function validateAssets(assets) {
  const seen = new Set()
  for (const asset of assets) {
    if (seen.has(asset.id)) throw new Error(`duplicate asset id: ${asset.id}`)
    seen.add(asset.id)
    oneOf(asset.kind, ['photo', 'archive', 'illustration', 'map', 'diagram'], 'invalid asset kind')
    oneOf(asset.rights, ['owned', 'licensed', 'public-domain', 'pending', 'rejected'], 'invalid asset rights')
    oneOf(asset.status, ['concept', 'preview', 'print-ready', 'rejected'], 'invalid asset status')
    if (asset.status === 'print-ready' && !['owned', 'licensed', 'public-domain'].includes(asset.rights)) {
      throw new Error(`print-ready asset requires cleared rights: ${asset.id}`)
    }
    const raster = ['photo', 'archive', 'illustration'].includes(asset.kind)
    if (asset.status === 'print-ready' && raster) {
      const fields = ['pixelWidth', 'pixelHeight', 'placementWidthMm', 'placementHeightMm']
      if (fields.some((field) => !Number.isFinite(asset[field]) || asset[field] <= 0)) {
        throw new Error(`print-ready raster requires dimensions: ${asset.id}`)
      }
      const dpi = Math.min(
        effectiveDpi(asset.pixelWidth, asset.placementWidthMm),
        effectiveDpi(asset.pixelHeight, asset.placementHeightMm),
      )
      if (dpi < 300) throw new Error(`effective dpi below 300: ${asset.id} (${dpi.toFixed(1)})`)
    }
    if (asset.status === 'print-ready' && !raster && !asset.viewBox) {
      throw new Error(`print-ready vector requires viewBox: ${asset.id}`)
    }
  }
  return seen
}
```

- [ ] **Step 4: Register existing site images as concepts**

Add the four WebP files from `public/images/` with `status: "concept"`. Do not mark them print-ready; their dimensions are insufficient for unrestricted full-page use.

- [ ] **Step 5: Register the full shot and illustration list**

Include documentary landscape, botanical detail, production steps, tools, portrait/hand details, pressings, wrappers, water, tea liquor, six map plates, four process diagrams, two microbiology plates, two medical-evidence diagrams, Shennong gates, Zhuge Liang legend art, cover art, and guide spot illustrations.

- [ ] **Step 6: Record font licences**

For Cormorant, Literata, Manrope, and Noto Serif CJK SC, record exact font file version, licence URL, embedding permission, modification permission, and required attribution. Normalise the proof filenames to `Cormorant-Regular.ttf`, `Literata-Regular.ttf`, `Manrope-Regular.ttf`, and `NotoSerifSC-Regular.ttf`. Keep binaries under the ignored `book/assets/fonts/files/` directory.

- [ ] **Step 7: Run tests and commit metadata only**

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node --test book/tests/*.test.mjs
git add book/data/assets.json book/scripts/validate-data.mjs book/assets/previews/README.md book/assets/fonts/LICENSES.md book/tests/asset-dimensions.test.mjs
git commit -m "docs(book): add visual rights and resolution register"
```

### Task 8: Create and validate the 208/48-page flatplans

**Files:**
- Create: `book/flatplan/templates.json`
- Create: `book/flatplan/album.json`
- Create: `book/flatplan/guide.json`
- Modify: `book/scripts/validate-data.mjs`
- Modify: `book/tests/data-validation.test.mjs`

- [ ] **Step 1: Add failing pagination tests**

Tests must assert: album page sum is exactly 208; guide page sum is exactly 48; both totals are divisible by 16; page numbers are contiguous; every spread has a template; every required image ID exists; no chapter starts on a left page unless explicitly marked `allowedLeftStart`.

- [ ] **Step 2: Define reusable spread templates**

Templates: `chapter-gate`, `full-bleed-photo`, `photo-plus-essay`, `source-window`, `map`, `process`, `scientific-plate`, `object-atlas`, `quiet-text`, `bibliography`, `guide-recipe`, `guide-troubleshooting`, and `guide-safety`.

- [ ] **Step 3: Fill the album flatplan**

Allocate exactly 20 + 26 + 30 + 24 + 30 + 24 + 22 + 16 + 16 pages to entry, living mountain, roads/name, maocha, sheng/shou, microcosm, body, tea room, and apparatus. Every page receives an ID `A-P001` through `A-P208`. Reader-facing groups use `A-S001` for page 1, `A-S002` onward for pairs 2-3 through 206-207, and `A-S105` for page 208. Apparatus pages declare `apparatus: "chronology"`, `"glossary"`, or `"bibliography"` so generated text receives stable page markers.

- [ ] **Step 4: Fill the guide flatplan**

Allocate 48 pages across quick start, choosing tea, tools/water, sheng, shou, simple methods, tasting, and safety. Page IDs run `G-P001` through `G-P048`. Every recipe includes vessel volume, leaf mass, temperature range, first infusion range, and adjustment note.

- [ ] **Step 5: Implement validation, run tests, and commit**

Append this function to `book/scripts/validate-data.mjs`, then call it from `validateAll()` for album and guide:

```js
export function validateFlatplan(plan, expectedPages, templates, assetIds) {
  if (plan.totalPages !== expectedPages) throw new Error(`wrong page total: ${plan.totalPages}`)
  if (plan.totalPages % 16 !== 0) throw new Error(`page total must form 16-page signatures: ${plan.totalPages}`)
  if (plan.pages.length !== expectedPages) throw new Error(`flatplan page count mismatch: ${plan.pages.length}`)
  const pageIds = new Set()
  for (let index = 0; index < plan.pages.length; index += 1) {
    const page = plan.pages[index]
    const expectedNumber = index + 1
    if (page.number !== expectedNumber) throw new Error(`non-contiguous page number: ${page.number}`)
    if (pageIds.has(page.id)) throw new Error(`duplicate page id: ${page.id}`)
    pageIds.add(page.id)
    if (!templates.has(page.template)) throw new Error(`unknown template ${page.template} on page ${page.id}`)
    for (const assetId of page.assetIds ?? []) {
      if (!assetIds.has(assetId)) throw new Error(`unknown asset ${assetId} on page ${page.id}`)
    }
    if (page.chapterStart && page.number % 2 === 0 && !page.allowedLeftStart) {
      throw new Error(`chapter starts on left page without approval: ${page.id}`)
    }
  }
  return pageIds
}
```

Extend `validateAll()` with:

```js
const templates = new Set(JSON.parse(fs.readFileSync(path.join(root, 'flatplan/templates.json'), 'utf8')).map((item) => item.id))
const album = JSON.parse(fs.readFileSync(path.join(root, 'flatplan/album.json'), 'utf8'))
const guide = JSON.parse(fs.readFileSync(path.join(root, 'flatplan/guide.json'), 'utf8'))
const assetIds = new Set(assets.map((asset) => asset.id))
validateFlatplan(album, 208, templates, assetIds)
validateFlatplan(guide, 48, templates, assetIds)
```

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node --test book/tests/*.test.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs
git add book/flatplan book/scripts/validate-data.mjs book/tests/data-validation.test.mjs
git commit -m "feat(book): define validated album and guide flatplans"
```

### Task 9: Add manuscript claim-marker validation

**Files:**
- Create: `book/scripts/validate-manuscript.mjs`
- Create: `book/tests/manuscript-validation.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Test the marker formats `<!-- claim:hist-man-shu-001 -->` and `<!-- page:A-P001 -->`; reject unknown claim IDs, duplicate/unknown page IDs, common draft-marker words and tool citation tokens; flag a paragraph containing a four-digit year without a claim marker. Exempt bibliography entries and headings. Missing page markers become errors only after `publication.json` sets `manuscriptComplete` to `true`, allowing chapter-by-chapter drafting.

- [ ] **Step 2: Run the focused test**

Expected: FAIL because the validator does not exist.

- [ ] **Step 3: Implement manuscript validation**

Create `book/scripts/validate-manuscript.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const bookRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const markerPattern = /<!--\s*claim:([a-z0-9-]+)\s*-->/g
const pagePattern = /<!--\s*page:([AG]-P\d{3})\s*-->/g
const yearPattern = /\b(?:1[0-9]{3}|20[0-9]{2})\b/
const draftMarkers = ['TO' + 'DO', 'TB' + 'D']
const toolTokenPattern = /(?:turn\d+(?:search|fetch)\d+|cite|<in-app-browser-context)/

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return markdownFiles(target)
    return entry.isFile() && target.endsWith('.md') ? [target] : []
  })
}

export function validateText(text, file, claimIds) {
  const errors = []
  for (const marker of text.matchAll(markerPattern)) {
    if (!claimIds.has(marker[1])) errors.push(`${file}: unknown claim ${marker[1]}`)
  }
  for (const marker of draftMarkers) {
    if (text.includes(marker)) errors.push(`${file}: draft marker ${marker}`)
  }
  if (toolTokenPattern.test(text)) errors.push(`${file}: tool citation token`)
  if (!/(?:^|\/)9[12]-/.test(file)) {
    for (const paragraph of text.split(/\n\s*\n/)) {
      const trimmed = paragraph.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('```')) continue
      if (yearPattern.test(trimmed) && !markerPattern.test(trimmed)) {
        const line = text.slice(0, text.indexOf(paragraph)).split('\n').length
        errors.push(`${file}:${line}: year without claim marker`)
      }
      markerPattern.lastIndex = 0
    }
  }
  return errors
}

export function validateManuscript() {
  const claims = JSON.parse(fs.readFileSync(path.join(bookRoot, 'data/claims.json'), 'utf8'))
  const claimIds = new Set(claims.map((claim) => claim.id))
  const files = markdownFiles(path.join(bookRoot, 'manuscript'))
  const errors = files.flatMap((file) => validateText(fs.readFileSync(file, 'utf8'), path.relative(bookRoot, file), claimIds))
  const album = JSON.parse(fs.readFileSync(path.join(bookRoot, 'flatplan/album.json'), 'utf8'))
  const guide = JSON.parse(fs.readFileSync(path.join(bookRoot, 'flatplan/guide.json'), 'utf8'))
  const publication = JSON.parse(fs.readFileSync(path.join(bookRoot, 'config/publication.json'), 'utf8'))
  const expectedPages = new Set([...album.pages, ...guide.pages].map((page) => page.id))
  const seenPages = new Set()
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    for (const match of text.matchAll(pagePattern)) {
      if (!expectedPages.has(match[1])) errors.push(`${path.relative(bookRoot, file)}: unknown page ${match[1]}`)
      if (seenPages.has(match[1])) errors.push(`${path.relative(bookRoot, file)}: duplicate page ${match[1]}`)
      seenPages.add(match[1])
    }
  }
  if (publication.manuscriptComplete) {
    for (const pageId of expectedPages) {
      if (!seenPages.has(pageId)) errors.push(`missing manuscript page ${pageId}`)
    }
  }
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(`book manuscript ok: ${claimIds.size} registered claims, ${seenPages.size} page markers`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateManuscript()
```

- [ ] **Step 4: Extend the package validation command**

Add `"book:validate:manuscript": "node book/scripts/validate-manuscript.mjs"` and update `book:validate` to run `book:validate:data` followed by `book:validate:manuscript`.

- [ ] **Step 5: Run tests and commit**

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node --test book/tests/manuscript-validation.test.mjs
git add package.json book/scripts/validate-manuscript.mjs book/tests/manuscript-validation.test.mjs
git commit -m "test(book): validate manuscript evidence markers"
```

### Task 10: Write the entry, living mountain, and history chapters

**Files:**
- Create: `book/manuscript/album/00-entry.md`
- Create: `book/manuscript/album/01-living-mountain.md`
- Create: `book/manuscript/album/02-roads-and-name.md`
- Modify: `book/data/claims.json`

- [ ] **Step 1: Write the 20-page entry text**

Open with the sensory present, cross the Shennong myth, then explain the book's evidence labels. Keep the myth narratively whole before the critical commentary. Target 2,200-2,800 Russian words across the 10 spreads. Begin every page unit with its flatplan marker, for example `<!-- page:A-P001 -->`.

- [ ] **Step 2: Write “Живая гора”**

Cover Yunnan relief, monsoon ecology, tea botany, cultivated/forest continuums, old tea gardens, Jingmai, and the limits of tree-age claims. Target 3,000-3,800 words across 13 spreads.

- [ ] **Step 3: Write “Дороги и имя”**

Move from Fan Chuo through Qing sources, Pu'er administration, tribute, trade and modern authenticity. Clearly label retrospection. Target 3,500-4,300 words across 15 spreads.

- [ ] **Step 4: Validate prose and evidence**

Run both `/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs` and `/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-manuscript.mjs`. Every date, direct historical attribution and medical-sounding phrase must carry a registered claim marker.

- [ ] **Step 5: Editorial read and commit**

Perform one read for narrative continuity and one read only for evidence labels.

```bash
git add book/manuscript/album/00-entry.md book/manuscript/album/01-living-mountain.md book/manuscript/album/02-roads-and-name.md book/data/claims.json
git commit -m "docs(book): draft origins and history chapters"
```

### Task 11: Write maocha, sheng/shou, and microcosm chapters

**Files:**
- Create: `book/manuscript/album/03-maocha.md`
- Create: `book/manuscript/album/04-sheng-and-shou.md`
- Create: `book/manuscript/album/05-microcosm.md`
- Modify: `book/data/claims.json`

- [ ] **Step 1: Write “Рождение маоча”**

Follow one harvest through sha qing, rolling, sun drying, sorting, steaming, pressing and drying. Connect sensory change to process without universalising one factory method. Target 2,600-3,300 words. Begin every page unit with the matching `A-Pnnn` marker from the flatplan.

- [ ] **Step 2: Write “Два пути: шэн и шу”**

Use a shared maocha origin and a visual fork. Explain wodui as controlled moist-heat microbial processing, not “years compressed into days”; explain sheng ageing without promising automatic improvement. Target 3,400-4,200 words.

- [ ] **Step 3: Write “Микромир времени”**

Explain succession, moisture/heat, volatile formation, polyphenol transformation, storage environments and contamination risk. Target 2,800-3,500 words.

- [ ] **Step 4: Validate, technologist-read, and commit**

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-manuscript.mjs
git add book/manuscript/album/03-maocha.md book/manuscript/album/04-sheng-and-shou.md book/manuscript/album/05-microcosm.md book/data/claims.json
git commit -m "docs(book): draft craft and fermentation chapters"
```

### Task 12: Write medicine, tea room, and apparatus chapters

**Files:**
- Create: `book/manuscript/album/06-tea-and-body.md`
- Create: `book/manuscript/album/07-tea-room.md`
- Create: `book/manuscript/album/90-chronology.md`
- Create: `book/data/glossary.json`

- [ ] **Step 1: Write “Чай и тело”**

Begin with what is in the cup, then move from mechanisms to human evidence and safety. Every efficacy paragraph names evidence level, product form and limitation. Target 2,400-3,000 words. Begin every page unit with the matching `A-Pnnn` marker from the flatplan.

- [ ] **Step 2: Write “Чайная комната”**

Cover objects, hospitality, tasting language, collecting, counterfeit certainty, and living culture without turning the chapter into the practical guide. Target 1,700-2,200 words.

- [ ] **Step 3: Build chronology and glossary data**

Chronology includes evidence labels and the `A-Pnnn` markers assigned to `apparatus: "chronology"` pages. Glossary records Chinese, pinyin with tone marks, accepted Russian form, literal meaning, contextual definition, and source IDs.

- [ ] **Step 4: Medical and language review**

The medical reviewer checks chapter 6; the sinologist checks every Chinese term and the chronology.

- [ ] **Step 5: Validate and commit**

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-manuscript.mjs
git add book/manuscript/album/06-tea-and-body.md book/manuscript/album/07-tea-room.md book/manuscript/album/90-chronology.md book/data/glossary.json
git commit -m "docs(book): draft evidence and tea culture chapters"
```

### Task 13: Write the 48-page brewing guide

**Files:**
- Create: `book/manuscript/guide/00-quick-start.md`
- Create: `book/manuscript/guide/01-choose-tea.md`
- Create: `book/manuscript/guide/02-tools-and-water.md`
- Create: `book/manuscript/guide/03-sheng.md`
- Create: `book/manuscript/guide/04-shou.md`
- Create: `book/manuscript/guide/05-simple-methods.md`
- Create: `book/manuscript/guide/06-tasting.md`
- Create: `book/manuscript/guide/07-storage-and-safety.md`

- [ ] **Step 1: Write a tested quick-start recipe**

Give one forgiving sheng and one forgiving shou range. Test both with at least three teas of different compression and age; record adjustments in prose rather than promising one universal time. Begin every guide page unit with the matching `G-Pnnn` marker from the flatplan.

- [ ] **Step 2: Write choice, tools, and water sections**

Include smell/appearance warnings, essential versus optional tools, vessel substitutions, water mineralisation as a practical variable, and hygienic handling.

- [ ] **Step 3: Write sheng, shou, and simple-method recipes**

Every method records grams, millilitres, temperature range, first infusion range, number/length adjustment, and a troubleshooting note. Include gaiwan, teapot, mug, large-pot and thermos methods.

- [ ] **Step 4: Write tasting, storage, and safety sections**

Use aroma, taste, texture, aftertaste and bodily sensation without medicalising ordinary responses. Include caffeine timing, pregnancy guidance pointer, mould warning signs, odour isolation and household storage.

- [ ] **Step 5: Conduct table test and commit**

Print an A4 imposition mock, use it beside a kettle, and record changes needed for wet hands, distance, legibility and page finding.

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-manuscript.mjs
git add book/manuscript/guide
git commit -m "docs(book): draft removable brewing guide"
```

### Task 14: Generate bibliography and glossary pages from data

**Files:**
- Create: `book/scripts/generate-apparatus.mjs`
- Create: `book/tests/apparatus.test.mjs`
- Create: `book/manuscript/album/91-glossary.md`
- Create: `book/manuscript/album/92-bibliography.md`
- Modify: `book/config/publication.json`

- [ ] **Step 1: Write failing deterministic-output tests**

Tests require sources sorted by author/title, stable IDs preserved in HTML comments, DOI rendered as URL, Chinese primary texts grouped separately, and glossary sorted by pinyin then Chinese.

- [ ] **Step 2: Implement the generator**

Create `book/scripts/generate-apparatus.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'))
const write = (name, text) => fs.writeFileSync(path.join(root, 'manuscript/album', name), `${text.trim()}\n`)
const clean = (value = '') => String(value).trim()

const claims = read('claims.json')
const sources = read('sources.json')
const glossary = read('glossary.json')
const citedIds = new Set(claims.filter((claim) => claim.status !== 'rejected').flatMap((claim) => claim.sourceIds ?? []))
const cited = sources.filter((source) => citedIds.has(source.id))

for (const source of cited) {
  if (source.status !== 'checked') throw new Error(`cited source is not checked: ${source.id}`)
}

const groups = [
  ['primary-asian', 'Китайские первоисточники'],
  ['research-asian', 'Азиатские исследования'],
  ['research-western', 'Западные исследования'],
  ['guidance', 'Стандарты и рекомендации'],
]

const flatplan = JSON.parse(fs.readFileSync(path.join(root, 'flatplan/album.json'), 'utf8'))
const apparatusPages = (kind) => flatplan.pages.filter((page) => page.apparatus === kind)
const distribute = (items, pages) => {
  if (!pages.length) throw new Error('flatplan has no apparatus pages')
  return pages.map((page, index) => ({
    page,
    items: items.slice(Math.floor(index * items.length / pages.length), Math.floor((index + 1) * items.length / pages.length)),
  }))
}

const bibliographyItems = groups.flatMap(([group, title]) => cited
  .filter((source) => source.group === group)
  .sort((a, b) => `${a.author} ${a.title}`.localeCompare(`${b.author} ${b.title}`, 'ru'))
  .map((source) => {
    const doi = clean(source.doi) ? ` DOI: https://doi.org/${clean(source.doi).replace(/^https?:\/\/doi\.org\//, '')}.` : ''
    const edition = clean(source.edition) ? ` ${clean(source.edition)}.` : ''
    return `**${title}.** ${source.author}. *${source.title}*. ${source.year}.${edition}${doi} ${source.href} <!-- source:${source.id} -->`
  }))

const glossaryItems = [...glossary]
  .sort((a, b) => `${a.pinyin} ${a.chinese}`.localeCompare(`${b.pinyin} ${b.chinese}`, 'en'))
  .map((item) => `## ${item.russian} · ${item.chinese} · ${item.pinyin}\n\n${item.definition} <!-- source:${item.sourceIds.join(',')} -->`)

const renderPages = (title, items, pages) => [
  '<!-- generated: book/scripts/generate-apparatus.mjs -->',
  ...distribute(items, pages).map(({ page, items: pageItems }) => `<!-- page:${page.id} -->\n# ${title}\n\n${pageItems.join('\n\n')}`),
].join('\n\n')

write('91-glossary.md', renderPages('Словарь', glossaryItems, apparatusPages('glossary')))
write('92-bibliography.md', renderPages('Библиография', bibliographyItems, apparatusPages('bibliography')))
console.log(`apparatus generated: ${glossary.length} terms, ${cited.length} sources`)
```

The generator refuses any cited source whose status is not `checked`; it writes both Markdown files with a generated-file header and deterministic ordering.

- [ ] **Step 3: Generate and validate**

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/generate-apparatus.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node --test book/tests/*.test.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-manuscript.mjs
```

Expected: bibliography and glossary regenerate without diff on the second run.

After the generated apparatus supplies its assigned page markers and all album/guide pages validate, set `manuscriptComplete` to `true` in `book/config/publication.json` and run both validators again.

- [ ] **Step 4: Commit**

```bash
git add book/scripts/generate-apparatus.mjs book/tests/apparatus.test.mjs book/manuscript/album/91-glossary.md book/manuscript/album/92-bibliography.md book/config/publication.json
git commit -m "feat(book): generate bibliography and glossary"
```

### Task 15: Produce maps, diagrams, and print-resolution art

**Files:**
- Create: `book/assets/maps/yunnan-relief.svg`
- Create: `book/assets/maps/six-mountains.svg`
- Create: `book/assets/maps/tea-routes.svg`
- Create: `book/assets/diagrams/maocha-process.svg`
- Create: `book/assets/diagrams/sheng-shou-fork.svg`
- Create: `book/assets/diagrams/wodui-heat.svg`
- Create: `book/assets/diagrams/evidence-scale.svg`
- Create: `book/assets/diagrams/storage-map.svg`
- Modify: `book/data/assets.json`

- [ ] **Step 1: Establish cartographic source notes**

Every map record names projection, geographic dataset, administrative boundary date, interpretive reconstruction, and uncertainty note. Historical routes use differentiated solid/dashed styling for documented segments and interpretive connections.

- [ ] **Step 2: Draw maps as layered SVG**

Use separate groups for terrain, rivers, boundaries, tea regions, routes, labels, legend, scale, north arrow and sources. Chinese labels accompany Russian labels only where they improve identification.

- [ ] **Step 3: Draw process and evidence diagrams**

All diagrams remain legible at their registered physical placement and use shape plus labels, never colour alone. The microorganism plate is an explanatory diagram, not a simulated micrograph.

- [ ] **Step 4: Produce or license raster art**

Generate/commission mythological gates and cover art as explicitly illustrative work. License documentary photography separately. At 300 DPI, for full-page use require the strict ceiling 2906 × 3615 pixels; for spread use require 5812 × 3615 pixels. Store print originals locally under `book/assets/private/` and commit only rights records plus low-resolution previews. Interpolating a smaller source to those dimensions does not by itself make it print-ready.

- [ ] **Step 5: Review every caption and right, then commit**

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node --test book/tests/*.test.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-manuscript.mjs
git add book/assets/maps book/assets/diagrams book/assets/previews book/data/assets.json
git commit -m "feat(book): add maps diagrams and cleared art metadata"
```

### Task 16: Build deterministic proof PDFs

**Files:**
- Create: `book/pyproject.toml`
- Create: `book/scripts/build_proof.py`
- Create: `book/tests/test_pdf.py`

- [ ] **Step 1: Define Python dependencies**

Create `book/pyproject.toml`:

```toml
[project]
name = "puer-book-tools"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "pillow>=11,<13",
  "reportlab>=4.4,<5",
  "pypdf>=6,<7",
  "pdfplumber>=0.11,<1",
  "pytest>=8,<10"
]

[tool.uv]
package = false
```

- [ ] **Step 2: Write failing PDF tests**

Create `book/tests/test_pdf.py`:

```python
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]

def mm(value: float) -> float:
    return value * 72 / 25.4

def assert_pdf(path: Path, pages: int, width_mm: int, height_mm: int) -> None:
    reader = PdfReader(path)
    assert len(reader.pages) == pages
    first = reader.pages[0]
    assert abs(float(first.mediabox.width) - mm(width_mm + 6)) < 0.5
    assert abs(float(first.mediabox.height) - mm(height_mm + 6)) < 0.5
    for page in reader.pages:
        assert '/Resources' in page

def test_album_proof() -> None:
    assert_pdf(ROOT / 'output/pdf/puer-album-proof.pdf', 208, 240, 300)

def test_guide_proof() -> None:
    assert_pdf(ROOT / 'output/pdf/puer-guide-proof.pdf', 48, 150, 220)
```

- [ ] **Step 3: Run tests to verify failure**

```bash
uv sync --project book
uv run --project book pytest book/tests/test_pdf.py -q
```

Expected: FAIL because proof PDFs do not exist.

- [ ] **Step 4: Implement proof rendering**

Review correction after Task 15: these files are editorial layout proofs, not
print proofs. A committed low-resolution illustration preview may appear only
with a visible `PREVIEW · NOT PRINT-READY` label. Preview SVGs, concepts and
missing/uncleared documentary materials render as designed placeholder cards
that name their status and gate; the builder never reads ignored private assets
to make a clean layout proof pass. Final print export still blocks on every
uncleared or non-print-ready asset. The implementation in
`book/scripts/build_proof.py` is normative where the earlier sketch below uses
the stricter print-master-only `asset_path` helper.

Create `book/scripts/build_proof.py`:

```python
from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

BOOK = Path(__file__).resolve().parents[1]
REPO = BOOK.parent
MM = 72 / 25.4
PAGE_RE = re.compile(r'<!--\s*page:([AG]-P\d{3})\s*-->')
CLAIM_RE = re.compile(r'<!--\s*claim:([a-z0-9-]+)\s*-->')
COMMENT_RE = re.compile(r'<!--.*?-->', re.S)
HAN_RE = re.compile(r'([\u3400-\u9fff]+)')


def load_json(relative: str):
    return json.loads((BOOK / relative).read_text(encoding='utf-8'))


def register_fonts() -> None:
    font_dir = BOOK / 'assets/fonts/files'
    fonts = {
        'Cormorant': 'Cormorant-Regular.ttf',
        'Literata': 'Literata-Regular.ttf',
        'Manrope': 'Manrope-Regular.ttf',
        'NotoSerifSC': 'NotoSerifSC-Regular.ttf',
    }
    for name, filename in fonts.items():
        path = font_dir / filename
        if not path.exists():
            raise FileNotFoundError(f'missing font: {path}')
        pdfmetrics.registerFont(TTFont(name, path))


def manuscript_pages(folder: str) -> dict[str, str]:
    pages: dict[str, str] = {}
    for path in sorted((BOOK / 'manuscript' / folder).glob('*.md')):
        text = path.read_text(encoding='utf-8')
        matches = list(PAGE_RE.finditer(text))
        for index, match in enumerate(matches):
            page_id = match.group(1)
            if page_id in pages:
                raise ValueError(f'duplicate manuscript page: {page_id}')
            end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            pages[page_id] = text[match.end():end].strip()
    return pages


def paragraph_markup(markdown: str) -> str:
    text = CLAIM_RE.sub('', markdown)
    text = COMMENT_RE.sub('', text)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.M)
    text = re.sub(r'^[-*]\s+', '• ', text, flags=re.M)
    text = html.escape(text)
    text = HAN_RE.sub(r'<font name="NotoSerifSC">\1</font>', text)
    return re.sub(r'\n{2,}', '<br/><br/>', text).replace('\n', '<br/>')


def asset_path(asset: dict) -> Path:
    relative = asset.get('proofPath') or asset.get('path')
    if not relative:
        raise ValueError(f'asset has no proof path: {asset["id"]}')
    path = REPO / relative
    if path.suffix.lower() == '.svg':
        raise ValueError(f'SVG requires raster proofPath: {asset["id"]}')
    if not path.exists():
        raise FileNotFoundError(f'missing asset file: {path}')
    if asset.get('status') != 'print-ready':
        raise ValueError(f'asset is not print-ready: {asset["id"]}')
    return path


def crop_marks(canvas: Canvas, width: float, height: float, bleed: float) -> None:
    canvas.saveState()
    canvas.setStrokeColor(HexColor('#211A16'))
    canvas.setLineWidth(0.25)
    trim_x, trim_y = bleed, bleed
    trim_w, trim_h = width - 2 * bleed, height - 2 * bleed
    mark = 5 * MM
    gap = 1.5 * MM
    for x in (trim_x, trim_x + trim_w):
        canvas.line(x, trim_y - gap, x, max(0, trim_y - mark))
        canvas.line(x, trim_y + trim_h + gap, x, min(height, trim_y + trim_h + mark))
    for y in (trim_y, trim_y + trim_h):
        canvas.line(trim_x - gap, y, max(0, trim_x - mark), y)
        canvas.line(trim_x + trim_w + gap, y, min(width, trim_x + trim_w + mark), y)
    canvas.restoreState()


def draw_page(canvas: Canvas, page: dict, body: str, assets: dict, size: tuple[float, float], bleed: float, marks: bool) -> None:
    width, height = size
    paper, forest, clay = HexColor('#E9DECA'), HexColor('#253C32'), HexColor('#91432D')
    canvas.setFillColor(forest if page['template'] == 'chapter-gate' else paper)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    inset = bleed + 16 * MM
    content_w = width - 2 * inset
    content_h = height - 2 * inset
    asset_ids = page.get('assetIds', [])
    if asset_ids:
        asset = assets[asset_ids[0]]
        image = ImageReader(asset_path(asset))
        if page['template'] == 'full-bleed-photo':
            canvas.drawImage(image, 0, 0, width, height, preserveAspectRatio=True, anchor='c', mask='auto')
            canvas.saveState()
            canvas.setFillColor(HexColor('#211A16'))
            canvas.setFillAlpha(0.82)
            canvas.rect(0, 0, width, 95 * MM, fill=1, stroke=0)
            canvas.restoreState()
            text_y, text_h = 18 * MM, 65 * MM
        else:
            image_w = content_w * 0.45
            canvas.drawImage(image, inset + content_w - image_w, inset + content_h * 0.38, image_w, content_h * 0.62, preserveAspectRatio=True, anchor='c', mask='auto')
            content_w *= 0.5
            text_y, text_h = inset, content_h * 0.72
    else:
        text_y, text_h = inset, content_h * 0.72
    title_color = white if page['template'] in {'chapter-gate', 'full-bleed-photo'} else clay
    body_color = white if page['template'] in {'chapter-gate', 'full-bleed-photo'} else HexColor('#211A16')
    canvas.setFillColor(title_color)
    canvas.setFont('Cormorant', 24)
    canvas.drawString(inset, height - inset - 16, page.get('title', page['id']))
    style = ParagraphStyle('body', fontName='Literata', fontSize=9.5, leading=13, textColor=body_color, alignment=TA_LEFT)
    paragraph = Paragraph(paragraph_markup(body), style)
    _, needed_h = paragraph.wrap(content_w, text_h)
    if needed_h > text_h:
        raise ValueError(f'text overflow on {page["id"]}: {needed_h:.1f}>{text_h:.1f}')
    paragraph.drawOn(canvas, inset, text_y + text_h - needed_h)
    if page['template'] != 'chapter-gate':
        canvas.setFillColor(body_color)
        canvas.setFont('Manrope', 7.5)
        canvas.drawRightString(width - inset, bleed + 7 * MM, str(page['number']))
    canvas.bookmarkPage(page['id'])
    if marks:
        crop_marks(canvas, width, height, bleed)
    canvas.showPage()


def set_page_boxes(source: Path, target: Path, trim_width_mm: int, trim_height_mm: int, bleed_mm: int) -> None:
    reader, writer = PdfReader(source), PdfWriter()
    bleed = bleed_mm * MM
    trim = RectangleObject([bleed, bleed, bleed + trim_width_mm * MM, bleed + trim_height_mm * MM])
    for page in reader.pages:
        page.trimbox = trim
        page.bleedbox = page.mediabox
        writer.add_page(page)
    with target.open('wb') as stream:
        writer.write(stream)


def build(kind: str, flatplan_name: str, manuscript_folder: str, output_name: str, marks: bool) -> None:
    publication = load_json('config/publication.json')[kind]
    flatplan = load_json(f'flatplan/{flatplan_name}')
    pages = manuscript_pages(manuscript_folder)
    assets = {asset['id']: asset for asset in load_json('data/assets.json')}
    bleed_mm = publication['bleedMm']
    size = ((publication['widthMm'] + bleed_mm * 2) * MM, (publication['heightMm'] + bleed_mm * 2) * MM)
    output_dir = BOOK / 'output/pdf'
    output_dir.mkdir(parents=True, exist_ok=True)
    temporary = output_dir / f'.{output_name}.tmp.pdf'
    final = output_dir / output_name
    canvas = Canvas(str(temporary), pagesize=size, pageCompression=1)
    canvas.setAuthor('Пуэр. Живая гора — editorial proof')
    canvas.setTitle('Пуэр. Живая гора — editorial proof')
    for page in flatplan['pages']:
        if page['id'] not in pages:
            raise ValueError(f'missing manuscript page: {page["id"]}')
        draw_page(canvas, page, pages[page['id']], assets, size, bleed_mm * MM, marks)
    canvas.save()
    set_page_boxes(temporary, final, publication['widthMm'], publication['heightMm'], bleed_mm)
    temporary.unlink()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--reviewer-marks', action='store_true')
    args = parser.parse_args()
    register_fonts()
    build('album', 'album.json', 'album', 'puer-album-proof.pdf', args.reviewer_marks)
    build('guide', 'guide.json', 'guide', 'puer-guide-proof.pdf', args.reviewer_marks)


if __name__ == '__main__':
    main()
```

The renderer reads publication config, flatplans, page-marked manuscripts,
assets and typography inputs; registers all four local licensed proof fonts;
creates page boxes including 3 mm bleed; draws crop marks only in reviewer mode;
renders page numbers and a visible editorial-proof footer; and writes stable
proof filenames with invariant metadata. Missing fonts, missing page markers
and text overflow below the documented proof minimum block the build. Missing
or uncleared visuals become labelled placeholders and remain explicit
production gates. Claim markers are stripped from visible copy.

- [ ] **Step 5: Build and test proofs**

```bash
uv run --project book python book/scripts/build_proof.py
uv run --project book pytest book/tests/test_pdf.py -q
```

Expected: both PDFs exist; 208 and 48 pages; page dimensions include bleed; all tests pass.

- [ ] **Step 6: Commit code, not output PDFs**

```bash
git add .gitignore book/pyproject.toml book/uv.lock book/scripts/build_proof.py book/tests/test_pdf.py docs/superpowers/plans/2026-07-17-puer-gift-book.md
git commit -m "feat(book): generate deterministic proof PDFs"
```

### Task 17: Render and visually inspect every proof page

**Files:**
- Create: `book/scripts/verify_pdf.py`
- Create: `book/scripts/make_contact_sheet.py`
- Create: `book/production/preflight-report.md`

- [ ] **Step 1: Install or locate Poppler**

Run `command -v pdftoppm` and `command -v pdfinfo`. If absent on macOS, install `poppler` with Homebrew after approval. Record tool versions in the preflight report.

- [ ] **Step 2: Add automated PDF checks**

Create `book/scripts/verify_pdf.py`:

```python
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

BOOK = Path(__file__).resolve().parents[1]
MM = 72 / 25.4


def load(relative: str):
    return json.loads((BOOK / relative).read_text(encoding='utf-8'))


def close(a: float, b: float) -> bool:
    return abs(a - b) < 0.5


def check_fonts(path: Path) -> list[str]:
    tool = shutil.which('pdffonts')
    if not tool:
        return ['pdffonts is unavailable']
    result = subprocess.run([tool, str(path)], check=True, capture_output=True, text=True)
    errors = []
    for line in result.stdout.splitlines()[2:]:
        columns = line.split()
        if len(columns) >= 6 and columns[-3].lower() != 'yes':
            errors.append(f'font is not embedded: {columns[0]}')
    return errors


def verify(path: Path, kind: str, flatplan_name: str) -> list[str]:
    config = load('config/publication.json')[kind]
    flatplan = load(f'flatplan/{flatplan_name}')
    reader = PdfReader(path)
    errors = []
    expected_width = (config['widthMm'] + config['bleedMm'] * 2) * MM
    expected_height = (config['heightMm'] + config['bleedMm'] * 2) * MM
    if len(reader.pages) != config['pages']:
        errors.append(f'{path.name}: pages {len(reader.pages)} != {config["pages"]}')
    for index, page in enumerate(reader.pages):
        if not close(float(page.mediabox.width), expected_width) or not close(float(page.mediabox.height), expected_height):
            errors.append(f'{path.name}:{index + 1}: wrong MediaBox')
        if not close(float(page.trimbox.width), config['widthMm'] * MM) or not close(float(page.trimbox.height), config['heightMm'] * MM):
            errors.append(f'{path.name}:{index + 1}: wrong TrimBox')
        if page.bleedbox != page.mediabox:
            errors.append(f'{path.name}:{index + 1}: BleedBox differs from MediaBox')
    with pdfplumber.open(path) as document:
        for index, page in enumerate(document.pages):
            template = flatplan['pages'][index]['template']
            if template != 'full-bleed-photo' and not (page.extract_text() or '').strip():
                errors.append(f'{path.name}:{index + 1}: text-bearing page has no extractable text')
    errors.extend(check_fonts(path))
    return errors


def main() -> None:
    supplied = [Path(value) for value in sys.argv[1:]]
    paths = supplied or [BOOK / 'output/pdf/puer-album-proof.pdf', BOOK / 'output/pdf/puer-guide-proof.pdf']
    if len(paths) != 2:
        raise SystemExit('pass album and guide proof paths')
    errors = verify(paths[0], 'album', 'album.json') + verify(paths[1], 'guide', 'guide.json')
    if errors:
        raise SystemExit('\n'.join(errors))
    print('proof pdf verification passed; files are editorial proofs, not PDF/X')


if __name__ == '__main__':
    main()
```

It checks page counts, MediaBox/TrimBox/BleedBox consistency, embedded fonts and non-empty text on text-bearing templates. Image-file existence and placement bounds are already build-time failures. The result is labelled `proof`, never `PDF/X`.

- [ ] **Step 3: Render all pages**

Use:

```bash
mkdir -p book/tmp/pdfs/album book/tmp/pdfs/guide
pdftoppm -png -r 110 book/output/pdf/puer-album-proof.pdf book/tmp/pdfs/album/page
pdftoppm -png -r 110 book/output/pdf/puer-guide-proof.pdf book/tmp/pdfs/guide/page
```

Expected: 208 album PNGs and 48 guide PNGs.

- [ ] **Step 4: Build contact sheets and inspect**

Create `book/scripts/make_contact_sheet.py`:

```python
from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw


def build(folder: Path, output: Path, columns: int = 6) -> None:
    files = sorted(folder.glob('*.png'))
    if not files:
        raise SystemExit(f'no PNG pages in {folder}')
    thumb_w, thumb_h, label_h, gap = 180, 230, 20, 12
    rows = math.ceil(len(files) / columns)
    sheet = Image.new('RGB', (gap + columns * (thumb_w + gap), gap + rows * (thumb_h + label_h + gap)), '#d9c9b5')
    draw = ImageDraw.Draw(sheet)
    for index, file in enumerate(files):
        image = Image.open(file).convert('RGB')
        image.thumbnail((thumb_w, thumb_h))
        x = gap + (index % columns) * (thumb_w + gap)
        y = gap + (index // columns) * (thumb_h + label_h + gap)
        sheet.paste(image, (x + (thumb_w - image.width) // 2, y))
        draw.text((x, y + thumb_h + 3), f'{index + 1:03d} · {file.name}', fill='#211a16')
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=92)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('usage: make_contact_sheet.py <png-folder> <output.jpg>')
    build(Path(sys.argv[1]), Path(sys.argv[2]))
```

Run it for album and guide, then inspect every page at thumbnail scale for rhythm and every map, scientific plate, chapter gate, full-bleed image, bibliography page and guide recipe at full resolution. Record page-specific findings in `preflight-report.md`.

- [ ] **Step 5: Fix every defect and re-render**

Acceptance requires zero clipped text, overlaps, black glyph boxes, missing images, unreadable captions, broken folios, orphan headings or image-credit omissions.

- [ ] **Step 6: Commit QA tools and report**

```bash
git add book/scripts/verify_pdf.py book/scripts/make_contact_sheet.py book/production/preflight-report.md
git commit -m "test(book): add visual proof preflight"
```

### Task 18: Close the three specialist reviews

**Files:**
- Modify: `book/data/reviews.json`
- Modify: `book/data/claims.json`
- Modify: `book/manuscript/album/*.md`
- Modify: `book/manuscript/guide/*.md`
- Create: `book/production/review-closeout.md`

- [ ] **Step 1: Send frozen review PDFs and claim exports**

Each reviewer receives the same proof version hash, relevant claim export, full bibliography and explicit deadline. Comments are recorded by page and claim ID.

- [ ] **Step 2: Resolve historian comments**

Update original quotations, translations, dates, retrospection labels and myth boundaries; regenerate apparatus; record resolution.

- [ ] **Step 3: Resolve technologist comments**

Update production, fermentation, storage, microbial universality and safety language; update diagrams and captions.

- [ ] **Step 4: Resolve medical comments**

Update effect wording, intervention type, sample size, safety and conflict-of-interest notes. Remove any statement the evidence cannot support.

- [ ] **Step 5: Mark claims verified only after all three approvals**

Run both book validators; the data validator must reject a verified claim missing any required approval.

- [ ] **Step 6: Rebuild, re-render, and commit**

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/generate-apparatus.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-manuscript.mjs
uv run --project book python book/scripts/build_proof.py
uv run --project book pytest book/tests/test_pdf.py -q
git add book/data book/manuscript book/production/review-closeout.md
git commit -m "docs(book): close specialist editorial reviews"
```

### Task 19: Prototype the physical object and select the printer

**Files:**
- Create: `book/production/printer-requirements.md`
- Create: `book/production/prototype-review.md`
- Modify: `book/config/publication.json`

- [ ] **Step 1: Request three comparable quotes**

All quotes use 300 copies, 240 × 300 mm, 208 pages, sewn hardcover, dark green book cloth, copper foil, blind embossing, one ribbon, 140-150 g/m² matte stock, printed endpapers, integrated guide pocket, and 48-page 150 × 220 mm guide. Ask separately for paper alternatives and replacement cost per copy.

- [ ] **Step 2: Record printer-specific requirements**

Capture ICC profile, PDF/X flavour, bleed, trim/crop marks, rich-black recipe, total area coverage, minimum foil line/knockout, embossing die limits, spine calculation, binding creep, imposition signature, overprint rules and packaging.

- [ ] **Step 3: Build a white dummy**

Use the proposed paper bulk, board and pocket construction. Test weight, opening, gutter loss, guide removal, pocket durability, shelf stance and shipping fit.

- [ ] **Step 4: Produce a contract colour proof and cover test**

Include dark forest gradients, skin/hand tones, tea liquor, maps, fine labels, archive sepia, copper foil, blind embossing and red seal. Record approval or exact corrections.

- [ ] **Step 5: Update production config and commit**

Only confirmed values enter `publication.json`; retain quote date and printer requirement version.

```bash
git add book/production/printer-requirements.md book/production/prototype-review.md book/config/publication.json
git commit -m "docs(book): record printer and prototype decisions"
```

### Task 20: Export and approve the final print package

**Files:**
- Create: `book/production/final-package-manifest.json`
- Modify: `book/production/preflight-report.md`

- [ ] **Step 1: Export final DTP files**

Place text, cleared CMYK images, vector maps, fonts and cover dielines in the selected professional DTP project. Apply the printer's ICC/profile and export the requested PDF/X flavour. Keep foil and blind embossing as named spot-colour separation files if required by the printer.

- [ ] **Step 2: Preflight album, guide, cover and finishing plates**

Verify page counts, trim/bleed boxes, embedded fonts, output intent, image effective resolution, total ink coverage, overprint, transparency, hairlines, spot names, spine width, barcode if used, credits and blank pages.

- [ ] **Step 3: Create a checksum manifest**

`final-package-manifest.json` records filename, SHA-256, bytes, page count, trim, bleed, profile, export preset, created date, proof approval reference and printer requirement version.

- [ ] **Step 4: Obtain printer preflight approval**

Do not authorise plates until the printer returns a written preflight pass and the approved proof/reference is attached to the job.

- [ ] **Step 5: Approve one production sample**

Check binding, cloth, foil registration, emboss depth, colour, trimming, pocket and guide before authorising the remaining run when the printer offers this checkpoint.

- [ ] **Step 6: Archive and commit metadata**

Commit the manifest and textual report, not licensed image binaries or large final PDFs in the public repository.

```bash
git add book/production/final-package-manifest.json book/production/preflight-report.md
git commit -m "docs(book): archive final print package manifest"
```

## Final verification sequence

Run from the book worktree after Task 20:

```bash
/Users/if/.nvm/versions/node/v24.14.1/bin/node node_modules/vitest/vitest.mjs run
/Users/if/.nvm/versions/node/v24.14.1/bin/node --test book/tests/*.test.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-data.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node book/scripts/validate-manuscript.mjs
/Users/if/.nvm/versions/node/v24.14.1/bin/node node_modules/typescript/bin/tsc -b
/Users/if/.nvm/versions/node/v24.14.1/bin/node node_modules/vite/bin/vite.js build
uv run --project book pytest book/tests/test_pdf.py -q
uv run --project book python book/scripts/verify_pdf.py book/output/pdf/puer-album-proof.pdf book/output/pdf/puer-guide-proof.pdf
git status --short
```

Expected:

- 12 existing site tests pass;
- every Node book test passes;
- all source, claim, review, rights, manuscript and flatplan validators pass;
- TypeScript and Vite production build pass;
- proof PDFs contain exactly 208 and 48 pages at bleed dimensions;
- visual review reports zero open defects;
- final print manifest matches printer-approved files;
- working tree is clean.
