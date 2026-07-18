# Editorial Standards Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Синхронизировать книгу и сайт, исправить исторические, технологические и медицинские редакционные риски, добавить издательский аппарат и восстановить воспроизводимые proof-PDF.

**Architecture:** `book/data/` остаётся источником истины для источников и утверждений. Сайт получает именованные типы свидетельств вместо числовых рейтингов; рукопись получает единый стайлшит, читательскую навигацию и проверяемые примечания. Контентные регрессии фиксируются Vitest и `node:test`, после чего PDF собираются существующим deterministic proof builder.

**Tech Stack:** React, TypeScript, Vitest, JSON, Markdown, Node.js 24, Python/ReportLab, Poppler.

---

### Task 1: Зафиксировать единый контентный контракт

**Files:**
- Modify: `src/content/types.ts`
- Modify: `src/lib/contentValidation.test.ts`
- Create: `src/lib/editorialContent.test.ts`

- [ ] **Step 1: Write failing tests**

Проверить, что история поддерживает `retrospective`; медицинская карточка содержит `evidenceType`, `productForm`, `applicability`, `limitations`; интерфейс не отображает `N/5`; сайт не использует запрещённые атрибуции и формулы ускоренного старения.

- [ ] **Step 2: Run the focused tests and confirm RED**

```bash
node node_modules/vitest/vitest.mjs run src/lib/contentValidation.test.ts src/lib/editorialContent.test.ts src/components/EvidenceSection.test.tsx
```

- [ ] **Step 3: Add the minimal shared types**

```ts
export type HistoryKind = 'legend' | 'source' | 'retrospective' | 'modern'
export type MedicalEvidenceType = 'historical' | 'chemistry' | 'preclinical' | 'human' | 'guidance' | 'quality-control'
```

- [ ] **Step 4: Run focused tests and confirm GREEN**

### Task 2: Синхронизировать исторический слой

**Files:**
- Modify: `src/content/history.ts`
- Modify: `src/content/mythology.ts`
- Modify: `src/content/regions.ts`
- Modify: `src/components/HistoryTimeline.tsx`
- Test: `src/lib/editorialContent.test.ts`

- [ ] **Step 1: Confirm tests fail on the old Zhao, Yibang, shou and mythology copy**
- [ ] **Step 2: Represent Zhao as a nested Qing compilation** (`雲南志`, `南詔備考`, `按`)
- [ ] **Step 3: Move `普洱茶膏能治百病` from mythology to historical medicine**
- [ ] **Step 4: Add the Warring States and 59 BCE evidence thresholds**
- [ ] **Step 5: Split the shou chronology into Guangdong 1955–1959 and Yunnan 1973–1975 retrospective branches**
- [ ] **Step 6: Run focused tests and confirm GREEN**

### Task 3: Исправить технологическую учебную линию

**Files:**
- Modify: `book/manuscript/album/03-maocha.md`
- Modify: `book/manuscript/album/04-sheng-and-shou.md`
- Modify: `book/manuscript/guide/00-quick-start.md`
- Modify: `book/manuscript/guide/04-shou.md`
- Modify: `book/manuscript/guide/07-storage-and-safety.md`
- Modify: `src/content/process.ts`
- Modify: `src/components/ProcessFork.tsx`
- Modify: `src/components/FermentationLab.tsx`
- Test: `src/lib/editorialContent.test.ts`
- Test: `book/tests/specialist-content.test.mjs`

- [ ] **Step 1: Confirm RED for the canonical sequence**

Canonical sequence:

```text
fresh leaf → 摊青 → 杀青 → 揉捻 → 解块 → 日光干燥 → 晒青毛茶
```

- [ ] **Step 2: Correct `исходный шайцин` and restore `解块`**
- [ ] **Step 3: Put wetting before pile formation and limit wodui to shou**
- [ ] **Step 4: Replace causal promises with bounded observational wording**
- [ ] **Step 5: Distinguish laboratory detection of fungi from visible mould damage**
- [ ] **Step 6: Correct guide explanations of leaf opening, residual water and storage dryness**
- [ ] **Step 7: Run focused tests and confirm GREEN**

