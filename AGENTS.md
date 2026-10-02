# TRU LIFELINE — Project Guidance

TRU LIFELINE — offline, non-LLM, source-bound **survival + first-aid** engine. Single self-contained HTML, zero network at runtime, no accounts, no telemetry. Built on the proven TRU engine doctrine (sibling project: `/home/workspace/TRU` — read its AGENTS.md for the full non-negotiables and audit-log discipline; the engine shell, route-map law, voice reader, and boot veil carry over).

Purpose, in one line: when the network is gone — shutdown, disaster, wilderness, war — the knowledge that keeps a body alive must already be in the file.

## Non-negotiables (inherited from TRU + hardened for medical)

- **Never generate.** Deterministic lanes only; honest GAP when no source-backed match. A wrong guess in a survival context can cost a life — the honest GAP is a safety feature, not a UX flaw.
- **Never synthesise medical/survival advice.** Every card quotes or cites the source paragraph. No paraphrase that changes meaning, no merged "advice" across sources. If sources conflict, show both with provenance — never reconcile silently.
- **No OCR guess-correction.** The djvu OCR has noise (`Tlie`, `firat`, `niny`). The build pipeline must NOT silently "fix" meaning-critical tokens (doses, ratios, times, temperatures). Suspicious tokens get QA-flagged; corrections only with two-source or context verification, logged.
- **Public-domain sources only.** Verified licences for everything in `source/`. Commercial reprints with added © material are rejected (documented in PROVENANCE.md).
- **Zero network at runtime. Single self-contained HTML.** Distributable by USB stick / SD card / Bluetooth — the distribution path of the shutdown zones.
- **Provenance on every card**: manual + chapter + paragraph number, dim/expandable per TRU's voice directive (inspectable, not shouted).
- Route order is law (will be fixed in the design doc once lanes are set). Chips are routes too — every chip walked live before release.
- Verification discipline: every claimed fix re-tested against the live artifact (browser smoke + hash), never asserted.

