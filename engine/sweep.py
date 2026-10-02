#!/usr/bin/env python3
"""TRU LIFELINE P3 — lane regression sweep over the built artifact.

Drives agent-browser eval against the live page: resolveAnswer(q) for each
golden query, captures verdict + reply text. Expectations from
references/LANES.md (golden-query tables are the regression sweep).

Run: python3 engine/sweep.py   (server on :8931 must be up; page open in agent-browser)
"""
import json, re, subprocess, sys, html, time

QUERIES = [
    # (query, expected verdict or None = informational)
    ("what is shock", "DEFINE"),
    ("what is a tourniquet", "DEFINE"),
    ("what is the pulse", "DEFINE"),
    ("snake bite", "DANGER"),
    ("snakebite", "DANGER"),
    ("snakebite treatment", "DANGER"),
    ("poisonous snakes", "DANGER"),
    ("puff adder", "DANGER"),
    ("how to open an airway", "PROCEDURE"),
    ("how to make an aboveground still", "TOPICFUZZY"),
    ("water procurement", "TOPICFUZZY"),
    ("read survival chapter 11", "READER"),
    ("read fm 21-11 chapter 9", "READER"),
    ("where am i", "READER"),
    ("next section", "READER"),
    ("45% of 100", "CALC"),
    ("what is 12 times 7", "CALC"),
    ("help", "STATE"),
    ("sources", "STATE"),
    ("who are you", "SELF"),
    ("what is this", "SELF"),
    ("how do i fix my car engine", "GAP"),
    ("capital of france", "GAP"),
    ("improvised stretcher", None),
    ("edible plants of the seashore", None),
    ("procedure: edible plants of the seashore", None),
    ("tell me about water", None),
    ("what is a tourniquet ", None),  # trailing-space robustness
]

def strip_html(s):
    s = re.sub(r"<[^>]+>", " ", s)
    return html.unescape(re.sub(r"\s+", " ", s)).strip()

def run():
    rows = []
    for q, exp in QUERIES:
        js = "JSON.stringify(resolveAnswer(" + json.dumps(q) + "))"
        out = subprocess.run(["agent-browser", "eval", js], capture_output=True, text=True, timeout=60)
        raw = out.stdout.strip()
        try:
            inner = json.loads(raw)
            res = json.loads(inner) if isinstance(inner, str) else inner
        except Exception:
            res = {}
        verdict = res.get("verdict", "?")
        reply = strip_html(res.get("reply", ""))[:110]
        src = res.get("source", "")
        ok = "" if exp is None else ("PASS" if verdict == exp else "FAIL")
        rows.append({"q": q, "verdict": verdict, "exp": exp, "ok": ok, "reply": reply, "source": src[:60]})
        print(f"[{ok or 'INFO':>4}] {verdict:<9} | {q:<42} | {reply}")
        time.sleep(0.15)
    fails = [r for r in rows if r["ok"] == "FAIL"]
    total = len(rows)
    print(f"\n{total} queries, {len(fails)} FAIL")
    return rows, fails

if __name__ == "__main__":
    rows, fails = run()
    with open("references/sweep-live.md", "w") as f:
        f.write("# Live lane sweep — " + time.strftime("%Y-%m-%d %H:%M UTC") + "\n\n")
        f.write("| ok | verdict | query | reply (first 110 chars) |\n|---|---|---|---|\n")
        for r in rows:
            f.write(f"| {r['ok'] or 'INFO'} | {r['verdict']} | {r['q']} | {r['reply']} |\n")
        if fails:
            f.write("\n## FAILURES\n\n")
            for r in fails:
                f.write(f"- `{r['q']}` → {r['verdict']} (expected {r['exp']}) — {r['reply']}\n")
    print("written: references/sweep-live.md")
    sys.exit(1 if fails else 0)
