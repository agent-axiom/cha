# «Живая гора» Pu-er Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать и опубликовать интерактивный русскоязычный лонгрид о шэн- и шу-пуэре с проверяемой историей, медицинской сводкой, мифологией и оригинальными изображениями.

**Architecture:** Статическое React-приложение на Vite хранит факты и источники в типизированных модулях, а визуальные разделы получают данные через узкие props-интерфейсы. Содержательная графика создаётся в HTML/SVG, декоративные эффекты изолируются в CSS и Canvas и имеют статичные резервные состояния.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, axe-core, Playwright, CSS, SVG, GitHub Actions и GitHub Pages.

---

## Структура файлов

- `package.json` — команды разработки, тестов и сборки.
- `vite.config.ts`, `tsconfig*.json` — TypeScript/Vite/Vitest-конфигурация с базовым путём `/cha/`.
- `index.html` — русские метаданные, canonical, Open Graph и JSON-LD.
- `src/main.tsx`, `src/App.tsx` — точка входа и композиция страницы.
- `src/content/types.ts` — типы источников, хронологии, процессов и медицинских выводов.
- `src/content/sources.ts` — проверенная библиография с прямыми URL.
- `src/content/history.ts`, `process.ts`, `medicine.ts`, `mythology.ts`, `regions.ts` — содержательные записи по разделам.
- `src/lib/contentValidation.ts` — проверка библиографических связей и уникальности якорей.
- `src/hooks/useReducedMotion.ts`, `useActiveSection.ts` — предпочтения движения и активный раздел.
- `src/components/SiteHeader.tsx`, `Hero.tsx`, `TeaPathSwitch.tsx` — навигация и выбор шэн/шу.
- `src/components/HistoryTimeline.tsx`, `TeaMountainsMap.tsx`, `ProcessFork.tsx`, `FermentationLab.tsx`, `EvidenceSection.tsx`, `MythologyCabinet.tsx`, `SourcesSection.tsx` — независимые разделы.
- `src/components/FogCanvas.tsx` — декоративный Canvas с безопасным отключением.
- `src/styles/tokens.css`, `global.css`, `components.css`, `responsive.css` — визуальная система «Живая гора».
- `src/test/setup.ts` и `src/**/*.test.tsx` — модульные и компонентные тесты.
- `tests/site.spec.ts` — основные пользовательские сценарии Playwright.
- `public/images/*` — оригинальные WebP/PNG-иллюстрации.
- `.github/workflows/deploy.yml` — сборка и GitHub Pages.
- `README.md` — локальный запуск, источники и публикация.

### Task 1: Scaffold React, TypeScript and the test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Create the package manifest and TypeScript/Vite configuration**

Use these scripts and dependencies:

```json
{
  "name": "cha",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "typescript": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "axe-core": "latest",
    "jsdom": "latest",
    "vitest": "latest"
  }
}
```

Configure Vite with `base: '/cha/'`, React, `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, and CSS processing through Vite defaults.

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: exit 0 and a new `package-lock.json`.

- [ ] **Step 3: Create the minimal root and test setup**

`src/main.tsx` renders `<App />` into `#root`; `src/test/setup.ts` imports `@testing-library/jest-dom/vitest` and resets the document body after each test.

- [ ] **Step 4: Verify the empty harness**

