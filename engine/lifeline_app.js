// ─────────────────────────────────────────────────────────────────────────────
// TRU LIFELINE engine v1 (P3) — adapted from the TRU v17 shell doctrine.
// Source-bound survival + first-aid engine. Zero network. Never generates.
// Route law (references/LANES.md):
//   STATE → READER → CALC → DEFINE → DANGER → PROCEDURE → TOPIC → TOPIC-FUZZY → GAP
// Every card quotes its source paragraph verbatim with provenance.
// ─────────────────────────────────────────────────────────────────────────────
"use strict";

const __BUILD__ = "__LIFELINE_BUILD__";

// ── data access ──
const $ = id => document.getElementById(id);
function getPack(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  try { return JSON.parse(el.textContent); } catch (e) { console.error("pack parse", id, e); return null; }
}
let _TOPICS = null, _PROCS = null, _TERMS = null, _DANGERS = null;
function getTopics()   { if (!_TOPICS)  _TOPICS  = (getPack("pack-topics")     || { entries: [] }).entries; return _TOPICS; }
function getProcs()    { if (!_PROCS)   _PROCS   = (getPack("pack-procedures") || { entries: [] }).entries; return _PROCS; }
function getTerms()    { if (!_TERMS)   _TERMS   = (getPack("pack-terms")      || { entries: [] }).entries; return _TERMS; }
function getDangers()  { if (!_DANGERS) _DANGERS = (getPack("pack-dangers")    || { entries: [] }).entries; return _DANGERS; }

const MANUALS = ["FM 21-11", "FM 21-76"];
function manualOf(e)  { return e.manual && e.manual.indexOf("FM 21-11") === 0 ? 0 : 1; }
function manualName(m){ return m === 0 ? "FM 21-11 · FIRST AID (1976)" : "FM 21-76 · SURVIVAL (1992)"; }

// ── text helpers ──
function esc(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function norm(s){
  return String(s == null ? "" : s).toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ").trim();
}
const STOP = new Set(("a an the is are was were be been being of in on at to for with and or but if what whats how " +
  "do does did i my me you your it its this that these those there much many per can should would will shall may " +
  "from by as about into than then when where who why which find finding found make making made get getting got need " +
  "want tell show give some any very more most best good using use used way ways").split(" "));
function stem(w){
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("sses")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("es") && !/[sxz]es$/.test(w)) return w.slice(0, -1);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  if (w.length > 3 && w.endsWith("e")) return w.slice(0, -1);
  return w;
}
function contentWords(s){
  const out = [];
  for (const t of norm(s).split(" ")) if (t && !STOP.has(t)) out.push(stem(t));
  return out;
}
function hasAll(hayCW, needles){ return needles.every(n => hayCW.indexOf(n) >= 0); }

// ── verdict palette ──
const VERDICT = { STATE:"#00e5ff", READER:"#69f0ae", CALC:"#00e5ff", DEFINE:"#ffd54f", DANGER:"#ff5a5a",
  PROCEDURE:"#00e5ff", TOPIC:"#00e5ff", TOPICFUZZY:"#00e5ff", GAP:"#ff5a5a", SELF:"#00e5ff" };
const VNAME = { STATE:"STATE", READER:"READER", CALC:"CALC", DEFINE:"DEFINE", DANGER:"DANGER",
  PROCEDURE:"PROCEDURE", TOPIC:"TOPIC", TOPICFUZZY:"TOPIC", GAP:"GAP", SELF:"TRU LIFELINE" };

// ── QA flag annotation (honesty: surface scan quality on the card) ──
function flagNote(flags){
  if (!flags || !flags.length) return "";
  const kinds = flags.map(f => String(f).split(":")[0]);
  return ' <span style="color:#e0b34d">[\u26a0 scan: ' + esc(kinds.join(", ")) + ']</span>';
}

// ── source reference line ──
function refLine(e){
  const m = manualName(manualOf(e));
  if (manualOf(e) === 0) {
    let p = e.para || "";
    return m + " \u00b7 CH " + e.chapter + (e.chapter_title ? " \u00b7 " + e.chapter_title : "") +
      (p ? " \u00b7 \u00b6 " + p : "") + (e.section ? " \u00b7 " + e.section : "");
  }
  return m + " \u00b7 CH " + e.chapter + (e.chapter_title ? " \u00b7 " + e.chapter_title : "") +
    (e.section ? " \u00b7 " + e.section : (e.title ? " \u00b7 " + e.title : ""));
}

// ═══════════════════════════════ STATE lane ═══════════════════════════════
const SOURCES_HTML =
  '<div class="ll-h">SOURCES \u2014 verified public domain</div>' +
  '<div class="enc-para">\u2022 <b>FM 21-76 Survival</b> (Dept. of the Army, 1970 text; 23 chapters). US Gov work \u2014 public domain. Archive.org item marked publicdomain.</div>' +
  '<div class="enc-para">\u2022 <b>FM 21-11 First Aid for Soldiers</b> (Dept. of the Army, June 1976). US Gov work \u2014 public domain.</div>' +
  '<div class="enc-para">\u2022 <b>FM 21-11 First Aid (1943)</b> kept as secondary/contrast source \u2014 not wired in v1.</div>' +
  '<div class="enc-para" style="color:#e0b34d">\u2022 The 1992 Barnes &amp; Noble / Platinum Press reprint of FM 21-76 is REJECTED (added \u00a9 material). Never used in this build.</div>' +
  '<div class="ll-ref">Text is quoted as scanned. OCR noise is flagged, never silently corrected. Provenance: source/PROVENANCE.md (offline copy in the portal).</div>';

const HELP_HTML =
  '<div class="ll-h">COMMANDS</div>' +
  '<div class="enc-para">\u2022 Ask about a subject: <span class="tru-ref" data-q="water procurement" style="cursor:pointer">water procurement</span>, <span class="tru-ref" data-q="solar still" style="cursor:pointer">solar still</span>, <span class="tru-ref" data-q="splint fractures" style="cursor:pointer">splint fractures</span></div>' +
  '<div class="enc-para">\u2022 Procedures: <span class="tru-ref" data-q="how to open an airway" style="cursor:pointer">how to open an airway</span>, <span class="tru-ref" data-q="how to make a belowground still" style="cursor:pointer">how to make a belowground still</span></div>' +
  '<div class="enc-para">\u2022 Dangers: <span class="tru-ref" data-q="puff adder" style="cursor:pointer">puff adder</span>, <span class="tru-ref" data-q="poisonous snakes" style="cursor:pointer">poisonous snakes</span>, <span class="tru-ref" data-q="snake bite" style="cursor:pointer">snake bite</span></div>' +
  '<div class="enc-para">\u2022 Definitions: <span class="tru-ref" data-q="what is the pulse" style="cursor:pointer">what is the pulse</span></div>' +
  '<div class="enc-para">\u2022 Reader: <span class="tru-ref" data-q="read survival chapter 11" style="cursor:pointer">read survival chapter 11</span>, <span class="tru-ref" data-q="read fm 21-11 chapter 9" style="cursor:pointer">read fm 21-11 chapter 9</span>, then <span class="tru-ref" data-q="next section" style="cursor:pointer">next section</span> / <span class="tru-ref" data-q="pause" style="cursor:pointer">pause</span> / <span class="tru-ref" data-q="where am i" style="cursor:pointer">where am i</span></div>' +
  '<div class="enc-para">\u2022 Pure arithmetic works ("45% of 100"). Medical numbers are never computed \u2014 they come from the manuals or not at all.</div>' +
  '<div class="enc-para" style="color:#9ed7ff">Every answer quotes its source paragraph. When nothing in the manuals covers a question, I say so \u2014 I never invent advice.</div>';

