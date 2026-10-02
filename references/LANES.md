# TRU-LIFELINE — Lane design (P2, route order is law)

Status: **P2 DESIGN DOC — 2026-10-02.** Written before engine work starts, per NEEDS.md.
Inherits TRU doctrine (`/home/workspace/TRU/AGENTS.md`) hardened for medical: never synthesise
advice, every card quotes the source paragraph, honest GAP is a safety feature.

Golden queries marked **[verified]** were checked against the shipped packs
(`data/packs/*.json`, build log `ingest/build_packs_2026-10-02.log`) on 2026-10-02.
Queries marked **[P3-verify]** depend on matching behaviour that only exists once the
engine is built — they are sweep requirements for P3/P4, not claims.

---

## Route order (the law)

```
0. STATE        meta only: help / where am i / about / sources
1. READER       explicit read + navigation commands
2. CALC         pure arithmetic only — never medical numbers
3. DEFINE       definitional phrasing → TERM sentence match
4. DANGER       exact key match on the DANGERS index
5. PROCEDURE    exact procedure-title match; "how to" phrasing
6. TOPIC        exact TOPICS title match
7. TOPIC-FUZZY  gated fuzzy over TOPICS titles
8. GAP          honest gap (+ nearest-covered pointer)
```

Rationale, position by position:

- **STATE first** — meta questions must never be swallowed by content lanes (TRU lesson: "voice help" hit the phrase lane, Round 10/A3).
- **READER second** — explicit navigation commands are unambiguous user intent; nothing else may steal them (TRU: reader jumps died silently once, v9).
- **CALC third** — fires only on pure arithmetic (`X% of Y`, +−×÷). It must never compute medical numbers; dose/ratio/time questions are content queries and belong to the source lanes or GAP.
- **DEFINE fourth** — "what is/are X" and "define X" are explicit definitional intent. It sits above the content lanes so definitional phrasing is not swallowed by an exact-title hit, and it *falls through* when no TERM sentence matches — no invented definitions, ever.
- **DANGER fifth** — species and hazard names are unambiguous nouns; exact-match cannot false-positive, so it is safe this high. A dangerous subject must never be shadowed by a fuzzy topic.
- **PROCEDURE sixth** — exact procedure titles and "how to" phrasing. Sits below DANGER because a bare species name is a hazard question first, a treatment question when phrased as one (see derived keys).
- **TOPIC seventh** — exact heading match over the 563-entry index.
- **TOPIC-FUZZY eighth** — hard-gated fuzzy, the last content lane. TRU v11 lesson: ungated nearest-topic matching silently reframes out-of-scope questions; here a wrong "nearest topic" in a medical context is worse. Gate: fire only when **every** query content word (stemmed) appears in the candidate title, or the candidate title (stemmed) is fully contained in the query. Overreach → GAP.
- **GAP last** — never generates. On emergency-phrased GAPs it points to the nearest *covered* source topic, labelled as such — see Emergency hardening.

## Matching rules (precise, deterministic)

- **Normalisation:** lowercase; punctuation stripped; hyphens → spaces; whitespace collapsed.
- **Content words:** tokens minus the TRU QW stopword set.
- **Light stemming:** strip trailing `s`/`es` only (no Porter-style aggression — "bite" ≠ "biting" but "bites" = "bite").
- **Key equality:** normalised query equals a normalised pack key.
- **Key containment:** all query content words (stemmed) appear in the key's content words, or all the key's content words appear in the query. Fires only when the match is **unique** across the pack; ambiguity → fall through (honest, not a guess).
- **Derived keys (DANGER treatment entries):** conjunction-split + singularisation of entry titles, e.g. `Snake and Spider Bites and Scorpion Stings` → `snake bite`, `spider bite`, `scorpion sting`. Mechanical title decomposition, no invented content.
- **Head-noun fallback (PROCEDURE, [P3-verify]):** with "how to"-class phrasing, if exactly one procedure key shares the query's distinctive head noun (stemmed), fire; if more than one, fall through. Example: "how to apply a tourniquet" → 21-11 `Tighteing the Tourniquet` (the lead's OCR garble is quoted as scanned, flagged `ocr-suspect` where present).

## Card rules