Run: `npm test -- --passWithNoTests`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig*.json vite.config.ts index.html src/main.tsx src/test/setup.ts
git commit -m "build: scaffold the puer experience"
```

### Task 2: Build the verified content model

**Files:**
- Create: `src/content/types.ts`
- Create: `src/content/sources.ts`
- Create: `src/content/history.ts`
- Create: `src/content/process.ts`
- Create: `src/content/medicine.ts`
- Create: `src/content/mythology.ts`
- Create: `src/content/regions.ts`
- Create: `src/lib/contentValidation.ts`
- Test: `src/lib/contentValidation.test.ts`

- [ ] **Step 1: Write the failing content-integrity tests**

```ts
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
    expect(medicineClaims.every((claim) => claim.evidenceLevel < 5 || claim.kind === 'safety')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/lib/contentValidation.test.ts`

Expected: FAIL because the content modules do not exist.

- [ ] **Step 3: Implement the types and validators**

Define `Source`, `HistoryEntry`, `MedicalClaim`, `ProcessStep`, `MythEntry`, and `Region` types. Implement `findBrokenSourceRefs()` by comparing every `sourceIds` member with `sources.map(source => source.id)` and `findDuplicateIds()` by counting repeated `id` values.

Populate sources with stable IDs for Benn 2015, Zhang 2013, Fan Chuo, Zhao Xuemin, Ruan Fu, GB/T 22111-2008, Yunnan government guidance, Lv et al. 2013, the 2022 chemical review, the 2022 fungal-safety review, two human trials, EFSA caffeine guidance, and WHO pregnancy guidance.

Populate at least nine history entries, six steps per tea path, five medical entries, three myths, and seven map regions. Every factual entry must include at least one `sourceIds` value; legends use `kind: 'legend'` and identify their recording source.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `npm test -- src/lib/contentValidation.test.ts`

Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/content src/lib/contentValidation.ts src/lib/contentValidation.test.ts
git commit -m "feat: add sourced puer knowledge model"
```

### Task 3: Implement the hero, navigation and tea-path state

**Files:**
- Create: `src/App.tsx`
- Create: `src/components/SiteHeader.tsx`
- Create: `src/components/Hero.tsx`
- Create: `src/components/TeaPathSwitch.tsx`
- Create: `src/hooks/useReducedMotion.ts`
- Create: `src/hooks/useActiveSection.ts`
- Test: `src/App.test.tsx`
- Test: `src/components/TeaPathSwitch.test.tsx`

- [ ] **Step 1: Write the failing switch behavior test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { TeaPathSwitch } from './TeaPathSwitch'

it('switches from sheng to shou with an accessible pressed state', async () => {
  const user = userEvent.setup()
  render(<TeaPathSwitch value="sheng" onChange={() => { document.body.dataset.tea = 'shou' }} />)
  await user.click(screen.getByRole('button', { name: /шу/i }))
  expect(document.body).toHaveAttribute('data-tea', 'shou')
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/components/TeaPathSwitch.test.tsx`

Expected: FAIL because `TeaPathSwitch` does not exist.

- [ ] **Step 3: Implement the accessible path switch and root state**

`TeaPathSwitch` renders a `role="group"` with two native buttons and `aria-pressed`. `App` owns `teaPath: 'sheng' | 'shou'`, writes it to `data-tea` on the application root, and passes it to `Hero` and later process components. `useReducedMotion` wraps `matchMedia('(prefers-reduced-motion: reduce)')` and subscribes to changes.

- [ ] **Step 4: Add and pass the application-shell test**

Assert one `<h1>` with «Две судьбы одного листа», a «Перейти к истории» link targeting `#history`, navigation labeled «Разделы», and both tea path buttons.

Run: `npm test -- src/App.test.tsx src/components/TeaPathSwitch.test.tsx`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/SiteHeader.tsx src/components/Hero.tsx src/components/TeaPathSwitch.tsx src/hooks src/App.test.tsx src/components/TeaPathSwitch.test.tsx
git commit -m "feat: add immersive puer entry experience"
```

### Task 4: Implement history, map and mythology

**Files:**
- Create: `src/components/HistoryTimeline.tsx`
- Create: `src/components/TeaMountainsMap.tsx`
- Create: `src/components/MythologyCabinet.tsx`
- Test: `src/components/HistoryTimeline.test.tsx`
- Test: `src/components/TeaMountainsMap.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Test that history entries expose their evidence kind as visible text and that selecting «Иу» on the map reveals its description and cited source link. Use native buttons for map markers and `aria-live="polite"` for the selected region card.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- src/components/HistoryTimeline.test.tsx src/components/TeaMountainsMap.test.tsx`

Expected: FAIL because both components do not exist.

- [ ] **Step 3: Implement the components**

Render the timeline as an ordered list with badges «Легенда», «Письменный источник», and «Современное знание». Render an original simplified SVG relief of southern Yunnan with seven positioned native button markers over the SVG; update one adjacent details panel rather than creating tooltips that are unavailable by keyboard.

Render myths as three `<article>` elements with sections «Сюжет», «Что можно утверждать», and a source link.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `npm test -- src/components/HistoryTimeline.test.tsx src/components/TeaMountainsMap.test.tsx`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/HistoryTimeline* src/components/TeaMountainsMap* src/components/MythologyCabinet.tsx
git commit -m "feat: trace the myths and mountains of puer"
```

### Task 5: Implement production, fermentation and medical evidence

**Files:**
- Create: `src/components/ProcessFork.tsx`
- Create: `src/components/FermentationLab.tsx`
- Create: `src/components/EvidenceSection.tsx`
- Create: `src/components/SourcesSection.tsx`
- Test: `src/components/ProcessFork.test.tsx`
- Test: `src/components/EvidenceSection.test.tsx`

- [ ] **Step 1: Write failing production and evidence tests**

Assert that sheng contains no `wodui` step, shou contains a visible «влажное кучевание» step, the evidence filter can reveal human studies, and the medical warning «Чай не заменяет медицинскую помощь» is always present.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- src/components/ProcessFork.test.tsx src/components/EvidenceSection.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the four sections**

`ProcessFork` receives the selected tea path and displays both paths with one emphasized through `aria-current="step"` only on the active path. `FermentationLab` uses three accessible toggle buttons for microbes, moisture/heat, and chemical change; the visual is SVG and the explanation remains visible as text. `EvidenceSection` filters by evidence level without hiding the safety note. `SourcesSection` groups sources as «Китайские первоисточники», «Азиатские исследования», «Западные исследования», and «Международные рекомендации».

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `npm test -- src/components/ProcessFork.test.tsx src/components/EvidenceSection.test.tsx`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProcessFork* src/components/FermentationLab.tsx src/components/EvidenceSection* src/components/SourcesSection.tsx
git commit -m "feat: explain puer transformation and evidence"
```

### Task 6: Generate original imagery and build the Living Mountain art direction

**Files:**
- Create: `public/images/puer-hero.webp`
- Create: `public/images/puer-leaf-paths.webp`
- Create: `public/images/puer-still-life.webp`
- Create: `public/images/puer-microcosm.webp`
- Create: `src/components/FogCanvas.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/components.css`
- Create: `src/styles/responsive.css`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Test: `src/components/FogCanvas.test.tsx`

- [ ] **Step 1: Generate four project-bound image assets**

Use the built-in image generation tool with the shared art direction: documentary-natural photography, misty Yunnan tea forest, forest green/earth/amber/cinnabar palette, cinematic natural light, no text, no logos, no watermark. Generate each asset separately, inspect it, then copy the selected output into `public/images/` and convert oversized files to WebP while preserving visual quality.

- [ ] **Step 2: Write the failing reduced-motion Canvas test**

Mock `matchMedia` as reduced motion, render `FogCanvas`, and assert that it renders a static decorative element with `aria-hidden="true"` but does not call `requestAnimationFrame`.

- [ ] **Step 3: Run the test and verify RED**

Run: `npm test -- src/components/FogCanvas.test.tsx`

Expected: FAIL because `FogCanvas` does not exist.

- [ ] **Step 4: Implement the visual system and Canvas fallback**

Define CSS variables for `--forest-950`, `--forest-800`, `--moss`, `--tea-amber`, `--cinnabar`, `--paper`, responsive spacing, serif/sans font stacks, and sheng/shou accents. Build the hero at full available width with layered image gradients, fluid type via `clamp()`, section reveals with IntersectionObserver, and a two-column-to-single-column breakpoint at 760px.

`FogCanvas` must cap device pixel ratio at 1.5, pause outside the viewport, create no more than 34 particles, and skip animation for reduced motion. The hero image remains visible if Canvas initialization fails.

- [ ] **Step 5: Run tests and production build**

Run: `npm test`

Expected: all tests pass.

Run: `npm run build`

Expected: exit 0 and `dist/index.html` plus optimized assets.

- [ ] **Step 6: Commit**

```bash
git add public/images src/components/FogCanvas* src/styles src/App.tsx src/main.tsx
git commit -m "feat: craft the living mountain art direction"
```

### Task 7: Add metadata, accessibility checks and end-to-end coverage

**Files:**
- Modify: `index.html`
- Modify: `src/App.test.tsx`
- Create: `tests/site.spec.ts`
- Create: `playwright.config.ts`
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`

- [ ] **Step 1: Add a failing axe smoke test**

Render `<App />`, run `axe.run(document.body)`, and assert `violations` equals `[]`. Add `aria-label`, correct heading structure, and accessible control names only after observing the failure.

- [ ] **Step 2: Add metadata and discovery files**

Set title «Пуэр: две судьбы одного листа», description, canonical `https://agent-axiom.github.io/cha/`, Open Graph metadata, theme color, and `Article` JSON-LD. Point `robots.txt` to `/cha/sitemap.xml` and include the canonical URL in the sitemap.

- [ ] **Step 3: Write Playwright scenarios**

Test desktop and 390px mobile layouts, keyboard activation of the shou switch, direct navigation to `#medicine`, reduced-motion emulation, absence of horizontal overflow, and successful loading of all four local image assets.

- [ ] **Step 4: Run accessibility, unit and E2E tests**

Run: `npm test`

Expected: all tests pass with zero axe violations.

Run: `npm run build && npm run test:e2e`

Expected: all Playwright scenarios pass against Vite preview.

- [ ] **Step 5: Commit**

```bash
git add index.html src/App.test.tsx tests playwright.config.ts public/robots.txt public/sitemap.xml
git commit -m "test: verify the puer story across devices"
```

### Task 8: Configure GitHub Pages and project documentation

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`

- [ ] **Step 1: Create the Pages workflow**

Use `actions/checkout@v4`, `actions/setup-node@v4` with Node 22 and npm cache, `npm ci`, `npm test`, `npm run build`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3` with `dist`, and `actions/deploy-pages@v4`. Grant only `contents: read`, `pages: write`, and `id-token: write`; serialize deployments with the `pages` concurrency group.

- [ ] **Step 2: Document local use and editorial safeguards**

README must include `npm install`, `npm run dev`, `npm test`, `npm run build`, the deployed URL, a short architecture map, image-generation disclosure, and a note that historical medical claims are presented as history rather than treatment advice.

- [ ] **Step 3: Verify configuration and commit**

Run: `npm test`

Run: `npm run build`

Run: `git diff --check`

Expected: all commands exit 0.

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "ci: publish the puer experience to pages"
```

### Task 9: Create the remote repository, deploy and verify the public site

**Files:**
- No local files unless a deployment-specific correction is required.

- [ ] **Step 1: Verify GitHub authentication and organization access**

Run: `gh auth status`

Run: `gh api orgs/agent-axiom --jq '.login'`

Expected: authenticated account and output `agent-axiom`.

- [ ] **Step 2: Create the public repository and push main**

Run: `gh repo create agent-axiom/cha --public --source=. --remote=origin --push`

Expected: repository URL and successful push of `main`.

- [ ] **Step 3: Enable Actions-based Pages if needed**

Run: `gh api repos/agent-axiom/cha/pages --method POST -f build_type=workflow`

Accept HTTP 201 or the already-configured response; do not replace an existing unrelated Pages configuration without inspection.

- [ ] **Step 4: Watch the deployment**

Run: `gh run list --repo agent-axiom/cha --workflow deploy.yml --limit 1`

Run: `gh run watch --repo agent-axiom/cha <run-id> --exit-status`

Expected: workflow conclusion `success`.

- [ ] **Step 5: Verify the live site**

Request `https://agent-axiom.github.io/cha/`, confirm HTTP 200, inspect that HTML references `/cha/assets/`, request one generated image and one JavaScript asset, and open the public page in a browser at desktop and mobile sizes.

- [ ] **Step 6: Report completion**

Provide the GitHub repository, live Pages URL, verification results, image asset paths, and final generated-image prompt set.
