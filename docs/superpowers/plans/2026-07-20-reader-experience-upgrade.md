# Reader Experience Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the book and site reader experience while preserving the existing evidence registry, specialist stop-gates and reproducible publication workflow.

**Architecture:** Keep `book/data/` and editorial proofs as the audit source of truth. Add reader-facing structure in manuscript and React components, and add an explicit reader-proof rendering policy instead of deleting production metadata from the editorial workflow. All behavior changes begin with failing tests.

**Tech Stack:** Markdown, JSON, React, TypeScript, Vitest, Node.js test runner, Python/ReportLab, pytest, Playwright.

---

### Task 1: Rebuild the concise guide around a novice reader

**Files:**
- Modify: `book/manuscript/guide/00-quick-start.md`
- Modify: `book/manuscript/guide/01-choose-tea.md`
- Modify: `book/manuscript/guide/02-tools-and-water.md`
- Modify: `book/manuscript/guide/03-sheng.md`
- Modify: `book/manuscript/guide/04-shou.md`
- Modify: `book/manuscript/guide/05-simple-methods.md`
- Modify: `book/manuscript/guide/06-tasting.md`
- Modify: `book/manuscript/guide/07-storage-and-safety.md`
- Modify: `book/tests/specialist-content.test.mjs`
- Modify: `book/tests/manuscript-validation.test.mjs`

- [ ] **Step 1: Write failing guide-contract tests**

Add assertions that G-P001 introduces audience, tools and sheng/shou identification before numeric recipes; forbids the phrase `безопасная чашка`; requires `стартовый диапазон`, `адаптивная настройка`, and `контролируемое сравнение`; and requires a final whole-guide checkpoint.

- [ ] **Step 2: Run the focused tests and verify RED**

```bash
node --test book/tests/specialist-content.test.mjs book/tests/manuscript-validation.test.mjs
```

Expected: failures naming the missing reader contract and forbidden safety wording.

- [ ] **Step 3: Implement the reader-first opening**

Use this content order on G-P001–G-P006: who the guide is for; minimal tools; how to identify labelled sheng/shou or proceed when unknown; bounded safety check; starting-range cards; adaptive adjustment versus fresh-portion comparison.

- [ ] **Step 4: Normalize the recipe card prose**

Every recipe must expose the same reader-visible fields in separate paragraphs: `Стартовый диапазон`, `Наблюдайте`, `Первая коррекция`, `Остановитесь`, `Для сравнения`.

- [ ] **Step 5: Add operational section endings**

Close each guide section with `Сделайте`, `Запишите`, and `Остановитесь`; make G-P048 summarize the whole guide rather than storage alone.

- [ ] **Step 6: Run focused and full book tests**

```bash
node --test book/tests/specialist-content.test.mjs book/tests/manuscript-validation.test.mjs
node --test book/tests/*.test.mjs
```

- [ ] **Step 7: Commit**

```bash
git add book/manuscript/guide book/tests/specialist-content.test.mjs book/tests/manuscript-validation.test.mjs
git commit -m "edit(book): make brewing guide novice-first"
```

### Task 2: Create a clean reader-proof policy

**Files:**
- Modify: `book/scripts/build_proof.py`
- Modify: `book/tests/test_pdf.py`
- Modify: `book/tests/test_preflight.py`
- Modify: `book/README.md`
- Generate: `book/output/pdf/puer-album-reader-proof.pdf`
- Generate: `book/output/pdf/puer-guide-reader-proof.pdf`

- [ ] **Step 1: Write failing policy tests**

Add tests for a `reader` proof mode that suppresses page-role text, claim/source registry bands, commission-brief prose, `prepared-not-dispatched` and the internal proof footer, while retaining a concise `READER PROOF · NOT PRINT-READY` footer and exact page counts.

- [ ] **Step 2: Run pytest and verify RED**

