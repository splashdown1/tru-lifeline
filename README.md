# TRU LIFELINE

Offline, non-LLM, source-bound **survival + first-aid** engine. One self-contained HTML file — no network at runtime, no accounts, no telemetry, no generated content.

**Live app: https://splashdown1.github.io/tru-lifeline/**

When the network is gone — shutdown, disaster, wilderness, war — the knowledge that keeps a body alive must already be in the file.

## What it answers from (and only from)

| Source | Edition | Licence |
|---|---|---|
| FM 21-76 *Survival* | Dept. of the Army, 1970 (23 chapters + appendices) | US Gov work — public domain |
| FM 21-11 *First Aid for Soldiers* | Dept. of the Army, June 1976 | US Gov work — public domain |

## Doctrine

- **Never generates.** Deterministic lanes only; an honest "no source entry" gap is a safety feature, not a UX flaw.
- **Never synthesises medical advice.** Every card quotes the source paragraph verbatim with manual + chapter + paragraph provenance.
- **No OCR guess-correction** of doses, ratios, times, temperatures. QA-flagged instead.
- Route map: STATE → READER → CALC → DEFINE → DANGER → PROCEDURE → TOPIC → TOPIC-FUZZY → GAP.

## Reader

The whole corpus is readable: `read survival chapter 11`, `read fm 21-11 chapter 9`, `next section`, `where am i` — plus offline TTS voice controls on the real machine (TEST VOICE button + ♀/♂ toggle in the reader bar).

## Build

The full pipeline is in this repo:

- `ingest/extract_fm2111.py`, `ingest/extract_fm2176.py` — segment the raw dumps into paragraph/section records with QA flags (`source/raw/`)
- `ingest/build_packs.py` — lane packs (TOPICS / PROCEDURES / TERMS / DANGERS)
- `engine/build.py` — assemble the single-file HTML (`BUILD_STAMP="YYYY-MM-DD HH:MM UTC" python3 engine/build.py` for a reproducible build)
- `engine/sweep.py` — live lane regression sweep (28 golden queries)
- `references/LANES.md` — lane design law; `references/spotcheck-*.md` — extraction spot-checks

Data: FM 21-11 → 120 paragraph records (12 chapters); FM 21-76 → 443 section records (23 chapters). Packs: 563 topics, 125 procedures, 121 terms, 63 danger entries (26 snake species).

## Release of record

`tru-lifeline.html` = `index.html`, sha256 `e8675bd59f4209b1…` (1,114,719 bytes), built 2026-10-02. Verify: the in-app ABOUT panel shows the build hash.