## Extraction state (2026-10-02)
- `data/fm2111_1976.json`: **120 records**, 12 chapters, from the PDF text layer (121 minus one cross-ref artifact dropped in the 2026-10-02 audit). Extractor: `ingest/extract_fm2111.py` (monotonic chapter guard handles OCR's split "CHAPTER 1"+"1" for ch11).
- `data/fm2176_1992.json`: 443 records, 23 chapters, from `source/raw/FM21-76_survival_pdf.txt` (pdftotext — use this, NOT the djvu dump). Extractor: `ingest/extract_fm2176.py`.
- Schema: `{manual, chapter, chapter_title, section, para, lead, text, qa_flags}` — section-based records for 21-76 (no paragraph numbering in this edition), paragraph records for 21-11.
- Plant appendices B/C absent from the 233-page dump; future pack (NEEDS.md P5). Latin-name paren lines must never be treated as headings.
- Lesson: prefer the archive.org PDF text layer over djvu OCR dumps when both exist.
- 21-76 extractor QA (2026-10-02): fixed multi-line-heading body-slice bug — body now starts after the full heading span; 2 records lost leaked heading-tail fragments, 443 counts unchanged.
- 21-11 extractor QA (2026-10-02): marker regex no longer crosses newlines; inline cross-reference artifacts ("…described in paragraph 9-14.") can no longer spawn spurious records (2 dropped). Three OCR-duplicate markers relabelled via the scan's own TOC ranges: 4-6→4-8 (Digital Pressure), 5-6→5-8 (Keep the Soldier Comfortably Warm), 6-16→6-18 (Foot) — each carries a `marker-corrected` qa_flag citing the TOC range evidence. Gap-flag generator now also flags duplicate markers instead of emitting wrong gap text.
- Packs (2026-10-02, `data/packs/`): TOPICS 563 • PROCEDURES 125 (steps verbatim only where boundaries are real; bullet-list entries indexed with bullet_count, never invented splits) • TERMS 9 • DANGERS 63 (26 species). Builder: `ingest/build_packs.py`, log `ingest/build_packs_2026-10-02.log`.
- Spot-check: **20/20 PASS** (`references/spotcheck-2026-10-02.md`, seeded 20261002, 10 per manual). Pre-audit data kept as `data/*.pre-audit-bak.json`.
- **P3 DONE (2026-10-02):** engine `tru-lifeline.html` = TRU v17 shell doctrine adapted; initial build sha `e8675bd59f4209b1…` (1,114,719 bytes — under the 2MB target; superseded by v1.2 below). Build: `BUILD_STAMP="<fixed>" python3 engine/build.py` (deterministic; reads `engine/tru17_head.html` + `engine/lifeline_body_shell.html` + packs + `engine/lifeline_app.js`).
- **P4 DEPLOYED (2026-10-02):** public repo `splashdown1/tru-lifeline` → GitHub Pages live at https://splashdown1.github.io/tru-lifeline/ (engine = index.html; no landing page needed at 1.1MB). Live copy byte-verified (sha match). Repo carries the full build pipeline + sources + audit trail.
- **VOICE GATE PASSED (joe, real machine, 2026-10-02).** TTS reads sections; 30+ local voices detected; honest fallback status line when no recognisably female voice is listed (dropdown choice is the honest path — Android codes not gender-guessed, by design).
- **v1.2 RELEASE OF RECORD (2026-10-02, post-gate fixes):** sha `286003bd0a557bd6…` (1,116,528 bytes), deployed + byte-verified live. Real-machine test findings, all fixed and verified on production: D1 raw-HTML leak on TOPIC/DANGER/PROC/DEFINE cards (lanes now set `html: true`; GAP pointer chips render, not escaped text); D2 send button was never wired (only Enter worked — added `sendBtn.addEventListener`); D3 de-compound danger picks lost manual/chapter provenance via the pickScored wrapper (`CH undefined` — pick `.e.e` unwraps); D4 one-typo tolerance for DEFINE terms (`tournaquet`→tourniquet, length≥5, data-derived, honest "one-letter difference" note; terms entries lack topic_id so cards cite the entry's own provenance); D5 deterministic builds via `BUILD_STAMP` env.
- Lane sweep: **28/28 PASS** live (`engine/sweep.py` → `references/sweep-live.md`), chip click-through walked (solar still → Desalting Kits chip → TOPIC card), 0 console errors, file:// boot OK, reader honest pause on speech error (no TTS in sandbox browser). Golden-table corrections made from data: Aboveground Still is a TOPIC (prose, no real step boundaries — never invent splits); "edible plants of the seashore" → GAP + nearest-covered pointer (Plant Foods) is the honest result.
- Engine lessons (P3): stem() must be consistent both sides (bites→bit vs bite→bite broke de-compounding; fixed: es-rule strips one s, then e-rule for len>3). edit_file ops: search_block is consumed — anything in it must be re-emitted in replace_block or it is deleted. agent-browser eval output is a JSON-quoted string — json.loads twice. When a session's file state disagrees with memory, re-read the file before editing (memory lag caused a corrupted const line once — node --check catches it).
- 21-11 extractor QA (2026-10-02): fixed a record-truncation bug (line index used as char offset for chapter end — last records of chapters were cut or empty; 12-17 had 0 chars). End offsets are now `len(block)`. Total text 179,865 chars across 121 records.
- OCR marker loss is real and pervasive: 22 para numbers exist in the manual but their marker lines were lost in the scan (ch3/4/6/7/8/9/10/11/12). Records spanning a lost marker carry `qa_flags: ocr-marker-gap` and honest para labels (`12-3–12-7*` style) — never invent a para number. Comma-OCR markers recovered (`12-12,` → 12-12).
- Verify rule for extractors: after any change, check the LAST record of every chapter runs into the next chapter heading, and spot-check paragraph numbers against the raw text (line-start markers only; mid-line references are cross-refs, not markers).

## Verified corpus (2026-10-02, licences checked)

| Source | Edition | Licence status | File |
|---|---|---|---|
| FM 21-76 Survival (Dept. of the Army, 1970; 23 chapters + appendices incl. edible/medicinal & poisonous plants) | US Army | US Gov work — public domain; archive.org item marked CC publicdomain | `source/raw/FM21-76_survival.txt` (558,889 bytes) |
| FM 21-11 First Aid for Soldiers (Dept. of the Army, June 1976; ABC-measure structure: airway, bleeding, shock, wounds, burns, fractures, common emergencies, transport, toxic env, psychological first aid) | US Army | US Gov work — public domain | `source/raw/FM21-11_firstaid_1976.txt` (197,722 bytes) |
| FM 21-11 First Aid for Soldiers (1943) | US Army | PD | `source/raw/FM21-11_firstaid_1943.txt` (119,544 bytes) — kept as secondary/contrast source; v1 builds from 1976 |

- **REJECTED:** the 1992 Barnes & Noble / Platinum Press reprint of FM 21-76 — "New material © 1991 Platinum Press Inc." Not clean. Do not use any reprint-derived text.
- Candidate later additions (scout before use): FM 4-25.11 (2002 first aid), USDA edible-plant data (US Gov PD), Boy Scout Handbook 1911 (Gutenberg PD). NOT usable: *Where There Is No Doctor* (Hesperian — copyrighted, special licence; exclude unless joe decides otherwise).

## Build pipeline (planned)

- `ingest/extract.py` — segment both manuals by paragraph numbering (`n-n.` structure in FM 21-11; chapter/heading structure in FM 21-76), emit data packs (JSON) with paragraph-level provenance.
- Packs: PROCEDURES (numbered step sequences), TOPICS (from manual headings, Nave's-style), TERMS (source-defined terms: shock, tourniquet, solar still…), DANGERS (poisonous plants/animals — explicit index, exact-match).
- Lane law: `references/LANES.md` (P2, 2026-10-02) — route order STATE→READER→CALC→DEFINE→DANGER→PROCEDURE→TOPIC→TOPIC-FUZZY→GAP is law; golden-query tables are the regression sweep.
- Engine: adapt TRU shell (v17, sha 795968295bafe21a…) — swap corpora, wire packs, keep route-map law, reader (chapter/section = verse), voice, boot veil, portal panel, one-chip Socratic rule.
- Release gate (same as TRU): live artifact smoke + lane regression sweep + 0 console errors + hash + Pages byte-verify + **real-machine voice test by joe**.

## Voice & tone

TRU's voice rules carry over: posture statement first boot only; GAP one-liner after first GAP; no boilerplate. LIFELINE adds one: an emergency query that routes to GAP should point to the nearest covered source topic without inventing one ("no source entry — nearest covered: X").