const POSTURE =
  "TRU LIFELINE \u2014 an offline survival and first-aid engine. Every answer quotes the U.S. Army field " +
  "manuals carried inside this file (FM 21-76 Survival, FM 21-11 First Aid). No network, no accounts, no telemetry. " +
  "I never generate advice: when the manuals do not cover something, I say so and point to the nearest covered section. " +
  "When the network is gone, the knowledge that keeps a body alive is already in this file.";

function stateLane(raw){
  const low = norm(raw);
  if (/^(help|commands|menu)$/.test(low)) return { reply: HELP_HTML, verdict: "STATE", source: "local \u2022 no retrieval", html: true };
  if (/^(about|portal)$/.test(low)) return { reply: "", verdict: "STATE", source: "local \u2022 no retrieval", portal_action: true };
  if (/^(sources|source list|provenance|licen[cs]e)$/.test(low)) return { reply: SOURCES_HTML, verdict: "STATE", source: "source/PROVENANCE.md \u2022 local", html: true };
  if (/^(what is this|what is tru lifeline|who are you)$/.test(low)) {
    return { reply: esc(POSTURE), verdict: "SELF", source: "posture \u2022 first boot statement" };
  }
  return null;
}

// ═══════════════════════════════ CALC lane ═══════════════════════════════
const NUMWORDS = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
  eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18,
  nineteen:19, twenty:20, thirty:30, forty:40, fourty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