- Every card quotes the source paragraph verbatim with provenance (manual + chapter + section/para), dim/expandable per the voice directive.
- Conflict rule: if two manuals disagree, both are shown with provenance — never reconciled.
- **One-chip Socratic follow-up** (TRU rule), data-derived only:
  - PROCEDURE → next section in the same chapter (mechanical next-heading).
  - TOPIC → next sibling section in the same chapter.
  - DEFINE → reader jump chip to the sentence's source paragraph ("read the section").
  - DANGER species → the snake-bite treatment entry (all species entries come from the snake sections; the mapping is pack-structural, not curated) — for non-snake topics, the next sibling section.
  - READER → next section.
  - GAP → the nearest-covered pointer chip when one exists; **no chip when none does.**
- Chips are routes too: every chip walked live before release (P4 gate).

## Emergency hardening

- An emergency query that cannot be source-matched gets the GAP one-liner **plus** a nearest-covered pointer: `no source entry — nearest covered: X` (joe's directive). The pointer is a real entry, never an invented remedy.
- No lane ever produces dosages, timings, or ratios that are not verbatim from a source paragraph.
- The CALC lane must never be reachable from medical phrasing ("half of the dose" is not arithmetic).

## Golden queries — the regression sweep

Exact-match landings below were verified against the packs on 2026-10-02. This table is the
P3/P4 lane-regression sweep; the P4 release gate walks all of it live (real send flow, chips
clicked, 0 console errors).

### STATE (shell gate)
| query | expected |
|---|---|
| `help` | help card [verified: shell] |
| `where am i` | position card (reader state or "no reader") [verified: shell] |
| `about` | portal panel: counts + build hash + source list [verified: shell] |
| `sources` | provenance list (both manuals + licence status) [verified: shell] |
| `what is this` | posture statement, first boot only [verified: shell] |

### READER
| query | expected |
|---|---|
| `read fm 21-11 chapter 9` | reader opens FM 21-11 ch9 at first record [verified: 21-11 ch9 has 12 records] |
| `read survival chapter 11` | reader opens FM 21-76 ch11 (DANGEROUS ANIMALS) [verified: 28 records] |
| `open chapter 16` | reader opens FM 21-76 ch16 (SEA SURVIVAL) [verified: 39 records] |
| `next section` / `previous` | reader step, position-preserving [P3-verify: aliases] |
| `where am i` (reader open) | position: manual + chapter + section [verified: shell rule] |

### CALC (never medical)
| query | expected |
|---|---|
| `45% of 100` | 45 [verified: TRU v15 calc behaviour] |
| `15% of 80` | 12 |
| `3 × 7` | 21 |
| `100 / 4` | 25 |
| `how much water per day` | **NOT calc** → falls through to TOPIC-FUZZY (`water` ⊆ Water Procurement) [P3-verify] |

### DEFINE
| query | expected landing (TERM sentence, verbatim) |
|---|---|
| `what is the pulse` | 21-11 ch2: "This cycle of expansion and contraction of the arteries is called the pulse." [verified] |
| `define stressors` | 21-76 ch2: "These events … are called \"stressors.\"" [verified] |
| `what is ventilation` | 21-11 12-15: "This process which is known as \"ventilation\" …" [verified] |
| `define half-life` | 21-76 ch23: "This concept is known as radioactive half-life." [verified] |
| `what is a triangular bandage` | 21-11 ch6: "If this bandage is applied without folding it, it is called a triangular bandage." [verified] |
| `what is a cravat bandage` | 21-11 ch6: "If it is folded into a strip, it is called a cravat bandage." [verified] |
| `define indian turnip` | 21-76 ch9: "The corm (bulb) of the jack-in-the-pulpit is known as the \"Indian turnip\" …" [verified] |

### DANGER
| query | expected landing |
|---|---|
| `cottonmouth` | species: Cottonmouth (Agkistrodon piscivorus), Americas [verified] |
| `puff adder` | species: Puff adder (Bitis arietans), Africa and Asia [verified] |
| `gila monster` | topic: Gila Monster (21-76 ch11) [verified] |
| `blue-ringed octopus` | topic: Blue-Ringed Octopus (21-76 ch11) [verified] |
| `leeches` | topic: LEECHES (21-76 ch11) [verified] |
| `electric eel` | topic: Electric Eel (21-76 ch11) [verified] |
| `poisonous snakes` | topic: POISONOUS SNAKES (21-76 ch11) [verified] |
| `snake bite` | treatment: Snake and Spider Bites and Scorpion Stings (21-11 9-6, derived key) [verified] |
| `animals and fish poisonous to eat` | topic: Animals and Fish Poisonous to Eat [verified] |

### PROCEDURE
| query | expected landing |
|---|---|
| `how to open an airway` | Open Airway And Maintain (21-76 ch4, numbered steps ×6, steps quoted verbatim) [verified] |
| `shadow tip method` | Shadow-Tip Methods (21-76 ch18, numbered steps ×4) [verified] |
| `how to make a belowground still` | Belowground Still (21-76 ch6, bullet-indexed, bullet_count) [verified] |
| `how to build a poncho lean to` | Poncho Lean-To (21-76 ch5, bullet-indexed) [verified] |
| `rules for splinting` | Rules for Splinting (21-11 ch8, lettered steps) [verified] |
| `how to apply a tourniquet` | Tighteing the Tourniquet (21-11 ch8 region; head-noun fallback) [P3-verify] |
| `how to splint a fracture` | Rules for Splinting (head-noun/containment) [P3-verify] |
| `how to signal with a mirror` | Mirrors or Shiny Objects (21-76 ch19 — TOPIC lane landing unless procedure-indexed by then) [P3-verify] |

### TOPIC (exact)
| query | expected landing |
|---|---|
| `solar still` | Solar Still (21-76 ch16) [verified] |
| `survival kits` | Survival Kits (21-76 ch3) [verified] |
| `water procurement` | Water Procurement (21-76 ch6) [verified] |
| `psychology of survival` | Psychology of Survival (21-76 ch2) [verified] |
| `desert survival` | Desert Survival (21-76 ch13) [verified] |
| `cold weather survival` | Cold Weather Survival (21-76 ch15) [verified] |
| `camouflage` | Camouflage (21-76 ch21) [verified] |
| `signaling techniques` | Signaling Techniques (21-76 ch19) [verified] |
| `splint fractures` | Splint Fractures (21-11 5-6 — TOPIC, no step boundaries in scan) [verified] |

### TOPIC-FUZZY (gated)
| query | expected |
|---|---|
| `surviving in the desert` | Desert Survival (content words contained after stemming) [P3-verify] |
| `shelter basics` | Types of Shelters [P3-verify] |
| `staying warm in cold weather` | Cold Weather Survival [P3-verify] |
| `how much water per day` | Water Procurement (see CALC negative) [P3-verify] |
| `finding food in the jungle` | **GAP** — "jungle" in no title; Tropical Survival is the nearest-covered pointer only if the pointer rule admits region words [P3-verify: decide honestly, document choice] |

### GAP (must not answer)
| query | expected |
|---|---|
| `capital of france` | honest GAP, no pointer (nothing survival-related) |
| `poison ivy treatment` | honest GAP + nearest covered: Skin Eruptions from Poisonous Plants (21-11 9-7) / Contact Dermatitis (21-76 ch10) [verified: both entries exist; ch10 text mentions poison ivy but v1 has no full-text lane] |
| `make penicillin` | honest GAP, no pointer, no invented remedy |
| `antibiotics dosing` | honest GAP, no pointer |
| `world war 2 end date` | honest GAP, no pointer |

## Known lane gaps (honest, documented)

- **TERM pack is thin (9 sentences).** DEFINE survives on it plus fall-through to TOPIC/PROCEDURE. Expansion candidate (P5): build-time term harvesting is capped by what the sources explicitly define — no padding.
- **No full-text search lane in v1** (NEEDS.md lane list is law). "poison ivy" appears in ch10 body text but is not a heading; GAP's nearest-covered pointer handles it. A PHRASE lane is parked for P5 review.
- **Aboveground Still is TOPIC-only** — its scan has <3 bullet markers, so it did not qualify as a procedure. Honest consequence of the no-invented-boundaries rule; "solar still" reaches it via TOPIC (ch6 heading STILL CONSTRUCTION also covers the construction steps).
- **21-11 OCR lead garbles are quoted as scanned** (`Tighteing the Tourniquet`, `Bask Guides`), flagged `ocr-suspect`/`ocr-garble` — never silently corrected.

## Out of scope / parked (from NEEDS.md P5)

FM 4-25.11 (2002), USDA plant data, Boy Scout 1911, plant appendices B/C, multi-language. *Where There Is No Doctor* is excluded (licence) unless joe decides otherwise.