### Task 4: Пересобрать медицинский интерфейс доказательств

**Files:**
- Modify: `src/content/medicine.ts`
- Modify: `src/components/EvidenceSection.tsx`
- Modify: `src/components/EvidenceSection.test.tsx`
- Modify: `src/index.css`
- Modify: `book/manuscript/guide/07-storage-and-safety.md`

- [ ] **Step 1: Confirm RED for removal of `N/5` and presence of product form and limitations**
- [ ] **Step 2: Replace the score with named evidence dimensions**
- [ ] **Step 3: Make extract, surrogate outcomes, attrition, sponsor/author conflicts and applicability visible**
- [ ] **Step 4: Show WHO and EFSA pregnancy guidance as distinct contexts**
- [ ] **Step 5: State that sensory inspection cannot demonstrate absence of mycotoxins**
- [ ] **Step 6: Move the medical boundary and review date above the cards**
- [ ] **Step 7: Run focused tests and confirm GREEN**

### Task 5: Добавить издательский аппарат и стайлшит

**Files:**
- Create: `book/editorial/style-sheet.md`
- Create: `book/manuscript/album/89-publication-notes.md`
- Modify: `book/manuscript/album/00-entry.md`
- Modify: `book/manuscript/album/03-maocha.md`
- Modify: `book/manuscript/album/04-sheng-and-shou.md`
- Modify: `book/manuscript/album/05-microcosm.md`
- Modify: `book/manuscript/album/92-bibliography.md` through generator inputs
- Modify: `book/flatplan/album.json`
- Modify: `book/scripts/generate-apparatus.mjs`
- Test: `book/tests/apparatus.test.mjs`
- Test: `book/tests/manuscript-validation.test.mjs`

- [ ] **Step 1: Write RED tests for chapter H1 hierarchy and publication notes**
- [ ] **Step 2: Add audience, reading contract, contribution roles, AI disclosure, search date and errata route**
- [ ] **Step 3: Normalize chapter headings and Russian/Chinese terminology**
- [ ] **Step 4: Remove commissioning voice from reader prose or convert it to stable figure references**
- [ ] **Step 5: Classify bibliography records by primary text, facsimile, critical edition, access copy and retrospective**
- [ ] **Step 6: Remove the incomplete Vinogrodsky record from the publication bibliography while preserving it in research provenance**
- [ ] **Step 7: Regenerate apparatus and confirm GREEN**

### Task 6: Улучшить информационную архитектуру сайта

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/SiteHeader.tsx`
- Modify: `src/components/SourcesSection.tsx`
- Modify: `src/content/sources.ts`
- Modify: `index.html`
- Test: `src/App.test.tsx`
- Test: `src/lib/editorialContent.test.ts`

- [ ] **Step 1: Confirm RED for the desired section order**
- [ ] **Step 2: Place mythology beside history, before geography and craft**
- [ ] **Step 3: Split bibliography into cited sources and further reading**
- [ ] **Step 4: Add visible editorial review date and methodology link**
- [ ] **Step 5: Update structured metadata**
- [ ] **Step 6: Run site tests and confirm GREEN**

### Task 7: Интеграция, proof-PDF и финальные проверки

**Files:**
- Modify only if tests reveal a verified integration defect
- Generate: `book/output/pdf/puer-album-proof.pdf`
- Generate: `book/output/pdf/puer-guide-proof.pdf`

- [ ] **Step 1: Run all site tests**
- [ ] **Step 2: Run all book tests and validators**
- [ ] **Step 3: Build the site production bundle**
- [ ] **Step 4: Rebuild both editorial proofs**
- [ ] **Step 5: Verify PDF metadata, page counts, text overflow and representative rendered pages**
- [ ] **Step 6: Run a final spec review and code-quality review**
- [ ] **Step 7: Commit only after fresh verification**

Verification commands:

```bash
node node_modules/vitest/vitest.mjs run
node --test book/tests/*.test.mjs
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
uv run --project book python book/scripts/build_proof.py
uv run --project book python book/scripts/verify_pdf.py
```
