#!/usr/bin/env python3
"""TRU LIFELINE P5a — extract FM 21-76 Appendices B (edible/medicinal plants)
and C (poisonous plants) into records.

Source PDFs: source/raw/fm2176-appendix/appb.pdf, appc.pdf (equipped.org copies
of the same 1992-edition FM 21-76 as data/fm2176_1992.json — appendix-C species
cross-referenced verbatim in chapter 10 of the dump). US Gov public domain.

Doctrine:
- Verbatim text only. OCR slips that touch identification-critical tokens
  (Latin names) are qa_flagged, never silently corrected.
- Each entry carries its own appendix provenance (B-n / C-n page markers).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

MANUAL = "FM 21-76 (1992) · APPENDIX"

# known-garbled Latin tokens in the scan → flag entries carrying them
LATIN_SUSPECT = re.compile(r"\b(diversibba|pruritum)\b")


def load_txt(stem):
    with open(os.path.join(ROOT, "source/raw/fm2176-appendix", stem + ".txt"),
              encoding="utf-8") as f:
        return f.read()


def split_entries(txt, prefix):
    # page footers FOLLOW their page: text between marker N-1 and marker N
    # is printed on page N. A missing footer (OCR loss) shifts the sequence;
    # such entries get their inferred page + a qa_flag, never a silent fix.
    # OCR digit-one garble in footers (B-8l for B-81) is recovered the same way
    # as the documented comma-marker fix (12-12, -> 12-12): trailing l/I on an
    # otherwise valid footer is a page number, never prose. Recovered entries
    # carry an ocr-page-footer-garbled flag.
    txt = re.sub(r"^%s-(\d+)[lI]\s*$" % prefix, r"%s-\g<1>1 " % prefix, txt, flags=re.M)
    parts = re.split(r"^%s-(\d+)\s*$" % prefix, txt, flags=re.M)
    # parts: [pre, n0, body0, n1, body1, ...] — body_i sits between n_i and n_{i+1}
    out = []
    for i in range(1, len(parts) - 2, 2):
        n_prev, body, n_next = int(parts[i]), parts[i + 1], int(parts[i + 2])
        if n_next - n_prev == 1:
            out.append((prefix + "-" + str(n_next), body, []))
        else:
            out.append((prefix + "-" + str(n_prev + 1), body,
                        ["ocr-page-footer-missing"]))
    return out


FIELDS = ["Description", "Habitat and Distribution", "Edible Parts",
          "CAUTION", "Other Uses"]


def parse_entry(body):
    # header lines: everything before the first field label
    m_first = re.search(r"^(" + "|".join(FIELDS) + r"):\s*", body, re.M)
    if not m_first:
        return None
    head = [l.strip() for l in body[: m_first.start()].split("\n") if l.strip()]
    fields = {}
    for m in re.finditer(r"^(" + "|".join(FIELDS) + r"):\s*", body, re.M):
        nxt = re.search(r"^(" + "|".join(FIELDS) + r"):\s*", body[m.end():], re.M)
        end = m.end() + nxt.start() if nxt else len(body)
        fields[m.group(1)] = " ".join(body[m.end():end].split())
    return head, fields


def extract(prefix, stem, kind):
    txt = load_txt(stem)
    # drop the intro (before the first marker)
    pre_end = re.search(r"^%s-0\s*$" % prefix, txt, re.M)
    intro = txt[: pre_end.start()].strip() if pre_end else ""
    records = []
    for marker, body, gap_flags in split_entries(txt, prefix):
        parsed = parse_entry(body)
        if not parsed:
            continue
        head, fields = parsed
        # head = [common names, latin, (family)?] — detect family by "(...)"
        family = ""
        latin = ""
        if len(head) >= 3 and re.search(r"\(.*\)", head[-1]):
            family = head.pop()
        if len(head) >= 2:
            latin = head[1]
        flags = list(gap_flags)
        if LATIN_SUSPECT.search(latin):
            flags.append("ocr-latin-suspect")
        if LATIN_SUSPECT.search(fields.get("Description", "")):
            if "ocr-latin-suspect" not in flags:
                flags.append("ocr-latin-suspect")
        rec = {
            "manual": MANUAL + (" B" if prefix == "B" else " C"),
            "appendix": prefix,
            "page": marker,
            "name": head[0] if head else "",
            "latin": latin,
            "family": family,
            "kind": kind,
            "fields": fields,
            "intro": "" if not records else "",
            "qa_flags": flags,
        }
        records.append(rec)
    return intro, records


def main():
    intro_b, plants = extract("B", "appb", "edible-medicinal")
    intro_c, poisons = extract("C", "appc", "poisonous-plant")
    out = {
        "source": "FM 21-76 (1992 ed.) Appendices B & C — equipped.org PDF copies of US Gov public-domain manual; same edition as data/fm2176_1992.json",
        "intros": {"B": intro_b, "C": intro_c},
        "records": plants + poisons,
    }
    dst = os.path.join(ROOT, "data", "fm2176_appendices.json")
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    lat = sum(1 for r in out["records"] if r["qa_flags"])
    print("plants:", len(plants), "| poisonous:", len(poisons),
          "| qa_flagged:", lat)
    print("written:", dst)
    chaps = {}
    for r in plants + poisons:
        chaps[r["appendix"]] = chaps.get(r["appendix"], 0) + 1
    print("by appendix:", chaps)
    last = out["records"][-1]
    print("last record:", last["page"], last["name"], last["latin"])


if __name__ == "__main__":
    main()
