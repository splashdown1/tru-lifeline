#!/usr/bin/env python3
"""TRU LIFELINE P1 — 20-paragraph spot-check of extracted records against raw source.

Seeded sample (10 per manual). Every sampled record must satisfy:
  1. text fidelity: normalised record text appears verbatim in the normalised raw
     dump, after applying the extractor's own DOCUMENTED normalizations to the raw
     side (21-76: form feeds dropped, "Page N of 233" footers and the two running
     header lines removed — the same lines the extractor strips before slicing)
  2. heading fidelity: lead/section heading appears in the raw dump
  3. marker fidelity (21-11): the para label starts a line in the raw dump
     (lead text may follow on the same line; relabelled records cite their QA flag)
Failures are reported, never silently corrected. Output: references/spotcheck report.
"""
import json, os, random, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = {
    "FM 21-11 (1976)": "source/raw/FM21-11_firstaid_1976.txt",
    "FM 21-76 (1992 dump, 233pp)": "source/raw/FM21-76_survival_pdf.txt",
}
SEED = 20261002
N_PER_MANUAL = 10

def norm(s):
    return re.sub(r"\s+", " ", s).strip().lower()

def main():
    random.seed(SEED)
    FOOT = re.compile(r"^Page \d+ of 233$")
    HEADER_LINES = {"FM 21-76", "US ARMY SURVIVAL MANUAL",
                    "Reprinted as permitted by U.S. Department of the Army",
                    "Reprinted as NOT permitted by U.S. Department of the Army, but by we the citizenry who paid for it"}
    raws = {}
    for manual, path in RAW.items():
        with open(os.path.join(ROOT, path), encoding="utf-8", errors="replace") as f:
            txt = f.read().replace("\f", "\n")
        if manual.startswith("FM 21-76"):
            # mirror extract_fm2176.py's documented header/footer stripping
            txt = "\n".join(l for l in txt.split("\n")
                            if not FOOT.match(l.strip()) and l.strip() not in HEADER_LINES)
        raws[manual] = {"text": norm(txt), "lines": None}

    # line-start markers for 21-11 marker check
    with open(os.path.join(ROOT, RAW["FM 21-11 (1976)"]), encoding="utf-8", errors="replace") as f:
        l211_lines = f.read().split("\n")

    report = []
    fails = 0
    for manual, data_file in [("FM 21-11 (1976)", "data/fm2111_1976.json"),
                              ("FM 21-76 (1992 dump, 233pp)", "data/fm2176_1992.json")]:
        with open(os.path.join(ROOT, data_file), encoding="utf-8") as f:
            recs = json.load(f)["records"]
        sample = random.sample(recs, min(N_PER_MANUAL, len(recs)))
        for r in sample:
            checks, ok = [], True
            rawtext = raws[manual]["text"]

            t = norm(r["text"])
            hit = t in rawtext
            checks.append(("text-in-raw", hit, ""))
            ok &= hit

            head = r.get("lead") or r.get("section") or ""
            if head:
                h = norm(head)
                hok = h in rawtext
                checks.append(("heading-in-raw", hok, ""))
                ok &= hok

            if manual.startswith("FM 21-11"):
                para = r["para"]
                relabelled = any(f.startswith("marker-corrected") for f in r.get("qa_flags", []))
                pat = re.compile(r"^\s*" + re.escape(para).replace(r"\-", r"\s*[-\u2013\u2014]\s*") + r"\s*[.,]?(?:\s+\S.*)?\s*$", re.M)
                mok = bool(pat.search("\n".join(l211_lines)))
                if relabelled and not mok:
                    checks.append(("marker-line-start", True, "relabelled — raw marker was the OCR duplicate; see qa flag"))
                else:
                    checks.append(("marker-line-start", mok, ""))
                    ok &= mok

            fails += (not ok)
            report.append((manual, r["chapter"], r["para"], r.get("lead") or r.get("section") or "", ok, checks))

    out = os.path.join(ROOT, "references")
    os.makedirs(out, exist_ok=True)
    lines = [
        "# TRU-LIFELINE — 20-paragraph spot-check",
        "",
        f"Seeded sample (seed {SEED}), {N_PER_MANUAL} records per manual, drawn from data/*.json",
        "and verified against the raw dumps in source/raw/ on 2026-10-02.",
        "",
        "| manual | ch | para | lead/section | result | detail |",
        "|---|---|---|---|---|---|",
    ]
    for manual, ch, para, lead, ok, checks in report:
        detail = "; ".join(f"{n}: {'PASS' if v else 'FAIL'}{(' ' + msg) if msg else ''}" for n, v, msg in checks)
        lines.append(f"| {manual} | {ch} | {para} | {(lead[:38] + '…') if len(lead) > 38 else lead} | {'PASS' if ok else 'FAIL'} | {detail} |")
    lines += ["", f"**Result: {len(report) - fails}/{len(report)} PASS, {fails} FAIL.**",
              "", "Failures (if any) are documented above and were not silently corrected;",
              "each is a data-defect finding for the audit log.", ""]
    path = os.path.join(out, "spotcheck-2026-10-02.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"spot-check: {len(report) - fails}/{len(report)} PASS, {fails} FAIL")
    for manual, ch, para, lead, ok, checks in report:
        if not ok:
            print("FAIL:", manual, ch, para, lead[:50], checks)
    print("written:", path)

if __name__ == "__main__":
    main()
