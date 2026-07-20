# Reader Experience Upgrade Design

**Status:** approved by the user through the editorial audit and the instruction to implement its plan.

## Objective

Turn the current scientifically rigorous book and site into a clearer reader-facing experience without weakening traceability. The album remains a gift-oriented popular-science atlas, the guide becomes usable by a novice at the tea table, and the site becomes a progressive web companion rather than an unbounded source dump.

## Decisions

1. **Keep two publication layers.** The existing editorial proof continues to expose production status and machine-readable claim/source keys. A reader-proof mode hides production roles, raw registry identifiers and internal review language. It must still declare itself non-print-ready while final art, rights, independent reviews and print parameters remain open.
2. **Move the reader contract forward.** The album introduces audience, route and evidence conventions near the opening. The guide opens with prerequisites, a plain-language sheng/shou identification aid and a card legend before prescribing a precise preparation.
3. **Treat brewing values as starting ranges.** Exact ranges are editorial starting points, not standards. The text distinguishes adaptive adjustment during one session from a controlled comparison using fresh equivalent portions.
4. **Preserve evidence, reduce repetition.** Evidence labels remain where a local boundary materially changes the conclusion. Repeated methodological cautions move to chapter-level callouts and the apparatus. Internal claim keys remain in registries and editorial proofs.
5. **Make chapters close with reader outcomes.** Album transitions gain concise “what is now visible” checkpoints. Guide sections use the operational pattern “do / record / stop”.
6. **Use progressive disclosure on the site.** A compact sheng/shou comparison follows the hero; duplicated common process steps are rendered once; timeline details and bibliography groups are collapsible; the site exposes a product contract, glossary help and actionable section endings.
7. **Strengthen the citation chain.** Web records may carry claim identifiers and locators, while reader-visible citation labels use author, year and short title. Document class and evidentiary role remain separate concepts.

## Explicit non-goals

- Do not fabricate external expert approvals, image rights or reviewer identities.
- Do not call the reader proof print-ready or PDF/X.
- Do not replace commissioned final illustrations with unlicensed imagery.
- Do not turn the gift album into a technical textbook with exercises on every spread.

## Acceptance criteria

- A novice can identify the required tools and choose a sheng or shou starting path before the first brewing recipe.
- “Safe cup” language is replaced by bounded risk-reduction language.
- Adaptive infusion changes are not described as causal experiments.
- Reader proof contains no `claim-id`, `source-id`, `prepared-not-dispatched`, commission brief or page-role prose.
- Every major album chapter ends with a compact checkpoint; every guide section closes with an operational takeaway.
- Site hero states audience and three outcomes; sheng/shou comparison is visible immediately after it.
- Common production steps are displayed once and the path control either truly filters or is labelled as highlighting.
- Timeline and source groups support progressive disclosure without making citations inaccessible.
- Existing content validators, 59 site tests, 276 book tests, Python PDF tests and production build remain green, with new regression tests covering the changed behavior.

## Release boundary

This upgrade can produce a cleaner reader proof and a materially better site. Final print release remains blocked until final illustration masters and rights, named independent specialist reviews, typography/ICC decisions, PDF/X export, physical proof and printer preflight are complete.
