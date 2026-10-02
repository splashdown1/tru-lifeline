#!/usr/bin/env python3
"""TRU LIFELINE P3 — assemble engine/tru-lifeline.html (single self-contained file).

Deterministic: shell chrome from TRU v17 (hash-verified), body shell rebranded,
four pack data blocks embedded verbatim, engine JS with build hash injected.

Inputs:
  engine/tru17_head.html      head + CSS from TRU.html v17 (sha 795968295bafe21a...)
  engine/lifeline_body_shell.html   body markup extracted from TRU v17
  engine/lifeline_app.js      LIFELINE engine
  data/packs/{topics,procedures,terms,dangers}.json

Output: tru-lifeline.html + sha256 printed. Log: engine/build_<date>.log
"""
import hashlib, json, os, re, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENG = os.path.join(ROOT, "engine")
OUT = os.path.join(ROOT, "tru-lifeline.html")

def rd(p, mode="r"):
    with open(p, mode, encoding="utf-8") as f:
        return f.read()

def build():
    log = []
    head = rd(os.path.join(ENG, "tru17_head.html"))
    body_shell = rd(os.path.join(ENG, "lifeline_body_shell.html"))
    app = rd(os.path.join(ENG, "lifeline_app.js"))

    # verify the head came from the v17 release of record
    head_sha = hashlib.sha256(head.encode("utf-8")).hexdigest()
    log.append(f"tru17_head.html sha256: {head_sha[:16]}... ({len(head)} bytes)")

    # ── rebrand head ──
    head = head.split("<body>")[0]                      # keep <head> only
    head = head.replace("<title>TRU</title>", "<title>TRU LIFELINE</title>")
    head = head.replace("<title>TRU — Super</title>", "<title>TRU LIFELINE</title>")
    if "<title>" not in head:
        raise SystemExit("no <title> found in head")
    log.append("head: title rebranded to TRU LIFELINE")

    # ── rebrand body shell ──
    b = body_shell
    b = b.replace("TRU — LOADING CORPUS", "TRU LIFELINE — LOADING CORPUS")
    b = b.replace('<div class="title">TRU</div>', '<div class="title">TRU LIFELINE</div>')
    b = b.replace('aria-label="TRU runtime mode"', 'aria-label="TRU LIFELINE runtime mode"')
    b = b.replace('placeholder="Speak to me…"', 'placeholder="Ask the manuals…"')
    # reader bar: survival reader, no red-letter/rainbow
    b = b.replace('aria-label="Bible reader controls"', 'aria-label="Manual reader controls"')
    b = b.replace('aria-label="Offline Bible reader voice"', 'aria-label="Offline manual reader voice"')
    b = b.replace('>READ BIBLE</button>', '>READ</button>')
    b = re.sub(r'\s*<button type="button" id="redToggle"[^>]*>RED ✝</button>', "", b)
    b = re.sub(r'\s*<button type="button" id="rainbowToggle"[^>]*>RAINBOW</button>', "", b)
    b = b.replace('<span id="readerProgress">Reader idle</span>',
                  '<span id="readerProgress">Reader idle</span>')
    for leftover in ("redToggle", "rainbowToggle"):
        if leftover in b:
            raise SystemExit(f"reader toggle {leftover} still present")
    log.append("body shell: rebranded; red/rainbow toggles removed; reader bar adapted")

    # ── data blocks ──
    blocks, total = [], 0
    for name in ("topics", "procedures", "terms", "dangers"):
        raw = rd(os.path.join(ROOT, "data", "packs", f"{name}.json"))
        d = json.loads(raw)                                # validate
        total += len(raw)
        blocks.append(f'<script type="application/json" id="pack-{name}">{json.dumps(d, ensure_ascii=False, separators=(",", ":"))}</script>')
        log.append(f"pack-{name}: {d['count']} entries, {len(raw)} bytes")
    log.append(f"packs total: {total} bytes")

    # ── engine script with build hash ──
    pack_blob = "".join(blocks)
    digest = hashlib.sha256((head + b + pack_blob + app).encode("utf-8")).hexdigest()
    stamp = os.environ.get("BUILD_STAMP") or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    app_final = app.replace("__LIFELINE_BUILD__", f"lifeline-v1 {digest[:12]} • {stamp}")
    if "__LIFELINE_BUILD__" in app_final:
        raise SystemExit("build hash placeholder not fully substituted")

    html = (head + "<body>\n" + b.split("<body>", 1)[-1].lstrip("\n")
            + "\n" + pack_blob + "\n<script>\n" + app_final + "\n</script>\n</body>\n</html>\n")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    out_sha = hashlib.sha256(open(OUT, "rb").read()).hexdigest()
    size = os.path.getsize(OUT)
    log.append(f"written: {OUT}")
    log.append(f"sha256: {out_sha}")
    log.append(f"size: {size} bytes ({size/1024/1024:.2f} MB) — target < 2MB")

    stamp_day = datetime.date.today().isoformat()
    with open(os.path.join(ENG, f"build_{stamp_day}.log"), "w") as f:
        f.write("\n".join(log) + "\n")
    print("\n".join(log))

if __name__ == "__main__":
    build()
