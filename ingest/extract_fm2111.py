#!/usr/bin/env python3
"""TRU LIFELINE P1 — segment FM 21-11 (1976) into paragraph-level records.

Output: data/fm2111_1976.json — records with manual, chapter, section, para, text, title.
Meaning-critical tokens are NOT corrected; suspicious OCR patterns are flagged (qa_flags).
"""
import json, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "source", "raw", "FM21-11_firstaid_1976.txt")
OUT = os.path.join(ROOT, "data", "fm2111_1976.json")

CH_RE = re.compile(r"^CHAPTER\s+(\d{1,2})\s*$|^CHAPTER\s+(\d)\s+(\d)\s*$", re.M)
SEC_RE = re.compile(r"^Section\s+([IVX]+)\.?\s*(.*)$", re.M)
PARA_RE = re.compile(r"^(\d{1,2})\s*[–—-]\s*(\d{1,3})\s*[.,][ \t]*(.*)$", re.M)

# OCR-noise suspects: token patterns that must be flagged, never fixed silently here
SUSPECT = re.compile(r"\b(Tlie|firat|niny|CoAAMon|FJR5T|lQ-|1 1[-\s]\d)\b")

# garble detector: flag records with high out-of-dictionary vocabulary.
# /usr/share/dict/words (~100k American English) — OCR mojibake like "suljstitute" is not a word.
try:
    with open("/usr/share/dict/words", encoding="utf-8", errors="replace") as _f:
        DICT = {w.strip().lower() for w in _f if w.strip()}
except FileNotFoundError:
    DICT = set()

def garble_ratio(text):
    tokens = [t for t in re.findall(r"[A-Za-z']{5,}", text) if t.lower() not in DICT]
    total = len(re.findall(r"[A-Za-z']{5,}", text))
    if total < 8:
        return 0.0
    return len(tokens) / total

def clean_line(line):
    return line.rstrip()

def main():
    raw = open(SRC, encoding="utf-8", errors="replace").read()
    lines = raw.split("\n")

    # locate chapter blocks: a CHAPTER line followed within 6 lines by its ALL-CAPS title
    chapters = []
    for i, l in enumerate(lines):
        m = CH_RE.match(l.strip())
        if not m:
            continue
        title = ""
        for j in range(i + 1, min(i + 7, len(lines))):
            t = lines[j].strip()
            if t and (t.isupper() or SEC_RE.match(t)):
                title = re.sub(r"\s+", " ", t)
                break
            if t:
                break
        num = int(m.group(2)) * 10 + int(m.group(3)) if m.group(2) else int(m.group(1))
        chapters.append((num, i, title))

    # OCR prints chapter 11 as "CHAPTER 1" + "1" (num resets); enforce monotonic numbering
    fixed_chapters = []
    prev = 0
    for num, start, title in chapters:
        if num <= prev:
            num = prev + 1
        prev = num
        fixed_chapters.append((num, start, title))

    records = []
    problems = []
    for c_idx, (num, start, title) in enumerate(fixed_chapters):
        end = chapters[c_idx + 1][1] if c_idx + 1 < len(chapters) else len(lines)
        block = "\n".join(lines[start:end])
        # find paragraph starts inside the block
        paras = list(PARA_RE.finditer(block))
        if not paras:
            problems.append(f"chapter {num}: no paragraphs found")
            continue
        # chapter title from first para context if empty
        for p_idx, p in enumerate(paras):
            sec = " ".join(x.strip() for x in block[max(0, p.start()-300):p.start()].split("\n")[-3:])
            sec_m = re.search(r"Section\s+([IVX]+)\.?\s*([A-Z][^\n]*)", sec)
            text = re.sub(r"[ \t]+", " ", block[p.end():paras[p_idx+1].start() if p_idx+1 < len(paras) else len(block)]).strip()
            flags = []
            if SUSPECT.search(text):
                flags.append("ocr-suspect")
            gr = garble_ratio(text)
            if gr > 0.15:
                flags.append(f"ocr-garble:{gr:.2f}")
            records.append({
                "manual": "FM 21-11 (1976)",
                "chapter": num,
                "chapter_title": title,
                "section": sec_m.group(2).strip() if sec_m else "",
                "para": f"{p.group(1)}-{p.group(2)}",
                "lead": p.group(3).strip(),
                "text": text,
                "qa_flags": flags,
            })

    # Cross-reference artifacts: a bare "9-14." / "6-9." line is a wrapped inline
    # reference ("...described in paragraph 9-14."), not a heading. With the fixed
    # regex it now yields an empty-lead record; drop it and log the decision.
    dropped = []
    kept = []
    for r in records:
        if r["lead"] == "":
            dropped.append(r)
            print(f"DROPPED cross-ref artifact: chapter {r['chapter']} para {r['para']} "
                  f"(text: {r['text'][:60]!r})")
        else:
            kept.append(r)
    records = kept

    # Genuine repeated markers, resolved by TOC-range elimination (two-source: the
    # scan's own front-matter TOC). Corrections are logged on the record.
    RELABEL = {
        (4, "4-6", "Applying Digital Pressure"): ("4-8", "4-3—4-8"),
        (5, "5-6", "Keep the Soldier Comfortably Warm"): ("5-8", "5-1—5-8"),
        (6, "6-16", "Foot"): ("6-18", "6-9—6-18"),
    }
    for r in records:
        key = (r["chapter"], r["para"], r["lead"])
        if key in RELABEL:
            new_para, toc_range = RELABEL[key]
            old = r["para"]
            r["para"] = new_para
            r["qa_flags"].append(
                f"marker-corrected: raw repeated {old} for this heading; TOC range "
                f"'{toc_range}' plus sequence position verify {new_para}; original label {old}"
            )
            print(f"RELABELLED: ch{r['chapter']} {old} -> {new_para} ({r['lead']}) via TOC range {toc_range}")

    # OCR marker-loss honesty: when the para sequence jumps, the preceding record
    # may contain the content of paragraphs whose numbered headings the scan dropped.
    # Flag it; never invent numbers.
    def _n(p):
        return int(p.split("-")[1].split(".")[0].split(",")[0])

    for idx, r in enumerate(records):
        same = [x for x in records if x["chapter"] == r["chapter"]]
        i = same.index(r)
        if i + 1 < len(same):
            n_now, n_next = _n(r["para"]), _n(same[i + 1]["para"])
            if n_next <= n_now:
                r["qa_flags"].append(
                    f"duplicate-marker: raw repeated {r['chapter']}-{n_now}; sequence not resolvable from scan alone"
                )
            elif n_next > n_now + 1:
                r["qa_flags"].append(
                    f"ocr-marker-gap: paras {r['chapter']}-{n_now + 1} to {r['chapter']}-{n_next - 1} heading lost in scan; content absorbed here"
                )

    dups = {}
    for r in records:
        dups.setdefault((r["chapter"], r["para"]), []).append(r["lead"])
    for k, v in dups.items():
        if len(v) > 1:
            print(f"WARNING duplicate para still present: {k} -> {v}")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"source": os.path.basename(SRC), "records": records}, f, ensure_ascii=False, indent=1)

    flagged = sum(1 for r in records if r["qa_flags"])
    print(f"chapters: {len(chapters)} | records: {len(records)} | ocr-flagged: {flagged}")
    for p in problems:
        print("PROBLEM:", p)
    print("chapters:", [(c[0], c[2][:40]) for c in chapters])
    print("written:", OUT)

if __name__ == "__main__":
    main()