```bash
book/.venv/bin/pytest book/tests/test_pdf.py book/tests/test_preflight.py -q
```

- [ ] **Step 3: Add an explicit rendering policy**

Introduce a small proof-mode value object with `editorial` and `reader` variants. Keep the current default unchanged; route role text, claim bands, placeholders and footer copy through the policy.

- [ ] **Step 4: Render unresolved visuals honestly**

In reader mode, show a neutral caption `Иллюстрация готовится к финальному изданию` without internal asset IDs, briefs or production instructions. Do not imply that the art is licensed or final.

- [ ] **Step 5: Document both modes and build the reader PDFs**

```bash
book/.venv/bin/python book/scripts/build_proof.py --mode reader
```

- [ ] **Step 6: Verify PDFs and run Python tests**

```bash
book/.venv/bin/pytest book/tests -q
book/.venv/bin/python book/scripts/verify_pdf.py
```

- [ ] **Step 7: Commit**

```bash
git add book/scripts/build_proof.py book/tests book/README.md
git commit -m "feat(book): add reader-facing proof mode"
```

### Task 3: Tighten the album reader contract and historical apparatus

**Files:**
- Modify: `book/manuscript/album/00-entry.md`
- Modify: `book/manuscript/album/01-living-mountain.md`
- Modify: `book/manuscript/album/02-roads-and-name.md`
- Modify: `book/manuscript/album/03-maocha.md`
- Modify: `book/manuscript/album/04-sheng-and-shou.md`
- Modify: `book/manuscript/album/05-microcosm.md`
- Modify: `book/manuscript/album/06-tea-and-body.md`
- Modify: `book/manuscript/album/07-tea-room.md`
- Modify: `book/data/sources.json`
- Modify: `book/data/claims.json`
- Modify: `book/tests/specialist-content.test.mjs`
- Modify: `book/tests/data-validation.test.mjs`

- [ ] **Step 1: Write failing album-contract tests**

Require an explicit reader promise within A-P001–A-P006, one compact checkpoint at the end of every major chapter, no reader-visible `draft`, and a deliberate evidentiary role for the Ruan Fu record.

- [ ] **Step 2: Verify RED with focused Node tests**

```bash
node --test book/tests/specialist-content.test.mjs book/tests/data-validation.test.mjs
```

- [ ] **Step 3: Move the reader promise forward**

Keep the sensory opening, but add a concise audience/scope/result paragraph by A-P006 and point to the evidence legend before its first repeated use.

- [ ] **Step 4: Add chapter checkpoints**

Use the gift-album form `После этой главы видно:` followed by three short observations on A-P046, A-P076, A-P100, A-P130, A-P154, A-P176 and A-P192.

- [ ] **Step 5: Reduce repetitive evidence prose**

Keep claim markers in Markdown for registry validation, but consolidate repeated cautions into one chapter-level method callout. Rewrite surrounding sentences positively around the phenomenon, mechanism or observation.

- [ ] **Step 6: Resolve the Ruan Fu status and source-role model**

Remove the word `draft` from reader channels. Keep the record only as an explicitly disputed retrospective attribution, or exclude it from the main chronology if the available corpus cannot provide a stable locator. Store document class independently from its evidentiary role.

- [ ] **Step 7: Regenerate apparatus and run all book validators**

```bash
node book/scripts/generate-apparatus.mjs
node book/scripts/validate-data.mjs
node book/scripts/validate-manuscript.mjs
node --test book/tests/*.test.mjs
```

- [ ] **Step 8: Commit**

```bash
git add book/manuscript/album book/data book/tests
git commit -m "edit(book): strengthen album reader architecture"
```

### Task 4: Restructure the site as a progressive book companion

