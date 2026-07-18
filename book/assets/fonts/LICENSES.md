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

- **Normalized proof filename:** `NotoSerifSC-Regular.ttf`
- **Status:** approved local proof artifact; derived deterministically from an
  official TrueType variable source at `wght=400` and verified as static.
- **Official release pin:** `notofonts/noto-cjk` release/tag `Serif2.003`, tag
  commit `9b0f1436e455d902de067a2501422e5dc71ad16b`; complete release asset
  `14_NotoSerifSC.zip`, `68,960,596` bytes, SHA-256
  `c58cd035ab2adb003510846db9ec80c35b1b97755d329486c3a1e88edfe6e98e`.
  `unzip -t` reports no errors.
- **Release member inspected:**
  `SubsetOTF/SC/NotoSerifSC-Regular.otf`, `11,625,800` bytes, SHA-256
  `e8f396decc1f0963a016a989c3d8852e863d1350996f573860a80767c83a1cd3`.
  It is a genuine static OpenType/CFF Regular, not a TTF, so it was not renamed
  to satisfy the proof filename. Its official 2,310-byte `name` table supplies
  the Regular names in the derived TTF.
- **TrueType source:** official Google Fonts artifact
  `ofl/notoserifsc/NotoSerifSC[wght].ttf` at commit
  `389b770410cc0b7c21c85673bfa2077420fe7f65`, `25,125,512` bytes, SHA-256
  `050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9`.
  Its inspected named Regular instance and version `2.003` match the pinned
  Noto Serif CJK release.
- **Derivation tool:** HarfBuzz `hb-subset 14.2.1`; Python fontTools was not
  available offline. The full-glyph instance command was:

  ```bash
  hb-subset 'book/assets/fonts/files/NotoSerifSC[wght].ttf' \
    --output-file=book/assets/fonts/files/NotoSerifSC-Regular.ttf.candidate \
    --unicodes='*' --variations='wght=400' \
    --name-IDs='*' --name-languages='*' \
    --layout-features='*' --glyph-names
  ```

  Repeating this command produced byte-identical candidates with SHA-256
  `4a6db95a007099d7123f417d16af404d05451446b3accbc582cd77e1fbd55c04`.
  HarfBuzz correctly removed the variable tables but retained the source's
  legacy ExtraLight name strings. To avoid inventing or hand-authoring names,
  Node `24.14.1` copied the `name` table byte-for-byte from the official static
  Regular OTF member into the candidate, updated its directory checksum and
  length, then recalculated `head.checkSumAdjustment`. The final whole-font
  checksum is the required `0xB1B0AFBA`. This is the exact normalization step:

  ```bash
  node <<'NODE'
  const fs = require('node:fs')
  const candidate = fs.readFileSync('book/assets/fonts/files/NotoSerifSC-Regular.ttf.candidate')
  const namesFont = fs.readFileSync('book/assets/fonts/files/NotoSerifSC-Regular.otf')
  const tables = (buffer) => {
    const result = new Map()
    for (let index = 0; index < buffer.readUInt16BE(4); index += 1) {
      const directoryOffset = 12 + index * 16
      result.set(buffer.toString('ascii', directoryOffset, directoryOffset + 4), {
        directoryOffset,
        offset: buffer.readUInt32BE(directoryOffset + 8),
        length: buffer.readUInt32BE(directoryOffset + 12),
      })
    }
    return result
  }
  const checksum = (buffer, offset = 0, length = buffer.length) => {
    let sum = 0
    for (let index = 0; index < length; index += 4) {
      let word = 0
      for (let byte = 0; byte < 4; byte += 1) {
        word = (word << 8) | (index + byte < length ? buffer[offset + index + byte] : 0)
      }
      sum = (sum + (word >>> 0)) >>> 0
    }
    return sum >>> 0
  }
  const targetTables = tables(candidate)
  const sourceTables = tables(namesFont)
  const targetName = targetTables.get('name')
  const sourceName = sourceTables.get('name')
  const head = targetTables.get('head')
  if (!targetName || !sourceName || !head || sourceName.length > targetName.length) {
    throw new Error('incompatible sfnt tables')
  }
  candidate.fill(0, targetName.offset, targetName.offset + targetName.length)
  namesFont.copy(candidate, targetName.offset, sourceName.offset, sourceName.offset + sourceName.length)
  candidate.writeUInt32BE(checksum(namesFont, sourceName.offset, sourceName.length), targetName.directoryOffset + 4)
  candidate.writeUInt32BE(sourceName.length, targetName.directoryOffset + 12)
  candidate.writeUInt32BE(0, head.offset + 8)
  candidate.writeUInt32BE((0xB1B0AFBA - checksum(candidate)) >>> 0, head.offset + 8)
  if (checksum(candidate) !== 0xB1B0AFBA) throw new Error('invalid sfnt checksum')
  fs.writeFileSync('book/assets/fonts/files/NotoSerifSC-Regular.ttf', candidate)
  NODE
  ```
- **Inspected output:** TrueType/glyf sfnt with 19 tables and no `fvar`, `gvar`,
  `avar`, `HVAR` or `MVAR`; `variable=false`; `14,807,596` bytes. Family
  `Noto Serif SC`; style `Regular`; full name `Noto Serif SC`; PostScript name
  `NotoSerifSC-Regular`; version `2.003` (`fc-scan` raw fixed-point value
  `131269`). HarfBuzz successfully shaped Simplified Chinese and Cyrillic text.
- **Output SHA-256:**
  `3f1c014c06b68dd4416d1c9be4720fed6a066504ce9355c42d6f7c50e434f222`
- **Official source:**
  <https://github.com/notofonts/noto-cjk/releases/tag/Serif2.003>
- **Official TrueType source:**
  <https://github.com/google/fonts/blob/389b770410cc0b7c21c85673bfa2077420fe7f65/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf>
- **Official licence:**
  <https://github.com/notofonts/noto-cjk/blob/Serif2.003/Serif/LICENSE>
- **Attribution record:** the Noto Serif CJK Project Authors; preserve the exact
  embedded notice and pinned `Serif/LICENSE` whenever the font itself is
  redistributed. The OFL permits the recorded `wght=400` instancing and name
  table normalization; the derived binary remains under OFL-1.1 and must travel
  with the licence and copyright notice when redistributed.
