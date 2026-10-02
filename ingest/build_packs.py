#!/usr/bin/env python3
"""TRU LIFELINE P1 — derive lane packs (PROCEDURES / TOPICS / TERMS / DANGERS)
from the raw paragraph records in data/.

Doctrine: packs carry verbatim source text only. Nothing is paraphrased,
no para numbers invented, qa_flags flow through. Each pack entry is
provenance-complete so the engine can always quote its source paragraph.

Outputs: data/packs/{topics,procedures,terms,dangers}.json + a build log.
"""
import json, re, os, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(DATA, "packs")
LOG = os.path.join(ROOT, "ingest", "build_packs_2026-10-02.log")

log_lines = []
def log(msg):
    log_lines.append(msg)
    print(msg)

def rid_of(rec):
    h = hashlib.md5()
    h.update(f"{rec['manual']}|{rec['chapter']}|{rec.get('section','')}|{rec.get('lead','')}|{rec['text'][:80]}".encode())
    return h.hexdigest()[:10]

def norm(s):
    return re.sub(r"[^a-z0-9 ]+", " ", s.lower()).strip()

def ref_fields(rec, rid):
    return {
        "id": rid,
        "manual": rec["manual"],
        "chapter": rec["chapter"],
        "chapter_title": rec.get("chapter_title", ""),
        "section": rec.get("section", ""),
        "para": rec.get("para", ""),
        "qa_flags": rec.get("qa_flags", []),
    }

def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)["records"]

# ---------------------------------------------------------------- TOPICS
def build_topics(records):
    topics = []
    skipped = 0
    for r in records:
        if not r["text"].strip():
            skipped += 1
            continue
        title = r.get("lead") or r.get("section") or r.get("chapter_title", "")
        e = ref_fields(r, rid_of(r))
        e["title"] = title
        e["key"] = norm(title)
        e["text"] = r["text"]
        topics.append(e)
    log(f"TOPICS: {len(topics)} entries ({skipped} empty-text records skipped)")
    return topics

# ---------------------------------------------------------------- PROCEDURES
LETTER_STEP = re.compile(r"(?m)^\s*([a-z])\.\s+")
STEP_N = re.compile(r"\bStep\s+(\d{1,2})\s*[:.]\s*")
LATIN_NAME = re.compile(r"\([A-Z][a-z]+(?:\s+[a-z]+)+\)")

def split_lettered(text):
    ms = list(LETTER_STEP.finditer(text))
    if len(ms) < 3:
        return None
    intro = text[: ms[0].start()].strip()
    steps = []
    for i, m in enumerate(ms):
        seg = text[m.start(): ms[i + 1].start() if i + 1 < len(ms) else len(text)]
        steps.append(seg.strip())
    return intro, steps

def split_stepn(text):
    ms = list(STEP_N.finditer(text))
    if len(ms) < 2:
        return None
    intro = text[: ms[0].start()].strip()
    steps = []
    for i, m in enumerate(ms):
        seg = text[m.start(): ms[i + 1].start() if i + 1 < len(ms) else len(text)]
        steps.append(seg.strip())
    return intro, steps

def build_procedures(records):
    """PROCEDURES is an index into TOPICS. Steps are carried verbatim ONLY where
    the scan preserves real step boundaries (21-11 lettered substeps; 21-76
    explicit "Step N." markers). Bullet structure in the 21-76 PDF text layer is
    collapsed (pdftotext), so bulleted records are indexed with method
    bullet-list and bullet_count only — item boundaries are never invented.
    Latin-name species lists are taxonomy, not procedure; they are excluded
    (DANGERS carries the snake species; plant lists stay in TOPICS)."""
    procs = []
    counts = {"lettered-substeps": 0, "numbered-steps": 0, "bullet-list": 0}
    for r in records:
        rid = rid_of(r)
        title = r.get("lead") or r.get("section") or r.get("chapter_title", "")
        made = None
        method = None
        if r["manual"].startswith("FM 21-11"):
            made = split_lettered(r["text"])
            method = "lettered-substeps"
        else:
            if LATIN_NAME.search(r["text"]) and len(LATIN_NAME.findall(r["text"])) >= 3:
                continue  # taxonomy list, not a procedure
            made = split_stepn(r["text"])
            if made:
                method = "numbered-steps"
            elif r["text"].count("\u2022") >= 3:
                made = (r["text"].split("\u2022")[0].strip(), None)
                method = "bullet-list"
        if not made:
            continue
        intro, steps = made
        e = ref_fields(r, rid)
        e["title"] = title
        e["key"] = norm(title)
        e["method"] = method
        e["intro"] = intro
        e["steps"] = steps
        e["bullet_count"] = r["text"].count("\u2022") if method == "bullet-list" else None
        e["topic_id"] = rid
        procs.append(e)
        counts[method] += 1
    log(f"PROCEDURES: {len(procs)} entries "
        f"(lettered: {counts['lettered-substeps']}, numbered: {counts['numbered-steps']}, "
        f"bullet-indexed: {counts['bullet-list']}); verbatim steps only where boundaries "
        f"are real; bullet-list entries carry bullet_count, never invented splits")
    return procs

