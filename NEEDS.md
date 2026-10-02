# TRU LIFELINE — Needs backlog (2026-10-02)

Prioritised build plan for v1. Each item states the work and the acceptance test.

## P1 — Extraction pipeline (current work)
Segment `source/raw/FM21-76_survival.txt` and `FM21-11_firstaid_1976.txt` into paragraph-level
records with manual + chapter + paragraph provenance. Emit JSON packs: PROCEDURES, TOPICS,
TERMS, DANGERS.

**Status 2026-10-02: P1 DONE — extraction + pack derivation + spot-check all clean.**
- FM 21-11 (1976): **120 records**, 12 chapters (data/fm2111_1976.json). 2026-10-02 audit: fixed a marker-regex newline-crossing bug that let inline cross-references ("…described in paragraph 9-14.") spawn spurious records; 2 cross-ref artifacts dropped, 3 OCR-duplicate markers relabelled via the scan's own TOC ranges (4-6→4-8, 5-6→5-8, 6-16→6-18, all `marker-corrected` flagged). 121→120.
- FM 21-76 (1992): 443 records, 23 chapters (data/fm2176_1992.json, pdftotext layer). 2026-10-02 audit: fixed multi-line-heading body-slice bug (`h_line + 1` → `h_line + span`); exactly 2 records lost leaked heading-tail fragments ("COOKING AND STORAGE", "WEATHER SURVIVAL"), counts unchanged.
- Lane packs built (data/packs/): TOPICS 563, PROCEDURES 125 (33 lettered + 2 numbered + 90 bullet-indexed; verbatim steps only where the scan preserves real boundaries), TERMS 9, DANGERS 63 (26 species). Build log: ingest/build_packs_2026-10-02.log.
- Spot-check: **20/20 PASS** (seeded, 10 per manual) — references/spotcheck-2026-10-02.md. Pre-fix data preserved as data/*.pre-audit-bak.json.
**Accept (updated).** Same counts + pack derivation + 20-paragraph spot-check before engine wiring. — MET.

## P2 — Lane design doc (references/LANES.md)
Fix the route map: PROCEDURE / TOPIC / DEFINE / DANGER / READER / GAP ordering and the
natural-language triggers for each. Written before engine work starts — route order is law.
**Status 2026-10-02: P2 DONE.** references/LANES.md written: route order STATE→READER→CALC→
DEFINE→DANGER→PROCEDURE→TOPIC→TOPIC-FUZZY→GAP with per-position rationale, precise matching
rules (normalisation, containment, derived keys, head-noun fallback), emergency-hardening rules,
and golden-query tables per lane. Exact-match golden queries verified against the packs;
P3-dependent ones marked [P3-verify] and folded into the P3/P4 sweep.
**Accept.** Every lane has ≥5 golden queries listed with expected route. — MET.

## P3 — Engine adaptation
Adapt TRU shell v17 (sha 795968295bafe21a…): swap corpora, wire packs, adapt portal counts,
keep voice reader + boot veil + one-chip Socratic rule (follow-ups cite the next source
paragraph, never generated).
**Accept.** Golden-query sweep clean; chips walked live; 0 console errors; GAP honest on
out-of-scope questions ("define baptism" should GAP, not guess medical).

## P4 — Release gate + deployment
DEPLOYED (2026-10-02): public repo `splashdown1/tru-lifeline` (engine as index.html + full
build pipeline: engine/, ingest/, data/, references/, source/). Pages live and byte-verified:
https://splashdown1.github.io/tru-lifeline/ — release of record v1.2, sha `286003bd0a557bd6…`
(1,116,528 bytes), deterministic builds via `BUILD_STAMP` env (rebuild from same sources = same bytes).
Live smoke: boot ready panel, DANGER/DEFINE/READER fire, 0 console errors.
Build of record: `BUILD_STAMP="2026-10-02 17:12 UTC" python3 engine/build.py`.
Real-machine voice gate (joe, 2026-10-02): PASSED — TTS reads sections, 30+ local voices detected,
voice dropdown + TEST VOICE work; honest no-female-voice fallback status line behaved as designed.
Post-gate fixes folded into v1.2: send-button wiring (button was dead — only Enter worked),
GAP-card HTML render leak, "snakebit" de-compound provenance (CH undefined → CH 11 · POISONOUS
SNAKES), DEFINE single-typo tolerance ("tournaquet" → tourniquet, honest match-note shown).
**Accept.** Live URL byte-identical: DONE. joe passes the gate: DONE.

## P5 — Later (parked)
- **P5a DONE (2026-10-02, v2.0):** plant appendices extracted + PLANT lane shipped (111 edible/medicinal + 17 poisonous, verbatim fields, page-level provenance); release of record sha `ff5e8e9d906893a0…`, live byte-verified.
- Corpus expansion: FM 4-25.11 (2002), USDA plant data, Boy Scout 1911 knots/shelter.
- Size budget: TRU.html is 35MB; LIFELINE corpus is tiny (~1MB text) — target <2MB single file.
- Multi-language: not now. English sources only; honest about that.