const SCALEWORDS = { hundred:100, thousand:1000, million:1000000 };
function wordsToExpr(s){
  const toks = s.replace(/,/g, " ").split(/\s+/).filter(Boolean);
  let out = "", cur = 0, have = false;
  const flush = () => { if (have) { out += cur; cur = 0; have = false; } };
  for (const t of toks) {
    if (/^[-+*/().]+$/.test(t)) { flush(); out += t; continue; }
    if (/^\d+(\.\d+)?$/.test(t)) { flush(); out += t; continue; }
    if (t in NUMWORDS) { cur += NUMWORDS[t]; have = true; continue; }
    if (t in SCALEWORDS) { cur = (cur || 1) * SCALEWORDS[t]; have = true; continue; }
    if (t === "and") continue;
    if (t === "plus" || t === "add" || t === "added") { flush(); out += "+"; continue; }
    if (t === "minus" || t === "subtract" || t === "less") { flush(); out += "-"; continue; }
    if (t === "times" || t === "multiply" || t === "multiplied") { flush(); out += "*"; continue; }
    if (t === "divided" || t === "divide") { flush(); out += "/"; continue; }
    if (t === "over") { flush(); out += "/"; continue; }
    if (t === "x") { flush(); out += "*"; continue; }
    if (t === "by") continue;
    return null;
  }
  flush();
  return out;
}
function evalCalc(expr){
  expr = expr.replace(/\s+/g, "");
  if (!/^[-+*/().\d]+$/.test(expr)) return null;
  if (!/\d/.test(expr) || !/[-+*/]/.test(expr)) return null;
  let val;
  try {
    const tokens = expr.match(/\d+(?:\.\d+)?|[()+\-*/]/g) || [];
    const values = [], ops = [], precedence = { "+":1, "-":1, "*":2, "/":2 };
    const apply = () => { const op = ops.pop(); const b = values.pop(); const a = values.pop();
      if (op === "/" && b === 0) throw new Error("division by zero");
      values.push(op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : a / b); };
    for (const token of tokens) {
      if (/^\d/.test(token)) values.push(Number(token));
      else if (token === "(") ops.push(token);
      else if (token === ")") { while (ops.length && ops.at(-1) !== "(") apply(); if (ops.pop() !== "(") throw new Error("unbalanced"); }
      else { while (ops.length && ops.at(-1) !== "(" && precedence[ops.at(-1)] >= precedence[token]) apply(); ops.push(token); }
    }
    while (ops.length) { if (ops.at(-1) === "(") throw new Error("unbalanced"); apply(); }
    if (values.length !== 1) throw new Error("invalid expression");
    val = values[0];
  } catch (e) { return { reply: "i could not evaluate that expression.", verdict: "CALC" }; }
  if (typeof val !== "number" || !isFinite(val)) return { reply: "that expression has no finite numeric result.", verdict: "CALC" };
  const pretty = Number.isInteger(val) ? String(val) : String(Math.round(val * 1e10) / 1e10);
  return { reply: expr.replace(/\*/g, "\u00d7").replace(/\//g, "\u00f7") + " = " + pretty, verdict: "CALC" };
}
function calcQuery(q){
  let s = String(q).toLowerCase().replace(/\u00d7/g, "*").replace(/\u00f7/g, "/").replace(/[\u00b7\u2022]/g, "*").replace(/[?!]+$/g, "").trim();
  s = s.replace(/^(calculate|compute|what is|what's|whats|how much is|what does|the answer to)\s+/i, "").trim();
  s = s.replace(/\s*equals?$/i, "").trim();
  if (!s) return null;
  // medical-number guard: never compute on medical phrasing
  if (/\b(dose|dosage|mg|ml|cc|units?|drop|drops|pill|tablet|ratio|minutes?|hours?|days?|beats?|bpm|temperature|fever|degrees?)\b/.test(s)) return null;
  const pct = s.match(/^(\d+(?:\.\d+)?)\s+percent\s+of\s+(\d+(?:\.\d+)?)$/i);
  if (pct) { const val = parseFloat(pct[1]) * parseFloat(pct[2]) / 100; return { reply: pct[1] + "% of " + pct[2] + " = " + (Number.isInteger(val) ? String(val) : String(val)), verdict: "CALC" }; }
  const power = s.match(/^(\d+(?:\.\d+)?)\s+(?:to the power of|raised to)\s+(\d+(?:\.\d+)?)$/i);
  if (power) { const val = Math.pow(parseFloat(power[1]), parseFloat(power[2])); return { reply: power[1] + "^" + power[2] + " = " + (Number.isInteger(val) ? String(val) : String(val)), verdict: "CALC" }; }
  const sm = s.match(/^(?:square\s+root\s+of\s+|sqrt\s+|\u221a\s*)([\d.]+)$/i);
  if (sm) { const n = parseFloat(sm[1]); const val = Math.sqrt(n); if (!isFinite(val)) return { reply: "that has no finite result.", verdict: "CALC" };
    const pretty = Number.isInteger(val) ? String(val) : String(Math.round(val * 1e10) / 1e10);
    return { reply: "\u221a" + sm[1] + " = " + pretty, verdict: "CALC" }; }
  const pm = s.match(/^([\d.]+)\s*%\s*of\s*([\d.]+)$/i);
  if (pm) { const a = parseFloat(pm[1]), b = parseFloat(pm[2]); const val = Math.round(a * b / 100 * 1e10) / 1e10;
    return { reply: pm[1] + "% of " + pm[2] + " = " + val, verdict: "CALC" }; }
  if (/^[-+*/().\d\s]+$/.test(s) && /\d/.test(s) && /[-+*/]/.test(s)) return evalCalc(s);
  const e = wordsToExpr(s);
  if (e && /^[-+*/().\d\s]+$/.test(e) && /\d/.test(e) && /[-+*/]/.test(e)) return evalCalc(e);
  return null;
}

// ═══════════════════════════════ DEFINE lane ═══════════════════════════════
const DEF_TRIGGER = /^(?:what\s+is|what\s+are|what's|whats|define|definition\s+of|meaning\s+of)\s+(.+?)[?!.]*$/i;
function defineQuery(raw){
  const m = DEF_TRIGGER.exec(String(raw).trim());
  if (!m) return null;
  const subject = norm(m[1]);
  const subjCW = contentWords(subject);
  if (!subjCW.length) return null;
  // match: subject words must appear in the sentence's definitional OBJECT part
  // (text after the is/are called/known as/defined as marker) — or the entry
  // carries a clean subject term equal to the query subject.
  const hits = [];
  for (const e of getTerms()) {
    let fired = false;
    const termCW = e.term ? contentWords(e.term) : [];
    if (termCW.length && termCW.length === subjCW.length && termCW.every(w => subjCW.indexOf(w) >= 0)) fired = true;
    if (!fired && termCW.length === 1 && subjCW.indexOf(termCW[0]) >= 0) fired = true;
    if (!fired) {
      const mm = /(is|are)\s+(defined\s+as|known\s+as|called|referred\s+to\s+as)/i.exec(e.sentence || "");
      const objectPart = mm ? e.sentence.slice(mm.index + mm[0].length) : "";
      if (objectPart) {
        const objCW = contentWords(objectPart);
        if (hasAll(objCW, subjCW)) fired = true;
      }
    }
    if (fired) hits.push(e);
  }
  if (!hits.length) return null;
  hits.sort((a, b) => norm(a.sentence).split(" ").length - norm(b.sentence).split(" ").length);
  const e = hits[0];
  const mIdx = manualOf(e);
  const chip = { label: "read the section", query: mIdx === 0 ? "read para " + e.para : "read section " + (e.section || e.title) };
  return {
    reply: '<div class="ll-h">DEFINED \u2022 ' + esc(subject) + "</div>" +
      '<div class="ll-quote">\u201c' + esc(e.sentence) + "\u201d" + flagNote(e.qa_flags) + "</div>",
    verdict: "DEFINE", source: refLine(e) + " \u2022 verbatim", chip,
  };
}

// ═══════════════════════════════ DANGER lane ═══════════════════════════════
let _DANGER_IX = null;
function dangerIndex(){
  if (_DANGER_IX) return _DANGER_IX;
  _DANGER_IX = [];
  for (const e of getDangers()) {
    const keys = new Set([norm(e.name)]);
    const bare = norm(String(e.name).replace(/\([^)]*\)/g, ""));
    if (bare) keys.add(bare);
    if (e.kind === "treatment") {
      // mechanical conjunction-split + singularisation of the title
      const parts = norm(e.name).split(" and ").filter(Boolean);
      for (const p of parts) {
        const cw = contentWords(p);
        if (cw.length) keys.add(cw.join(" "));
      }
    }
    const cwSet = new Set();
    for (const k of keys) for (const w of contentWords(k)) cwSet.add(w);
    _DANGER_IX.push({ e, keys: [...keys], cw: [...cwSet] });
  }
  return _DANGER_IX;
}
let _DANGER_VOCAB = null;
function dangerVocab(){
  if (_DANGER_VOCAB) return _DANGER_VOCAB;
  _DANGER_VOCAB = new Set();
  for (const d of dangerIndex()) for (const w of d.cw) _DANGER_VOCAB.add(w);
  return _DANGER_VOCAB;
}
function dangerQuery(raw){

  const low = norm(raw);
  if (!low) return null;
  const qCW = contentWords(low);
  if (!qCW.length) return null;
  const idx = dangerIndex();
  // de-compound single tokens against the danger vocabulary ("snakebite" -> "snake" + "bite")
  const _DCV = dangerVocab();
  for (let qi = 0; qi < qCW.length; qi++) {
    const t = qCW[qi];
    if (t.length > 6 && !_DCV.has(t)) {
      for (let i = 3; i < t.length - 2; i++) {
        if (_DCV.has(t.slice(0, i)) && _DCV.has(t.slice(i))) { qCW.splice(qi, 1, t.slice(0, i), t.slice(i)); break; }
      }
    }
  }
  // exact key
  let exact = idx.filter(d => d.keys.indexOf(low) >= 0);
  if (exact.length === 1) return dangerCard(exact[0].e);
  if (exact.length > 1) return null; // ambiguous — fall through, never guess
  // compound de-split (data-derived): "snakebite" → snake + bite, both in title vocabulary
  if (qCW.length === 1) {
    const vocab = new Set();
    for (const d of idx) for (const w of d.cw) vocab.add(w);
    for (let i = 2; i <= qCW[0].length - 2; i++) {
      const a = qCW[0].slice(0, i), b = qCW[0].slice(i);
      if (vocab.has(a) && vocab.has(b)) { qCW.push(b); qCW[0] = a; break; }
    }
  }
  // scored matching (shared: full coverage wins; partial must be strictly best)
  const pick = pickScored(idx, qCW, d => d.cw);
  if (pick) return dangerCard(pick.e, pick.others);
  return null;
}
function dangerCard(e, others){
  const t = getTopics().find(x => x.id === e.topic_id);
  const body = e.kind === "species"
    ? '<div class="ll-quote"><b>' + esc(e.name) + "</b> \u2014 " + esc(e.region || "") + "</div>" +
      (t ? '<div class="ll-quote">\u201c' + esc(t.text.slice(0, 1200)) + (t.text.length > 1200 ? "\u2026" : "") + '\u201d' + flagNote(t.qa_flags) + "</div>" : "")
    : (t ? '<div class="ll-quote">\u201c' + esc(t.text) + "\u201d" + flagNote(t.qa_flags) + "</div>" : "");
  let chip = siblingChip(e);
  if (e.kind === "species" && /snake|spider|scorpion/i.test(e.name) && !chip) {
    chip = { label: "Snake and Spider Bites and Scorpion Stings", query: "snake bite" };
  }
  if (!chip && others && others.length) {
    const o = others[0].e || others[0];
    chip = { label: String(o.name || o.title || ""), query: norm(String(o.name || o.title || "")) };
  }
  return {
    reply: '<div class="ll-h">' + (e.kind === "species" ? "SPECIES" : e.kind === "treatment" ? "TREATMENT \u2014 verbatim" : "DANGER") + " \u2022 " + esc(e.name) + "</div>" + body,
    verdict: "DANGER", source: refLine(e) + " \u2022 verbatim", chip,
  };
}
function siblingChip(e){
  const m = manualOf(e);
  const list = getTopics().filter(t => manualOf(t) === m);
  const i = list.findIndex(t => t.id === e.id);
  if (i >= 0 && i + 1 < list.length) {
    const nx = list[i + 1];
    if (nx.chapter === e.chapter) return { label: "next section \u2014 " + nx.title, query: "topic: " + nx.title };
  }
  return null;
}

// ═══════════════════════════════ PROCEDURE lane ═══════════════════════════════
const HOW_TRIGGER = /^(?:how\s+(?:to|do\s+i|can\s+i|would\s+i|does\s+one)|steps\s+(?:to|for)|procedure\s+(?:for|of)|instructions\s+(?:for|to))\s+(.+?)[?!.]*$/i;
function procQuery(raw){
  const low = norm(raw);
  if (!low) return null;
  const procs = getProcs();
  // 1. exact key
  const exact = procs.filter(p => norm(p.title) === low);
  if (exact.length === 1) return procCard(exact[0]);
  if (exact.length > 1) return null;
  // 2. bare-subject path: FULL coverage only (partial matches are reserved for how-phrasing)
  {
    const qCW = contentWords(low);
    const full = procs.filter(p => { const k = contentWords(p.title); return k.length && qCW.length && qCW.every(w => k.indexOf(w) >= 0); });
    if (full.length === 1) return procCard(full[0]);
  }
  // 3. how-phrasing → containment, then head-noun rule
  const m = HOW_TRIGGER.exec(String(raw).trim());
  if (m) {
    const subj = m[1];
    const qCW = contentWords(subj);
    if (qCW.length) {
      const cand = procs.filter(p => hasAll(contentWords(p.title), qCW));
      if (cand.length === 1) return procCard(cand[0]);
      // head-noun fallback removed after live sweep: "aboveground still" pulled
      // "Belowground Still" — a mis-route across subjects. Never guess across
      // subjects; fall through to the topic lane instead.
    }
  }
  return null;
}
function procCard(p){
  const t = getTopics().find(x => x.id === p.topic_id);
  let body = "";
  if (p.method === "bullet-list") {
    body = (p.intro ? '<div class="ll-quote">\u201c' + esc(p.intro) + "\u201d" + flagNote(p.qa_flags) + "</div>" : "") +
      (t ? '<div class="ll-quote">\u201c' + esc(t.text) + "\u201d</div>" : "") +
      '<div class="ll-ref">Source list: ' + (p.bullet_count || 0) + " bulleted items in the scan; item boundaries are not reconstructed \u2014 the full source text is quoted above.</div>";
  } else {
    body = (p.intro ? '<div class="ll-quote">\u201c' + esc(p.intro) + "\u201d</div>" : "");
    body += (p.steps || []).map(s => '<div class="ll-step">\u201c' + esc(s) + "\u201d</div>").join("");
    body += flagNote(p.qa_flags);
  }
  return {
    reply: '<div class="ll-h">PROCEDURE \u2022 ' + esc(p.title) + "</div>" + body,
    verdict: "PROCEDURE", source: refLine(p) + " \u2022 verbatim (" + p.method + ")",
    chip: siblingChip(p),
  };
}

// ═══════════════════════════════ TOPIC lanes ═══════════════════════════════
function topicExact(raw){
  const low = norm(raw);
  if (!low) return null;
  const hits = getTopics().filter(t => t.key === low || norm(t.title) === low);
  if (hits.length === 1) return topicCard(hits[0]);
  return null;
}
function topicFuzzy(raw){
  const qCW = contentWords(raw);
  if (!qCW.length) return null;
  const pick = pickScored(getTopics(), qCW, t => contentWords(t.title));
  if (!pick) return null;
  return topicCard(pick.e, pick.others);
}
function topicCard(t, others){
  const truncated = t.text.length > 4000;
  const body = '<div class="ll-quote">\u201c' + esc(t.text.slice(0, 4000)) + (truncated ? " \u2026" : "") + "\u201d" + flagNote(t.qa_flags) + "</div>" +
    (truncated ? '<div class="ll-ref">Section continues \u2014 say <span class="tru-ref" data-q="read ' +
      (manualOf(t) === 0 ? "para " + t.para : "section " + (t.section || t.title)) + '" style="cursor:pointer">read it</span> to open the reader here.</div>' : "");
  let chip = siblingChip(t);
  if (!chip && others && others.length) {
    const o = others[0];
    chip = { label: o.title, query: o.key || norm(o.title) };
  }
  return {
    reply: '<div class="ll-h">TOPIC \u2022 ' + esc(t.title) + "</div>" + body,
    verdict: "TOPIC", source: refLine(t) + " \u2022 verbatim",
    chip,
  };
}

// scored selection shared by DANGER / TOPIC-FUZZY / bare-PROCEDURE matching.
// Full query coverage of the title wins (corpus-first, honest: every candidate
// is a real source entry); partial coverage must be strictly best to be used.
function pickScored(list, qCW, getCW){
  const full = [], part = [];
  for (const e of list) {
    const kCW = getCW(e);
    if (!kCW.length) continue;
    const covT = qCW.filter(w => kCW.indexOf(w) >= 0).length / qCW.length;
    const covK = kCW.filter(w => qCW.indexOf(w) >= 0).length / kCW.length;
    const score = Math.max(covT, covK);
    if (score >= 0.999) full.push(e);
    else if (score >= 0.5) part.push({ e, score });
  }
  if (full.length) return { e: full[0], others: full.slice(1, 3) };
  if (!part.length) return null;
  part.sort((a, b) => b.score - a.score || getCW(a.e).length - getCW(b.e).length);
  if (part[1] && part[1].score === part[0].score && getCW(part[1].e).length === getCW(part[0].e).length) return null;
  return { e: part[0].e, others: [] };
}

// ═══════════════════════════════ GAP lane ═══════════════════════════════
const EMERGENCY_TOKENS = ["choking","cpr","resuscitation","breathing","airway","bleeding","blood","shock","wound",
  "burn","fracture","splint","tourniquet","snake","snakebite","spider","scorpion","bite","sting","insect","bee",
  "wasp","hornet","water","dehydration","heat","heatstroke","hypothermia","frostbite","shelter","fire","food",
  "plant","poison","drowning","signal","rescue","blister","sprain","dislocation","eye","ear","nose","throat",
  "unconscious","faint","toxic","chemical","radiation","fallout"];
function gapPointer(raw){
  const low = norm(raw);
  const toks = norm(low).split(" ").map(stem);
  const hits = toks.filter(t => EMERGENCY_TOKENS.indexOf(t) >= 0);
  if (!hits.length) return null;
  const treatmentBias = /\b(treatment|first aid|treat|fix|heal|care)\b/.test(low);
  let pool = [];
  for (const e of getDangers()) {
    const cw = contentWords(e.name);
    for (const h of hits) {
      if (cw.indexOf(h) >= 0) { pool.push({ e, cw: cw.length }); break; }
    }
  }
  if (!pool.length || !treatmentBias) {
    for (const t of getTopics()) {
      const cw = contentWords(t.title);
      for (const h of hits) {
        if (cw.indexOf(h) >= 0) { pool.push({ e: t, cw: cw.length, topic: true }); break; }
      }
    }
  }
  if (!pool.length) return null;
  if (treatmentBias) {
    const tr = pool.filter(p => !p.topic && p.e.kind === "treatment");
    if (tr.length) pool = tr;
  }
  pool.sort((a, b) => a.cw - b.cw);
  const best = pool[0].e;
  const title = best.name || best.title;
  return { title, query: best.topic ? "topic: " + title : norm(title) };
}
function gapQuery(raw, forcedPointer){
  let pointer = forcedPointer || gapPointer(raw);
  let gapLine;
  try {
    if (localStorage.getItem("tru_lifeline_gap_v1")) {
      gapLine = "No source entry for that.";
    } else {
      gapLine = "No source entry for that. I only quote the manuals in this file \u2014 I never generate advice, " +
        "because a wrong guess here can cost a life. Try a subject from the manuals (water, shelter, signals, " +
        "fractures, snakes\u2026) or say \u201chelp\u201d.";
      localStorage.setItem("tru_lifeline_gap_v1", "1");
    }
  } catch (e) { gapLine = "No source entry for that."; }
  let reply = esc(gapLine);
  if (pointer) {
    reply += '<div class="ll-gap">\u2022 no source entry \u2014 nearest covered: <span class="tru-ref" data-q="' +
      esc(pointer.query) + '" style="cursor:pointer">' + esc(pointer.title) + "</span></div>";
  }
  return { reply, verdict: "GAP", source: "no retrieval \u2022 honest gap", chip: pointer ? { label: pointer.title, query: pointer.query } : null };
}

// ═══════════════════════════════ READER ═══════════════════════════════
let readerState = { active: false, paused: false, index: 0, m: 1 };
let _READER_RATE = 0.92, _READER_MODE = "voice", _READER_ERRORS = 0, _READER_GEN = 0, _READER_TIMER = null;
let _READER_GENDER = "female", _READER_VOICE_URI = "";
try {
  const rvp = JSON.parse(localStorage.getItem("tru_lifeline_reader_voice_v1") || "{}");
  if (rvp.gender === "male" || rvp.gender === "female") _READER_GENDER = rvp.gender;
  if (typeof rvp.voiceURI === "string") _READER_VOICE_URI = rvp.voiceURI;
} catch (e) {}
const READER_VOICE_NAMES = { female: /\b(samantha|serena|karen|moira|tessa|victoria|ava|zoe|allison|susan|aria|jenny|zira|hazel|fiona|sarah|emma|olivia|shelley|kate|alice|sophie|sonia|female|woman)\b/i,
  male: /\b(daniel|fred|tom|oliver|guy|david|mark|james|george|ryan|liam|arthur|aaron|matthew|joey|rishi|eric|john|jacob|chris|michael|charles|thomas|bruce|male|man)\b/i };
function readerVoiceList(){
  if (!("speechSynthesis" in window)) return [];
  try {
    return window.speechSynthesis.getVoices().filter(v => v && /^en(?:[-_]|$)/i.test(v.lang || "") &&
      (v.localService === true || /-local/i.test(v.voiceURI || "") || /-local/i.test(v.name || "")));
  } catch (e) { return []; }
}
function readerVoiceKey(v){ return String(v.voiceURI || ((v.name || "") + "|" + (v.lang || ""))); }
function readerVoiceMatch(v, g){ return !!(v && READER_VOICE_NAMES[g] && READER_VOICE_NAMES[g].test((v.name || "") + " " + (v.voiceURI || ""))); }
function readerChosenVoice(){
  const vs = readerVoiceList();
  if (_READER_VOICE_URI) { const exact = vs.find(v => readerVoiceKey(v) === _READER_VOICE_URI); if (exact) return exact; }
  return vs.find(v => readerVoiceMatch(v, _READER_GENDER)) || vs[0] || null;
}
function readerVoiceStatus(){
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined")
    return "Speech is unavailable in this browser; read-along only.";
  const vs = readerVoiceList();
  if (!vs.length) return "No offline English voice detected. Install one on this device, then reopen TRU LIFELINE.";
  const v = readerChosenVoice();
  if (!v) return "No usable local English voice is available.";
  if (_READER_VOICE_URI) return readerVoiceKey(v) === _READER_VOICE_URI ? "Offline English voice selected: " + v.name + "." :
    "Saved voice is unavailable; using local voice " + v.name + ". Choose another voice if needed.";
  if (readerVoiceMatch(v, _READER_GENDER)) return "Offline English voice: " + v.name + ".";
  return "No recognizable " + _READER_GENDER + " voice listed; using local voice " + v.name + ". Choose a named voice if needed.";
}
function readerSaveVoice(){ try { localStorage.setItem("tru_lifeline_reader_voice_v1", JSON.stringify({ gender: _READER_GENDER, voiceURI: _READER_VOICE_URI })); } catch (e) {} }
function readerRefreshVoices(){
  const list = readerVoiceList(), sel = $("readerVoiceSelect");
  if (sel) {
    const wanted = _READER_VOICE_URI;
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    const auto = document.createElement("option"); auto.value = ""; auto.textContent = "AUTO"; sel.appendChild(auto);
    list.forEach(v => { const o = document.createElement("option"); o.value = readerVoiceKey(v);
      o.textContent = (v.name || "English voice") + " \u00b7 " + (v.lang || "en"); sel.appendChild(o); });
    sel.value = list.some(v => readerVoiceKey(v) === wanted) ? wanted : "";
  }
  const f = $("readerVoiceFemale"), m = $("readerVoiceMale"), st = $("readerVoiceStatus"), test = $("readerVoiceTest");
  if (f) { f.classList.toggle("active", _READER_GENDER === "female"); f.setAttribute("aria-pressed", String(_READER_GENDER === "female")); }
  if (m) { m.classList.toggle("active", _READER_GENDER === "male"); m.setAttribute("aria-pressed", String(_READER_GENDER === "male")); }
  if (st) st.textContent = readerVoiceStatus();
  if (test) test.disabled = !list.length || typeof SpeechSynthesisUtterance === "undefined" || !!(readerState && readerState.active && !readerState.paused);
}
function setReaderGender(g){ _READER_GENDER = g; readerSaveVoice(); readerRefreshVoices(); if (readerState.active && !readerState.paused) { readerCancel(); readerSpeakCurrent(); } }
function setReaderVoice(uri){ _READER_VOICE_URI = uri || ""; readerSaveVoice(); readerRefreshVoices(); if (readerState.active && !readerState.paused) { readerCancel(); readerSpeakCurrent(); } }
function readerTestVoice(){
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") { readerRefreshVoices(); return; }
  try { window.speechSynthesis.cancel(); } catch (e) {}
  const u = new SpeechSynthesisUtterance("TRU LIFELINE voice check. This is the offline reader voice.");
  u.rate = _READER_RATE;
  const v = readerChosenVoice(); if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

// reader items: TOPICS entries in corpus order per manual
let _ITEMS = [null, null];
function readerItems(m){
  if (_ITEMS[m]) return _ITEMS[m];
  _ITEMS[m] = getTopics().filter(t => manualOf(t) === m);
  return _ITEMS[m];
}
function readerDisplayRef(item){
  if (!item) return "";
  if (manualOf(item) === 0) return (item.para ? item.para + " " : "") + (item.title || "");
  return "CH " + item.chapter + " \u00b7 " + (item.title || "");
}
function readerSave(){ try { localStorage.setItem("tru_lifeline_reader_v1", JSON.stringify(readerState)); } catch (e) {} }
function readerLoad(){
  try {
    const s = JSON.parse(localStorage.getItem("tru_lifeline_reader_v1") || "{}");
    if (s && typeof s.index === "number" && (s.m === 0 || s.m === 1)) {
      readerState.m = s.m; readerState.index = s.index;
      readerState.active = false; readerState.paused = false;
    }
  } catch (e) {}
}
function readerSetProgress(label){ const el = $("readerProgress"); if (el) el.textContent = label; }
function readerButtons(){
  $("readerStart").disabled = readerState.active && !readerState.paused;
  $("readerPause").disabled = !readerState.active;
  $("readerStop").disabled = !readerState.active;
  $("readerPause").textContent = readerState.paused ? "RESUME" : "PAUSE";
}
function readerCurrent(){ const items = readerItems(readerState.m); return readerState.index >= 0 && readerState.index < items.length ? items[readerState.index] : null; }
function readerCancel(){
  _READER_GEN++;
  if (_READER_TIMER) { try { clearTimeout(_READER_TIMER); } catch (e) {} _READER_TIMER = null; }
  try { window.speechSynthesis.cancel(); } catch (e) {}
}
function readerStatus(){
  const item = readerCurrent();
  if (!item) return "No reader position yet.";
  return manualName(readerState.m) + " \u00b7 " + readerDisplayRef(item) + " \u00b7 item " + (readerState.index + 1) + " of " + readerItems(readerState.m).length;
}
function readerSpeakCurrent(){
  if (!readerState.active || readerState.paused) return;
  if (_READER_MODE === "silent" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") { readerSilentStep(); return; }
  const item = readerCurrent();
  if (!item) { readerStopQuiet("Reader complete \u2014 end of corpus."); return; }
  const items = readerItems(readerState.m);
  const prev = readerState.index > 0 ? items[readerState.index - 1] : null;
  const isNewChapter = !prev || prev.chapter !== item.chapter || manualOf(prev) !== manualOf(item);
  const chapLabel = "Chapter " + item.chapter + (item.chapter_title ? ": " + item.chapter_title : "");
  readerSetProgress((_READER_MODE === "silent" ? "READ-ALONG ONLY \u2022 no audible speech \u2022 " : "Reading ") +
    (isNewChapter ? chapLabel + " \u2022 " : "") + readerDisplayRef(item));
  const strip = $("verseStrip");
  if (strip) { strip.style.display = "block"; strip.textContent = readerDisplayRef(item) + " \u2014 " + String(item.text).replace(/\s+/g, " ").slice(0, 220); }
  readerCancel();
  readerUtterance = new SpeechSynthesisUtterance((isNewChapter ? chapLabel + ". " : "") + String(item.text).replace(/\s+/g, " "));
  readerUtterance.rate = _READER_RATE;
  const v = readerChosenVoice(); if (v) readerUtterance.voice = v;
  readerUtterance.onend = () => { if (gen !== _READER_GEN) return; if (!readerState.active || readerState.paused) return; readerState.index++; readerSave(); if (readerState.index >= items.length) { readerStopQuiet("Reader complete \u2014 end of corpus."); return; } readerSpeakCurrent(); };
  readerUtterance.onerror = () => { if (gen !== _READER_GEN) return; _READER_ERRORS++; if (_READER_ERRORS === 1) { readerState.paused = true; readerButtons(); readerSetProgress("Speech error \u2014 paused. Press RESUME to retry, or switch to the offline voice dropdown."); } else { _READER_MODE = "silent"; readerSilentStep(); } };
  const gen = ++_READER_GEN;
  try { window.speechSynthesis.speak(readerUtterance); } catch (e) { _READER_MODE = "silent"; readerSilentStep(); }
}
function readerSilentStep(){
  const item = readerCurrent();
  if (!item || !readerState.active || readerState.paused) { if (!item && readerState.active) readerStopQuiet("Reader complete \u2014 end of corpus."); return; }
  const items = readerItems(readerState.m);
  const prev = readerState.index > 0 ? items[readerState.index - 1] : null;
  const isNewChapter = !prev || prev.chapter !== item.chapter;
  readerSetProgress("READ-ALONG ONLY \u2022 no audible speech \u2022 " + (isNewChapter ? "Chapter " + item.chapter + " \u2022 " : "") + readerDisplayRef(item));
  const strip = $("verseStrip");
  if (strip) { strip.style.display = "block"; strip.textContent = readerDisplayRef(item) + " \u2014 " + String(item.text).replace(/\s+/g, " ").slice(0, 220); }
  const dur = Math.max(2500, Math.min(11000, 2400 + String(item.text).length * 22));
  const gen = ++_READER_GEN;
  _READER_TIMER = setTimeout(() => { if (gen !== _READER_GEN) return; if (!readerState.active || readerState.paused) return; readerState.index++; readerSave(); if (readerState.index >= items.length) { readerStopQuiet("Reader complete \u2014 end of corpus."); return; } readerSilentStep(); }, dur);
}
function readerStopQuiet(msg){ readerState.active = false; readerState.paused = false; readerSave(); readerButtons(); readerSetProgress(msg || "Reader stopped."); }
function readerStart(){
  if (readerState.active && !readerState.paused) return;
  if (!readerCurrent()) { readerState.m = 1; readerState.index = 0; }
  readerState.active = true; readerState.paused = false; readerSave(); readerButtons();
  _READER_ERRORS = 0;
  readerSpeakCurrent();
}
function readerPause(){
  if (!readerState.active) return;
  readerState.paused = !readerState.paused; readerSave(); readerButtons();
  if (readerState.paused) { readerCancel(); readerSetProgress("Paused at " + readerDisplayRef(readerCurrent())); }
  else { _READER_ERRORS = 0; readerSpeakCurrent(); }
}
function readerStop(){ if (!readerState.active) return; readerCancel(); readerStopQuiet("Reader stopped at " + readerDisplayRef(readerCurrent()) + "."); }

// reader command parsing (explicit navigation commands only)
function readerCommand(raw){
  const low = norm(raw);
  if (/^(read faster|faster)$/.test(low)) { _READER_RATE = Math.min(1.4, _READER_RATE + 0.08); readerSaveVoice(); return { reply: "Reader rate: " + _READER_RATE.toFixed(2) + "x", verdict: "READER", source: "local reader" }; }
  if (/^(read slower|slower)$/.test(low)) { _READER_RATE = Math.max(0.6, _READER_RATE - 0.08); readerSaveVoice(); return { reply: "Reader rate: " + _READER_RATE.toFixed(2) + "x", verdict: "READER", source: "local reader" }; }
  if (/^(pause)$/.test(low)) { if (readerState.active) { readerPause(); return { reply: "Paused at " + readerDisplayRef(readerCurrent()), verdict: "READER", source: "local reader" }; } return null; }
  if (/^(resume)$/.test(low)) { if (readerState.active && readerState.paused) { readerPause(); return { reply: "Resumed at " + readerDisplayRef(readerCurrent()), verdict: "READER", source: "local reader" }; } return null; }
  if (/^(stop( reading)?)$/.test(low)) { if (readerState.active) { readerStop(); return { reply: "Reader stopped at " + readerDisplayRef(readerCurrent()) + ".", verdict: "READER", source: "local reader" }; } return { reply: "Nothing is reading.", verdict: "READER", source: "local reader" }; }
  if (/^where am i$/.test(low)) {
    if (!readerCurrent()) return { reply: "No reader position yet. Say <span class=\"tru-ref\" data-q=\"read fm 21-11 chapter 1\" style=\"cursor:pointer\">read fm 21-11 chapter 1</span> or <span class=\"tru-ref\" data-q=\"read survival chapter 1\" style=\"cursor:pointer\">read survival chapter 1</span>.", verdict: "READER", source: "local reader", html: true };
    return { reply: esc(readerStatus()) + "<br><span style=\"color:#6b7f8a;font-size:10.5px\">" + esc(readerVoiceStatus()) + "</span>", verdict: "READER", source: "local reader", html: true, chip: { label: "next section", query: "next section" } };
  }
  const stepM = /^(next|previous|next section|previous section|next para|previous para)$/.exec(low);
  if (stepM) {
    if (!readerState.active) return { reply: "The reader is not open. Say <span class=\"tru-ref\" data-q=\"read fm 21-11 chapter 1\" style=\"cursor:pointer\">read fm 21-11 chapter 1</span> to start.", verdict: "READER", source: "local reader", html: true };
    const wasPaused = readerState.paused;
    readerState.index += stepM[1] === "next" ? 1 : -1;
    if (readerState.index < 0) readerState.index = 0;
    const items = readerItems(readerState.m);
    if (readerState.index >= items.length) { readerState.index = items.length - 1; readerSave(); return { reply: "End of corpus \u2014 last item is " + readerDisplayRef(readerCurrent()), verdict: "READER", source: "local reader" }; }
    readerSave();
    if (!wasPaused) { readerCancel(); readerSpeakCurrent(); } else readerSetProgress("At " + readerDisplayRef(readerCurrent()));
    return { reply: esc(readerStatus()), verdict: "READER", source: "local reader", chip: { label: "next section", query: "next section" } };
  }
  // read/open commands
  const m = /^(?:read|open)\s+(.*)$/.exec(low);
  if (!m) return null;
  const rest = m[1].trim();
  if (!rest) { // bare "read": resume or start
    if (!readerCurrent()) { readerState.m = 1; readerState.index = 0; }
    readerStart();
    return { reply: esc("Reading " + readerStatus()), verdict: "READER", source: "local reader", chip: { label: "next section", query: "next section" } };
  }
  let man = null;
  if (/\b21\s*-?\s*11\b/.test(rest) || /\bfirst aid\b/.test(rest)) man = 0;
  else if (/\b21\s*-?\s*76\b/.test(rest) || /\bsurvival\b/.test(rest)) man = 1;
  let body = rest.replace(/\b(fm\s*)?21\s*-?\s*(11|76)\b/g, " ").replace(/\b(first aid|survival|manual)\b/g, " ").replace(/\s+/g, " ").trim();
  // para jump: "para 9-6" / "9-6"
  const pm = /^(?:para\s*|paragraph\s*)?(\d{1,2})\s*[-\u2013]\s*(\d{1,2}[a-z]?)(?:\*)?$/.exec(body);
  if (pm) {
    const para = pm[1] + "-" + pm[2];
    const hit = getTopics().filter(t => manualOf(t) === 0 && String(t.para || "").replace(/\*/g, "") === para);
    if (hit.length) {
      readerState.m = 0; readerState.index = readerItems(0).indexOf(hit[0]);
      readerState.active = true; readerState.paused = false; readerSave(); readerButtons(); _READER_ERRORS = 0; readerSpeakCurrent();
      return { reply: esc("FM 21-11 \u00b7 \u00b6 " + para + " \u00b7 " + hit[0].title), verdict: "READER", source: "local reader", chip: { label: "next section", query: "next section" } };
    }
    return { reply: "No paragraph " + para + " in FM 21-11 as scanned. OCR marker gaps are honest \u2014 some paragraph numbers were lost in the scan.", verdict: "READER", source: "local reader" };
  }
  // section jump: "section <title words>"
  const sm = /^(?:section\s+)?(.+)$/.exec(body);
  if (sm && !/\bchapter\b/.test(body)) {
    const key = norm(sm[1]);
    const scope = man != null ? man : (readerCurrent() ? readerState.m : 1);
    const hit = getTopics().filter(t => manualOf(t) === scope && (norm(t.title) === key || t.key === key));
    if (hit.length === 1) {
      readerState.m = scope; readerState.index = readerItems(scope).indexOf(hit[0]);
      readerState.active = true; readerState.paused = false; readerSave(); readerButtons(); _READER_ERRORS = 0; readerSpeakCurrent();
      return { reply: esc(manualName(scope) + " \u00b7 " + readerDisplayRef(hit[0])), verdict: "READER", source: "local reader", chip: { label: "next section", query: "next section" } };
    }
  }
  // chapter jump
  const cm = /^(?:chapter\s*)?(\d{1,2})$/.exec(body) || /^chapter\s+(\d{1,2})$/.exec(body);
  if (cm) {
    const ch = parseInt(cm[1], 10);
    const scope = man != null ? man : (readerCurrent() ? readerState.m : 1);
    const items = readerItems(scope).filter(t => t.chapter === ch);
    if (!items.length) return { reply: "Chapter " + ch + " is not in " + manualName(scope) + ".", verdict: "READER", source: "local reader" };
    readerState.m = scope; readerState.index = readerItems(scope).indexOf(items[0]);
    readerState.active = true; readerState.paused = false; readerSave(); readerButtons(); _READER_ERRORS = 0; readerSpeakCurrent();
    return { reply: esc(manualName(scope) + " \u00b7 Chapter " + ch + (items[0].chapter_title ? " \u2014 " + items[0].chapter_title : "") + " \u00b7 " + items.length + " sections"), verdict: "READER", source: "local reader", chip: { label: "next section", query: "next section" } };
  }
  return null;
}

// ═══════════════════════════════ route ═══════════════════════════════
function resolveAnswer(raw){
  const q = String(raw == null ? "" : raw).trim();
  if (!q) return gapQuery("");
  // 0 STATE
  const st = stateLane(q);
  if (st) return st;
  // 1 READER
  const rc = readerCommand(q);
  if (rc) return rc;
  // 2 CALC
  const calc = calcQuery(q);
  if (calc) return calc;
  // forced topic chip route
  const forced = /^topic:\s*(.+)$/i.exec(q);
  if (forced) {
    const t = getTopics().find(x => x.key === norm(forced[1]) || norm(x.title) === norm(forced[1]));
    if (t) return topicCard(t);
    return gapQuery(q);
  }
  // 3 DEFINE
  const def = defineQuery(q);
  if (def) return def;
  // 4 DANGER
  const dgr = dangerQuery(q);
  if (dgr) return dgr;
  // 5 PROCEDURE
  const prc = procQuery(q);
  if (prc) return prc;
  // 6 TOPIC exact
  const top = topicExact(q);
  if (top) return top;
  // 7 TOPIC-FUZZY
  const fz = topicFuzzy(q);
  if (fz) { fz.verdict = "TOPICFUZZY"; return fz; }
  // 8 GAP (+ pointer)
  return gapQuery(q);
}

// ═══════════════════════════════ UI ═══════════════════════════════
const chat = $("chat"), input = $("input"), sendBtn = $("send"), badge = $("badge"), statusEl = $("status"), sub = $("sub"), holo = $("holo");
let busy = false, readerUtterance = null;

function setVerdict(v){ badge.textContent = VNAME[v] || v; badge.style.color = VERDICT[v] || "#00e5ff"; }
function nodeCountSummary(){
  const t = getTopics().length, p = getProcs().length, d = getDangers().length, tm = getTerms().length;
  const n11 = readerItems(0).length, n76 = readerItems(1).length;
  return n76 + " survival sections \u00b7 " + n11 + " first-aid paragraphs \u00b7 " + p + " procedures \u00b7 " + d + " danger entries \u00b7 " + tm + " defined terms \u2014 all local";
}
function speak(text){
  if (!("speechSynthesis" in window)) return;
  try { window.speechSynthesis.cancel(); } catch (e) {}
  const plain = String(text).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const u = new SpeechSynthesisUtterance(plain.slice(0, 600));
  u.rate = 0.96; u.pitch = 0.88;
  const vs = window.speechSynthesis.getVoices();
  const pick = vs.find(v => /samantha|serena|karen|moira|tessa/i.test(v.name)) || vs.find(v => v.lang && v.lang.startsWith("en"));
  if (pick) u.voice = pick;
  window.speechSynthesis.speak(u);
}
function loadHistory(){ try { return JSON.parse(localStorage.getItem("tru_lifeline_history_v1") || "[]"); } catch (e) { return []; } }
function saveHistory(h){ try { localStorage.setItem("tru_lifeline_history_v1", JSON.stringify(h.slice(-200))); } catch (e) {} }

function addMsg(role, text, verdict, meta){
  const d = document.createElement("div");
  d.className = "msg " + role;
  if (role === "tru" && verdict) {
    const c = VERDICT[verdict] || "#00e5ff";
    d.style.setProperty("--mc", c);
    const vd = document.createElement("div"); vd.className = "vd"; vd.textContent = VNAME[verdict] || verdict; d.appendChild(vd);
    if (meta && meta.source) { const pv = document.createElement("div"); pv.className = "prov"; pv.textContent = "SOURCE \u2022 " + meta.source; d.appendChild(pv); }
  }
  const t = document.createElement("div");
  if (meta && meta.html) t.innerHTML = text; else t.textContent = text;
  t.style.whiteSpace = "pre-line";
  d.appendChild(t);
  if (role === "tru" && meta && meta.chip) {
    const fu = document.createElement("div"); fu.className = "fu";
    fu.innerHTML = '\u21b3 <span class="tru-ref" data-q="' + esc(meta.chip.query) + '">' + esc(meta.chip.label) + "</span>";
    d.appendChild(fu);
  }
  chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
}

async function send(qOverride){
  const q = (qOverride != null ? qOverride : input.value).trim();
  if (!q || busy) return;
  input.value = ""; busy = true; sendBtn.disabled = true;
  addMsg("user", q);
  holo.classList.add("thinking");
  statusEl.textContent = "\u25cf EXECUTING \u2022 " + q.slice(0, 30);
  await new Promise(r => setTimeout(r, 40));
  let res;
  try { res = resolveAnswer(q); } catch (e) { console.error(e); res = { reply: "internal fault: " + e.message, verdict: "GAP", source: "runtime fault" }; }
  const hist = loadHistory(); hist.push({ q, verdict: res.verdict, at: Date.now() }); saveHistory(hist);
  holo.classList.remove("thinking");
  setVerdict(res.verdict);
  addMsg("tru", res.reply, res.verdict, res);
  const src = res.source ? " \u2022 " + res.source : " \u2022 offline";
  statusEl.textContent = "\u25cf " + (VNAME[res.verdict] || res.verdict) + src;
  if (res.reader_action !== undefined || res.__reader) { /* reader already applied in lane */ }
  if (res.portal_action) {
    const pp = document.getElementById("tru-portal-panel");
    if (pp) {
      pp.style.display = "block";
      const ps = document.getElementById("portal-stats");
      if (ps) { try { ps.textContent = nodeCountSummary(); } catch (e) { ps.textContent = "offline engine"; } }
      const pb = document.getElementById("portal-build");
      if (pb) pb.textContent = "TRU LIFELINE v1 \u2022 build " + __BUILD__;
      addMsg("tru", "Portal open. " + nodeCountSummary() + ". Build " + __BUILD__ + ".", "STATE", { source: "local \u2022 no retrieval" });
    }
  }
  speak(res.reply);
  busy = false; sendBtn.disabled = false; input.focus();
}

// chip click routing (chips are routes too)
document.addEventListener("click", ev => {
  const el = ev.target && ev.target.closest ? ev.target.closest(".tru-ref") : null;
  if (!el) return;
  const q = el.getAttribute("data-q");
  if (q) send(q);
});

// reader bar wiring
$("readerStart").addEventListener("click", readerStart);
$("readerPause").addEventListener("click", readerPause);
$("readerStop").addEventListener("click", readerStop);
$("readerVoiceFemale").addEventListener("click", () => setReaderGender("female"));
$("readerVoiceMale").addEventListener("click", () => setReaderGender("male"));
$("readerVoiceSelect").addEventListener("change", e => setReaderVoice(e.target.value));
$("readerVoiceTest").addEventListener("click", readerTestVoice);
if ("speechSynthesis" in window) {
  try {
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      readerRefreshVoices();
      if (readerState.active && !readerState.paused && _READER_MODE === "silent" && readerChosenVoice()) { _READER_MODE = "voice"; readerCancel(); readerSpeakCurrent(); }
    });
  } catch (e) { window.speechSynthesis.onvoiceschanged = () => readerRefreshVoices(); }
}
readerRefreshVoices();
input.addEventListener("input", () => { sendBtn.disabled = busy || !input.value.trim(); });
input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); send(); } });
function setTruMode(){ /* offline is the only mode — zero network is doctrine */ }