# ---------------------------------------------------------------- TERMS
DEF_PATTERNS = [
    ("is-defined-as", re.compile(r"\b(?:is|are)\s+defined\s+as\b", re.I)),
    ("is-known-as", re.compile(r"\b(?:is|are)\s+known\s+as\b", re.I)),
    ("is-called", re.compile(r"\b(?:is|are)\s+called\b", re.I)),
    ("referred-to-as", re.compile(r"\b(?:is|are)\s+referred\s+to\s+as\b", re.I)),
    ("refers-to", re.compile(r"\brefers?\s+to\b")),
    ("the-term", re.compile(r"\bthe\s+term\b", re.I)),
    ("is-a", re.compile(r"\b(?:is|are)\s+(?:a|an|the)\s+[a-z]", re.I)),
]
SUBJECT = re.compile(r"^(.{2,60}?)\s+(?:is|are)\s+(?:defined as|known as|called|referred to as)")
COPULA_SUBJECT = re.compile(r"^(.{2,60}?)\s+(?:is|are)\s+(a|an|the)\s+[a-z]", re.I)
THE_TERM = re.compile(r"\bthe\s+term\s+([A-Za-z][A-Za-z\- ]{1,40})", re.I)
BAD_TERM = re.compile(r"\b(but|which|that|and|if|when|while)\b|[,;{}\[\]]")
BAD_SUBJECT = {"since","if","when","while","because","although","however","but","this","that","these","those","there","it","they","he","she","you","i","we","in","on","at","for","with","as","after","before","during","under","upon","part","once","then","thus","hence","also","and","or","neither","either","not","both","each","any","all","some","such","so","very","most","more","other","another"}

SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")

def build_terms(records):
    terms = []
    seen = set()
    for r in records:
        rid = rid_of(r)
        flat = re.sub(r"\s+", " ", r["text"])
        for sentence in SENT_SPLIT.split(flat):
            if len(sentence) < 12:
                continue
            for name, pat in DEF_PATTERNS:
                if not pat.search(sentence):
                    continue
                term = None
                s = sentence.strip()
                m = SUBJECT.match(s)
                cand = m.group(1).strip() if m else (COPULA_SUBJECT.match(s).group(1).strip() if COPULA_SUBJECT.match(s) else None)
                if cand is not None:
                    words = cand.split()
                    pronoun = cand.lower() in ("this", "that", "these", "those", "they", "it", "he", "she") or cand.split()[0].lower().strip(",.()") in BAD_SUBJECT
                    if not pronoun and len(words) <= 6 and not BAD_TERM.search(cand):
                        term = cand
                if term is None:
                    m2 = THE_TERM.search(sentence)
                    if m2:
                        term = m2.group(1).strip().rstrip(" .,")
                obj = re.search(r"\\b(?:is|are)\\s+(?:defined\\s+as|known\\s+as|called|referred\\s+to\\s+as)\\s+(?:the\\s+|a\\s+|an\\s+)?([A-Za-z][A-Za-z\\- ]{2,40})", sentence)
                if term is None and obj:
                    term = obj.group(1).strip()
                if term is None and name in ("is-called", "is-known-as", "referred-to-as"):
                    m3 = re.search(r"\b(?:is|are)\s+(?:called|known\s+as|referred\s+to\s+as)\s+(?:the\s+|a\s+|an\s+)?([A-Za-z][A-Za-z\- ]{1,40})", sentence, re.I)
                    if m3:
                        cand3 = m3.group(1).strip().rstrip(" .,;:()")
                        if cand3 and len(cand3.split()) <= 4 and not BAD_TERM.search(cand3):
                            term = cand3
                k = (rid, sentence[:120])
                if k in seen:
                    break
                seen.add(k)
                e = ref_fields(r, rid)
                e["term"] = term
                e["pattern"] = name
                e["sentence"] = s
                if e.get("term"):
                    terms.append(e)
                break
    log(f"TERMS: {len(terms)} definitional sentences ({sum(1 for e in terms if e['term'])} with clean subject term)")
    return terms