**Files:**
- Create: `src/components/ReaderContract.tsx`
- Create: `src/components/TeaPathsOverview.tsx`
- Create: `src/components/SectionTakeaway.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/HistoryTimeline.tsx`
- Modify: `src/components/ProcessFork.tsx`
- Modify: `src/components/SourcesSection.tsx`
- Modify: `src/components/SiteHeader.tsx`
- Modify: `src/content/history.ts`
- Modify: `src/content/types.ts`
- Modify: `src/styles/experience.css`
- Modify: `src/styles/responsive.css`
- Modify: `index.html`
- Test: `src/App.test.tsx`
- Test: `src/components/HistoryTimeline.test.tsx`
- Test: `src/components/ProcessFork.test.tsx`
- Test: `src/components/SourcesSection.test.tsx`

- [ ] **Step 1: Write failing reader-experience tests**

Require the target reader and three outcomes near the hero; a sheng/shou overview immediately after it; one shared process sequence; honest path-control labelling; collapsible timeline details and source groups; human citation labels; and a link between site, album and guide.

- [ ] **Step 2: Run focused Vitest tests and verify RED**

```bash
node node_modules/vitest/vitest.mjs run src/App.test.tsx src/components/HistoryTimeline.test.tsx src/components/ProcessFork.test.tsx src/components/SourcesSection.test.tsx
```

- [ ] **Step 3: Add the product and learning contract**

State that this is the online companion to `Пуэр. Живая гора`, requires no specialist preparation and teaches readers to distinguish sheng/shou, separate legend from evidence and interpret health claims cautiously.

- [ ] **Step 4: Put the fork before the long journey**

Render `TeaPathsOverview` immediately after `Hero`. Render shared maocha steps once in `ProcessFork`, followed by the two distinct branches. Rename the control to `Подсветить путь` unless it hides the unselected branch.

- [ ] **Step 5: Add progressive disclosure**

Keep timeline summaries visible and move details/sources into `<details>`. Make source strata and groups collapsible, with cited sources open and further reading closed by default.

- [ ] **Step 6: Improve citation and glossary affordances**

Reader-visible links use author, year and short title; source models accept an optional locator and claim ID. Explain `хэй ча`, `шацин`, `шайцин`, `таксон` and `суррогатный исход` at first use or via accessible glossary popovers.

- [ ] **Step 7: Improve mobile navigation and targets**

Ensure interactive targets are at least 24 by 24 CSS pixels, replace hidden horizontal navigation with a visible mobile contents control, and retain reduced-motion and keyboard behavior.

- [ ] **Step 8: Run site tests, E2E and build**

```bash
node node_modules/vitest/vitest.mjs run
node node_modules/playwright/cli.js test
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
```

- [ ] **Step 9: Commit**

```bash
git add src index.html e2e
git commit -m "feat(site): add progressive reader journey"
```

### Task 5: Integrate, verify and prepare the next external review cycle

**Files:**
- Modify only when a verified integration defect requires it
- Generate: reader proof PDFs and contact sheets
- Preserve: `book/production/review-dispatch.json` as not externally approved

- [ ] **Step 1: Run the full verification matrix**

```bash
node node_modules/vitest/vitest.mjs run
node --test book/tests/*.test.mjs
book/.venv/bin/pytest book/tests -q
node book/scripts/validate-data.mjs
node book/scripts/validate-manuscript.mjs
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
```

- [ ] **Step 2: Build and inspect both reader proofs**

Render both PDFs, verify page counts and forbidden internal strings, then inspect representative opening, transition, recipe, medical and publication-note pages.

- [ ] **Step 3: Run final spec-compliance and quality reviews**

Review the complete diff against the design acceptance criteria. Fix all Critical and Important findings and re-run the affected verification commands.

- [ ] **Step 4: Prepare but do not falsify P3**

Regenerate the specialist package only after content is frozen. Keep reviewer identity, qualifications, conflicts, timestamps and approvals empty until real independent experts respond.

- [ ] **Step 5: Commit the verified integration**

```bash
git add docs book src index.html
git commit -m "chore(publication): verify reader experience upgrade"
```