// ── portal panel (built once) ──
(function buildPortal(){
  if ($("tru-portal-panel")) return;
  const pp = document.createElement("div");
  pp.id = "tru-portal-panel";
  pp.style.cssText = "display:none;position:fixed;right:12px;bottom:96px;max-width:340px;z-index:900;background:rgba(0,20,30,.95);border:1px solid rgba(0,229,255,.3);border-radius:8px;padding:14px;color:#c5e9f5;font:11px ui-monospace,monospace;line-height:1.5";
  pp.innerHTML =
    '<div style="color:#00e5ff;letter-spacing:2px;margin-bottom:6px">TRU LIFELINE \u2014 PORTAL</div>' +
    '<div id="portal-stats" style="color:#9ed7ff;margin-bottom:6px"></div>' +
    '<div id="portal-build" style="color:#6b7f8a;margin-bottom:8px"></div>' +
    '<div style="color:#9ed7ff">SOURCES</div>' +
    '<div style="color:#c5e9f5">FM 21-76 Survival (1970 text) \u2014 US Gov PD<br>FM 21-11 First Aid for Soldiers (1976) \u2014 US Gov PD<br>FM 21-11 (1943) \u2014 kept, not wired in v1</div>' +
    '<div style="color:#e0b34d;margin-top:6px">Rejected: 1992 Barnes &amp; Noble reprint (added \u00a9 material).</div>' +
    '<div style="color:#6b7f8a;margin-top:8px">Every card quotes its source paragraph verbatim. Nothing is generated. OCR gaps are flagged, never invented.</div>' +
    '<div style="margin-top:8px;text-align:right"><button onclick="document.getElementById(\'tru-portal-panel\').style.display=\'none\'" style="background:none;border:1px solid rgba(0,229,255,.4);color:#00e5ff;border-radius:4px;padding:3px 10px;font:10px ui-monospace,monospace;cursor:pointer">CLOSE</button></div>';
  document.body.appendChild(pp);
})();