# ---------------------------------------------------------------- DANGERS
SNAKE_SECTIONS = {
    "POISONOUS SNAKES OF THE AMERICAS": "Americas",
    "POISONOUS SNAKES OF EUROPE": "Europe",
    "POISONOUS SNAKES OF AFRICA AND ASIA": "Africa and Asia",
    "POISONOUS SNAKES OF AUSTRALASIA": "Australasia",
}
DANGER_2111_PARAS = {"9-6", "9-7", "9-10"}
SPECIES_ITEM = re.compile(
    r"([A-Z][A-Za-z'\u2019\-]+(?:\s+[A-Za-z'\u2019\-]+){0,3}?)\s*" 
    r"\(([A-Z][a-z]+(?:\s+[a-z]+)+)\)")

def build_dangers(records, topics_by_id):
    dangers = []
    for r in records:
        if r["manual"].startswith("FM 21-76") and r["chapter"] == 11:
            rid = rid_of(r)
            title = r.get("section") or r.get("lead") or ""
            if title in SNAKE_SECTIONS:
                # species are "Name (Genus species)" items; pdftotext collapsed the
                # bullets, so split per species at the Latin-name parens (verbatim)
                for name, latin in SPECIES_ITEM.findall(r["text"]):
                    e = ref_fields(r, rid)
                    e["name"] = f"{name.strip()} ({latin})"
                    e["kind"] = "species"
                    e["region"] = SNAKE_SECTIONS[title]
                    e["topic_id"] = rid
                    dangers.append(e)
            else:
                e = ref_fields(r, rid)
                e["name"] = title
                e["kind"] = "topic"
                e["topic_id"] = rid
                dangers.append(e)
        elif r["manual"].startswith("FM 21-11") and (
            r["chapter"] == 11 or r.get("para") in DANGER_2111_PARAS
        ):
            rid = rid_of(r)
            e = ref_fields(r, rid)
            e["name"] = r.get("lead") or ""
            e["kind"] = "treatment"
            e["topic_id"] = rid
            dangers.append(e)
    log(f"DANGERS: {len(dangers)} entries "
        f"(21-76 ch11 topics; snake species split per-species at Latin-name parens, verbatim; "
        f"21-11 treatment records 9-6/9-7/9-10 + ch11 toxic environment). "
        f"Full text lives in TOPICS under topic_id; DANGERS holds the index.")
    return dangers

# ---------------------------------------------------------------- main
def write_pack(name, entries, method):
    pack = {
        "pack": name,
        "derived_from": ["data/fm2111_1976.json", "data/fm2176_1992.json"],
        "method": method,
        "count": len(entries),
        "entries": entries,
    }
    path = os.path.join(OUT, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(pack, f, ensure_ascii=False, indent=1)
    log(f"  written: data/packs/{name}.json ({len(entries)} entries)")
    return pack

def main():
    os.makedirs(OUT, exist_ok=True)
    r1 = load("fm2111_1976.json")
    r2 = load("fm2176_1992.json")
    log(f"loaded: 21-11 {len(r1)} records, 21-76 {len(r2)} records")
    records = r1 + r2
    for r in records:
        r["rid"] = rid_of(r)

    topics = build_topics(records)
    procs = build_procedures(records)
    terms = build_terms(records)
    dangers = build_dangers(records, topics)

    write_pack("topics", topics, "one entry per source paragraph record; title = lead/section heading, text verbatim")
    write_pack("procedures", procs, "records with >=3 mechanical step markers; steps split at markers, text verbatim")
    write_pack("terms", terms, "definitional sentences via explicit patterns; sentence verbatim, subject-only term extraction")
    write_pack("dangers", dangers, "index only: species bullets + topic/treatment refs to TOPICS (topic_id)")

    with open(LOG, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines) + "\n")
    print("log written:", LOG)

if __name__ == "__main__":
    main()
