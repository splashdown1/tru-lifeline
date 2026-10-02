#!/usr/bin/env python3
"""TRU LIFELINE P2 — segment FM 21-76 (1992 dump, pdftotext layer) into section records.

Source: source/raw/FM21-76_survival_pdf.txt (embedded text layer, far cleaner than djvu OCR).
Records are section-level (this manual has no n-m paragraph numbering).
Meaning-critical tokens NOT corrected; suspicious patterns flagged (qa_flags).
"""
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "source", "raw", "FM21-76_survival_pdf.txt")
OUT = os.path.join(ROOT, "data", "fm2176_1992.json")

CH_RE = re.compile(r"^CHAPTER\s+(\d{1,2})\s*-\s*(.+)$")
DOTS = re.compile(r"\.{4,}")
FOOT = re.compile(r"^Page \d+ of 233$")
HEADER_LINES = {"FM 21-76", "US ARMY SURVIVAL MANUAL",
                "Reprinted as permitted by U.S. Department of the Army",
                "Reprinted as NOT permitted by U.S. Department of the Army, but by we the citizenry who paid for it"}
JUNK = re.compile(r"\b[a-z]{1,3}J[a-z]{1,3}\b")

# garble detector against system dictionary (same doctrine as fm2111 extractor)
try:
    with open("/usr/share/dict/words", encoding="utf-8", errors="replace") as _f:
        DICT = {w.strip().lower() for w in _f if w.strip()}
except FileNotFoundError:
    DICT = set()

def garble_ratio(text):
    toks5 = re.findall(r"[A-Za-z']{5,}", text)
    if len(toks5) < 8:
        return 0.0
    return sum(1 for t in toks5 if t.lower() not in DICT) / len(toks5)
NONASCII = re.compile(r"[^\x00-\x7f]")


def is_heading(line):
    t = line.strip()
    if not t or DOTS.search(t) or FOOT.match(t) or t in HEADER_LINES:
        return False
    if len(t) > 72 or t.startswith(("•", "-", "—", "(")):
        return False
    if "(" in t or ")" in t:  # latin-name lists, figure refs — never headings
        return False
    words = re.findall(r"[A-Za-z']+", t)
    if not (1 <= len(words) <= 12):
        return False
    if any(len(w) < 2 for w in words):  # RICE single-letter list items
        return False
    caps = sum(1 for w in words if w[0].isupper())
    if t.isupper() and caps == len(words):
        return True
    # title-case heuristic: majority-capitalised, no sentence punctuation
    if caps >= max(2, int(len(words) * 0.6)) and not re.search(r"[.,;:!?]$", t):
        return True
    return False


def main():
    raw = open(SRC, encoding="utf-8", errors="replace").read()
    raw = raw.replace("\f", "\n")
    lines = [l.rstrip() for l in raw.split("\n")]
    # drop footers/headers and collapse blank runs
    body, keep = [], None
    for l in lines:
        t = l.strip()
        if FOOT.match(t) or t in HEADER_LINES or t == "":
            continue
        body.append(l)
    lines = body

    chapters = []
    for i, l in enumerate(lines):
        t = l.strip()
        m = CH_RE.match(t)
        if not m or DOTS.search(t):
            continue
        title = m.group(2).strip()
        # wrapped chapter title: join next line if it's ALL CAPS and no trailing dots
        if i + 1 < len(lines):
            nxt = lines[i + 1].strip()
            if nxt.isupper() and not DOTS.search(nxt) and len(nxt) < 60 and not CH_RE.match(nxt):
                title += " " + nxt
        chapters.append((int(m.group(1)), i, re.sub(r"\s+", " ", title).upper()))

    records = []
    for c_idx, (num, start, title) in enumerate(chapters):
        end = chapters[c_idx + 1][1] if c_idx + 1 < len(chapters) else len(lines)
        # collect headings inside the chapter (skip the chapter-heading line itself)
        heads = []
        i = start + 1
        while i < end:
            if is_heading(lines[i]):
                j, h = i + 1, [lines[i].strip()]
                while j < end and is_heading(lines[j]):
                    h.append(lines[j].strip())
                    j += 1
                # record the heading span (number of lines it occupies) so the
                # body slice starts after ALL heading lines, not just the first
                heads.append((i, " ".join(h), j - i))
                i = j
            else:
                i += 1
        if not heads:
            records.append({"chapter": num, "chapter_title": title, "section": "",
                            "lead": title, "text": ""})
            continue
        # chapter intro before first heading
        intro = " ".join(l.strip() for l in lines[start + 1:heads[0][0]]).strip()
        if intro:
            records.append({"chapter": num, "chapter_title": title, "section": "",
                            "lead": title.title(), "text": intro})
        for h_idx, (h_line, h_text, h_span) in enumerate(heads):
            hend = heads[h_idx + 1][0] if h_idx + 1 < len(heads) else end
            text = " ".join(l.strip() for l in lines[h_line + h_span:hend]).strip()
            text = re.sub(r"\s+", " ", text)
            flags = []
            if JUNK.search(text):
                flags.append("ocr-junk")
            gr = garble_ratio(text)
            if gr > 0.15:
                flags.append(f"ocr-garble:{gr:.2f}")
            na = len(NONASCII.findall(text))
            if na > max(5, len(text) * 0.005):
                flags.append(f"non-ascii:{na}")
            if len(text) < 40:
                flags.append("tiny")
            records.append({"chapter": num, "chapter_title": title, "section": h_text,
                            "lead": h_text.title(), "text": text, "qa_flags": flags})

    for r in records:
        r.setdefault("qa_flags", [])
        r.update({"manual": "FM 21-76 (1992 dump, 233pp)", "para": f"{r['chapter']}-s"})

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"source": os.path.basename(SRC), "records": records}, f, ensure_ascii=False, indent=1)

    flagged = sum(1 for r in records if r["qa_flags"])
    from collections import Counter
    print(f"chapters: {len(chapters)} | records: {len(records)} | flagged: {flagged}")
    print("per chapter:", sorted(Counter(r["chapter"] for r in records).items()))
    sizes = sorted(len(r["text"]) for r in records)
    print("text sizes: min", sizes[0], "median", sizes[len(sizes)//2], "max", sizes[-1])
    print("written:", OUT)


if __name__ == "__main__":
    main()
