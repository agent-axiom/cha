# Font licences and proof-file register

The typography configuration names Cormorant, Literata, Manrope and Noto Serif
CJK SC. Font binaries are local proof inputs under the gitignored
`book/assets/fonts/files/` directory; they are not committed with the book
metadata. This register pins the upstream artifact that must be used and records
what was actually inspected on 2026-07-17.

## Licence rules shared by all four families

All four upstream projects publish the relevant font software under the SIL Open
Font License 1.1 (OFL-1.1).

- **Embedding:** allowed, including embedding/subsetting in a PDF. A document
  produced with an OFL font is not made subject to the OFL merely by using the
  font.
- **Modification:** allowed. A redistributed modified font remains under the
  OFL, may not be sold by itself, and must follow any Reserved Font Name rule in
  its family licence notice.
- **Attribution:** the printed book does not require a visible font credit.
  When a font file or modified derivative is redistributed, preserve its
  embedded copyright/name records and include the corresponding OFL text and
  copyright notice. File renaming for the local proof convention does not
  remove those records.

The family-specific licence URLs below are authoritative; the generic terms
above are a workflow summary, not a substitute for those files.

## Cormorant

- **Normalized proof filename:** `Cormorant-Regular.ttf`
- **Exact upstream artifact:**
  `fonts/ttf/Cormorant-Regular.ttf` from official
  `CatharsisFonts/Cormorant` tag `v4.002`, commit
  `b149467f785bc38e5417b68faa2d32bac8d7db5f`.
- **Inspected name table:** family `Cormorant`; style `Regular`; full name
  `Cormorant Regular`; PostScript name `Cormorant-Regular`; version `4.002`
  (`fc-scan` raw fixed-point value `262275`).
- **SHA-256:**
  `5c0df0719a28c380d8d1a4979a5783f16cdd780841f44fd939715c66c47a4967`
- **Official source:**
  <https://github.com/CatharsisFonts/Cormorant/tree/v4.002>
- **Official licence:**
  <https://github.com/CatharsisFonts/Cormorant/blob/v4.002/OFL.txt>
- **Attribution record:** Christian Thalmann / Catharsis Fonts and the
  Cormorant Project Authors; preserve the exact embedded notice and pinned
  `OFL.txt` whenever the font itself is redistributed.

## Literata

- **Normalized proof filename:** `Literata-Regular.ttf`
- **Exact upstream artifact:** `fonts/ttf/Literata-Regular.ttf` from official
  `googlefonts/literata` tag `3.103`, commit
  `0c2761b727a1b3a7cffd313c37f0f5163dfc7a63`.
- **Inspected name table:** family `Literata`; style `Regular`; full name
  `Literata Regular`; PostScript name `Literata-Regular`; version `3.103`
  (`fc-scan` raw fixed-point value `203358`).
- **SHA-256:**
  `0390890de9bb9d5862a6ba4125b82c61792ccc3d66b63e73eee75c1a16fcd208`
- **Official source:** <https://github.com/googlefonts/literata/tree/3.103>
- **Official licence:**
  <https://github.com/googlefonts/literata/blob/3.103/OFL.txt>
- **Attribution record:** TypeTogether and the Literata Project Authors;
  preserve the exact embedded notice and pinned `OFL.txt` whenever the font
  itself is redistributed.

## Manrope

- **Normalized proof filename:** `Manrope-Regular.ttf`
- **Exact upstream artifact:** `fonts/ttf/manrope-regular.ttf` from official
  maintained `aaronbell/manrope` repository commit
  `6f81ebecdf65e4463b798cc07b16a4f8d5216917` (the repository publishes no
  GitHub release for this revision).
- **Inspected name table:** family `Manrope`; style `Regular`; full name
  `Manrope Regular`; PostScript name `Manrope-Regular`; version `4.504`
  (`fc-scan` raw fixed-point value `295174`).
- **SHA-256:**
  `2d9a9960fd191a7f1d9060768818074dd2b76ba84a64a35efd2c22bf39030903`
- **Official source:**
  <https://github.com/aaronbell/manrope/tree/6f81ebecdf65e4463b798cc07b16a4f8d5216917>
- **Official licence:**
  <https://github.com/aaronbell/manrope/blob/6f81ebecdf65e4463b798cc07b16a4f8d5216917/OFL.txt>
- **Attribution record:** Mikhail Sharanda and the Manrope Project Authors;
  preserve the exact embedded notice and pinned `OFL.txt` whenever the font
  itself is redistributed.

## Noto Serif CJK SC

- **Required normalized proof filename:** `NotoSerifSC-Regular.ttf`
- **Official pin:** `notofonts/noto-cjk` release/tag `Serif2.003`, tag commit
  `9b0f1436e455d902de067a2501422e5dc71ad16b`; official release asset
  `14_NotoSerifSC.zip` (GitHub API size `68,960,596` bytes).
- **Release-declared version:** Noto Serif CJK `2.003`. This is a release label,
  not a locally inspected name-table value.
- **Official source:**
  <https://github.com/notofonts/noto-cjk/releases/tag/Serif2.003>
- **Official licence:**
  <https://github.com/notofonts/noto-cjk/blob/Serif2.003/Serif/LICENSE>
- **Attribution record:** the Noto Serif CJK Project Authors; preserve the exact
  embedded notice and pinned `Serif/LICENSE` whenever the font itself is
  redistributed.
- **Inspection blocker:** the bounded downloads did not complete. The local ZIP
  failed `unzip -t`, and the partial TTF did not contain a complete inspectable
  artifact; all incomplete files carry a `.partial` suffix and must not be used.
  Before proof generation, download the complete pinned official artifact,
  identify the actual Regular TTF inside it (or derive a Regular instance only
  as permitted by the OFL), normalize it to `NotoSerifSC-Regular.ttf`, inspect
  family/style/PostScript/version tables, and record its SHA-256 here. Until
  that gate is closed, Noto Serif CJK SC is **not approved for proof output**.