// ── boot ──
function ready(){
  try {
    readerLoad(); readerButtons();
    readerSetProgress(readerStatus());
    setVerdict("STATE");
    statusEl.textContent = "\u25cf OFFLINE \u2022 READY";
    sub.textContent = nodeCountSummary();
    const hist = loadHistory();
    const memNote = hist.length > 0 ? '<div style="color:#69f0ae;font-size:11px;margin-bottom:10px">\u25cf REMEMBERED \u2022 ' + hist.length + ' TURNS</div>' : "";
    let intro = "";
    try { intro = localStorage.getItem("tru_lifeline_intro_v1") || ""; } catch (e) {}
    if (intro) {
      chat.innerHTML = '<div class="ready">' + memNote + '<div class="h">READY.</div>' +
        '<div style="color:#9ed7ff;margin-bottom:8px;font-size:13px">' + esc(nodeCountSummary()) + '.</div></div>';
    } else {
      chat.innerHTML = '<div class="ready">' + memNote +
        '<div class="h">TRU LIFELINE.</div>' +
        '<div style="margin-bottom:8px">' + esc(POSTURE) + '</div>' +
        '<div style="color:#9ed7ff;margin-bottom:8px;font-size:13px">' + esc(nodeCountSummary()) + '.</div></div>';
      try { localStorage.setItem("tru_lifeline_intro_v1", "1"); } catch (e) {}
    }
    sendBtn.disabled = false;
  } catch (e) {
    console.error("boot fault", e);
    sendBtn.disabled = false;
    statusEl.textContent = "\u25cf OFFLINE \u2022 READY";
  }
}
ready();
