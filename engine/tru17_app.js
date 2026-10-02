<script>

// LAZY LOAD: do not parse 11MB at boot (iOS WKWebView chokes). Parse on first use.
const __TRU_BUILD__="89bb0147";
const KJV_COUNT=31100;
const BIBLE_WORD_COUNT=13483;
const LEXICON_COUNT=14088;
const EASTON_COUNT=3961;
function nodeCountSummary(){let s2=KJV_COUNT.toLocaleString()+" KJV verses • "+BIBLE_WORD_COUNT.toLocaleString()+" Bible words • "+LEXICON_COUNT.toLocaleString()+" LOGOS Lexicon entries";try{const tp=getTopicalPack();if(tp&&tp.topics)s2+=" • "+Object.keys(tp.topics).length.toLocaleString()+" topical topics";}catch(e){}s2+=" • "+EASTON_COUNT.toLocaleString()+" dictionary entries";return s2;}
const BM25_SCORE_THRESHOLD=2;
const BM25_MIN_COVERAGE=0.5;
const PERF={seed_parse_ms:null,brain_clean_ms:null,index_ms:null,index_nodes:0,index_terms:0,query_count:0,queries:[],sanitize_count:0,sanitize_ms:0};
function perfNow(){return typeof performance!=="undefined"&&performance.now?performance.now():Date.now();}
function perfHeap(){try{return performance.memory&&performance.memory.usedJSHeapSize||null;}catch(e){return null;}}
let _SEED=null,_BRAIN=null,_KJV=null,_BRAIN_IDX=null;
function seedBrain(){
  if(_SEED===null){
    const started=perfNow();
    const _b=[];
    const _l=[];
    let _s=_b.concat(_l);
    _SEED=_s;
    PERF.seed_parse_ms=Number((perfNow()-started).toFixed(2));
  }
  return _SEED;
}
const OK="tru_local_overlay_v1";
let OVERLAY={added:{},removed:{},corrected:{}};
function loadOverlay(){ try{OVERLAY=JSON.parse(localStorage.getItem(OK)||"{}")||{};}catch(e){OVERLAY={};}OVERLAY.added=OVERLAY.added||{};OVERLAY.removed=OVERLAY.removed||{};OVERLAY.corrected=OVERLAY.corrected||{};}
function saveOverlay(){ try{localStorage.setItem(OK,JSON.stringify(OVERLAY));}catch(e){}}
function applyOverlay(seed){ loadOverlay();const out=[];const rem=OVERLAY.removed||{};for(const n of seed){const k=n.k;if(rem[k])continue;if(OVERLAY.corrected[k])out.push({...n,v:OVERLAY.corrected[k],source:n.source||n.s||"TRU_OVERLAY",t:n.t||n.type||"memory"});else out.push({...n});}for(const k in OVERLAY.added){if(!rem[k])out.push({k,v:OVERLAY.added[k],source:"TRU_OVERLAY",s:"TRU_OVERLAY",t:"memory",w:1});}return out;}
function getBrain(){
  if(_BRAIN===null){
    const started=perfNow();
    _BRAIN=cleanBrain(applyOverlay(seedBrain()));
    PERF.brain_clean_ms=Number((perfNow()-started).toFixed(2));
  }
  return _BRAIN;
}
function reloadBrain(){ _BRAIN=cleanBrain(applyOverlay(seedBrain())); IDX=null; buildIndex(); const sb=document.getElementById("sub"); if(sb)sb.textContent=nodeCountSummary(); }
function getKjv(){ if(_KJV===null){ const raw=JSON.parse(document.getElementById('kjv-data').textContent); _KJV=Array.isArray(raw)?raw:Object.entries(raw).map(([ref,text])=>({ref,text})); } return _KJV; }
// ── LOGOS Lexicon is the single original-language word-study path. ──
// ── cross-reference (TSK) layer (lazy) ──
const XREF_CODE_TO_NAME={gen:"genesis",exo:"exodus",lev:"leviticus",num:"numbers",deu:"deuteronomy",jos:"joshua",jdg:"judges",rut:"ruth","1sa":"1 samuel","2sa":"2 samuel","1ki":"1 kings","2ki":"2 kings","1ch":"1 chronicles","2ch":"2 chronicles",ezr:"ezra",neh:"nehemiah",est:"esther",job:"job",psa:"psalms",pro:"proverbs",ecc:"ecclesiastes",sos:"song of solomon",isa:"isaiah",jer:"jeremiah",lam:"lamentations",eze:"ezekiel",dan:"daniel",hos:"hosea",joe:"joel",amo:"amos",oba:"obadiah",jon:"jonah",mic:"micah",nah:"nahum",hab:"habakkuk",zep:"zephaniah",hag:"haggai",zec:"zechariah",mal:"malachi",mat:"matthew",mar:"mark",luk:"luke",joh:"john",act:"acts",rom:"romans","1co":"1 corinthians","2co":"2 corinthians",gal:"galatians",eph:"ephesians",php:"philippians",col:"colossians","1th":"1 thessalonians","2th":"2 thessalonians","1ti":"1 timothy","2ti":"2 timothy",tit:"titus",phm:"philemon",heb:"hebrews",jam:"james","1pe":"1 peter","2pe":"2 peter","1jo":"1 john","2jo":"2 john","3jo":"3 john",jde:"jude",rev:"revelation"};
const XREF_NAME_TO_CODE={};for(const c in XREF_CODE_TO_NAME)XREF_NAME_TO_CODE[XREF_CODE_TO_NAME[c]]=c;
let _XREF=null;
function getXref(){ if(_XREF===null){ _XREF=JSON.parse(document.getElementById("xref-data").textContent); } return _XREF; }
function expandXrefCode(s){ const m=s.match(/^([a-z0-9]+)\s+(\d+):(\d+)$/); if(!m)return s; const name=XREF_CODE_TO_NAME[m[1]]; if(!name)return s; return name+" "+m[2]+":"+m[3]; }
function getXrefsFor(ref){ try{ const m=ref.toLowerCase().match(/^(.+?)\s+(\d+):(\d+)$/); if(!m)return null; const raw=m[1].replace(/\s/g,""); const long=BOOK[raw]||m[1]; const code=XREF_NAME_TO_CODE[long]||XREF_NAME_TO_CODE[m[1]]; if(!code)return null; const key=code+" "+m[2]+":"+m[3]; const x=getXref(); const refs=x[key]; if(!refs||!refs.length)return null; return refs.slice(0,10).map(expandXrefCode); }catch(e){ return null; } }
function redLetterQuery(q){
  const low=String(q).toLowerCase();
  const m=low.match(/(?:what|how)\s+(?:does|did)\s+jesus(?:\s+christ)?\s+(?:say|says|said|teach|teaches|taught|command|speak|spoke)\s+(?:about|on|of|regarding|concerning)\s+([a-z0-9' ]+?)[?.!]*\s*$/);
  if(!m)return null;
  const topic=m[1].trim().replace(/^the\s+/i,"").replace(/[?.!]+$/g,"").trim();
  if(!topic)return null;
  const rs=getRedSet();if(!rs||!rs.size)return null;
  const kjv=getKjv();if(!kjv)return null;
  const toks=topic.split(/\s+/).filter(function(x){return x.length>2;});
  if(!toks.length)return null;
  const hits=[];
  for(const key in kjv){
    if(!rs.has(key))continue;
    const tl=" "+kjv[key].toLowerCase()+" ";
    let ok=true,score=0;
    for(const tk of toks){const parts=tl.split(" "+tk).length-1;if(!parts){ok=false;break;}score+=parts*10;}
    if(ok)hits.push([key,score]);
  }
  if(!hits.length&&toks.length>1){for(const tk of toks){let c=0;for(const key in kjv){if(!rs.has(key))continue;if((" "+kjv[key].toLowerCase()+" ").indexOf(" "+tk)>=0)c++;}if(c)hits.push([tk,c]);}if(hits.length){hits.sort((a,b)=>b[1]-a[1]);const bt=hits[0][0];hits.length=0;for(const key in kjv){if(!rs.has(key))continue;if((" "+kjv[key].toLowerCase()+" ").indexOf(" "+bt)>=0)hits.push([key,1]);}toks.length=0;toks.push(bt);}}
  if(!hits.length)return {reply:"No recorded words of Jesus in the red-letter set mention \u201c"+topic+"\u201d. Try a verse, a word, or a phrase from Scripture.",verdict:"GAP",scripture_ref:null,source:"red-letter \u2022 local",score:0,coverage:0,nodes_used:[],provenance:null,evidence:[],follow_up:false};
  hits.sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const top=hits.slice(0,6).map(h=>h[0]);
  const body=top.map(k2=>'<span class="tru-ref" data-q="'+esc(k2)+'" style="color:#00e5ff;cursor:pointer">'+esc(k2)+'</span>'+" \u2014 "+esc(kjv[k2])).join("<br><br>");
  return {html:true,reply:'<div class="enc-title">WORDS OF JESUS \u2022 '+esc(topic)+'</div>'+body,verdict:"TRUTH",scripture_ref:top[0],source:"red-letter (words of Jesus) \u2022 "+rs.size+" marked verses \u2022 local",nodes_used:top.map(k2=>({k:k2,w:1,source:"RED",t:"words of Jesus"})),follow_up:false};
}
function xrefQuery(q){
  const m=String(q).toLowerCase().match(/^(?:show\s+)?cross[- ]?references?\s+(?:for|of)\s+(.+?)\s*$/);
  if(!m)return null;
  const verse=parseVerse(m[1]);
  if(!verse)return {reply:"No KJV verse reference found in: "+m[1],verdict:"XREF",source:"TSK cross-reference • local",nodes_used:[],follow_up:false};
  const refs=getXrefsFor(verse.ref);
  if(!refs||!refs.length)return {reply:"No cross-references found for "+verse.ref+".",verdict:"XREF",source:"TSK cross-reference • local",nodes_used:[],follow_up:false};
  return {html:true,reply:esc(verse.ref)+" cross-references:<br><br>"+refs.map(function(rn){return "• "+'<span class="tru-ref" data-q="'+esc(rn)+'" style="color:#00e5ff;cursor:pointer">'+esc(rn)+'</span>';}).join("<br>"),verdict:"XREF",source:"TSK cross-reference • local",nodes_used:refs.map(r=>({k:r,w:1,source:"TSK",t:"cross-reference"})),follow_up:false};
}


const VERDICT={EXPORT:"#69f0ae",XREF:"#80cbc4",TRUTH:"#d8a657",SCRIPTURE:"#b388ff",REASON:"#00e5ff",KNOWLEDGE:"#4fc3f7",MEMORY:"#69f0ae",GAP:"#ff5252",UNKNOWN:"#888",CALC:"#aaff00",ENCYCLOPEDIA:"#4fc3f7",DEFINE:"#ce93d8",ARCHITECTURE:"#ffb74d",TOPICAL:"#4dd0e1"};

function questionFrame(q){
  const low=String(q||"").toLowerCase().trim().replace(/[!?]+$/g,"");
  const patterns=[
    [/^how much\b/,"how much","quantity_uncountable",false,true],
    [/^how many\b/,"how many","quantity_countable",false,true],
    [/^how often\b/,"how often","frequency",false,true],
    [/^how long\b/,"how long","duration_or_distance",false,true],
    [/^how far\b/,"how far","distance",false,true],
    [/^how old\b/,"how old","age_or_elapsed_time",false,true],
    [/^what time\b/,"what time","clock_time",false,true],
    [/^what (?:kind|type|sort)\b/,"what kind/type/sort","category",false,false],
    [/^what for\b|\bwhat did .+ do that for\b/,"what for","purpose",false,false],
    [/^what if\b/,"what if","hypothetical",false,false],
    [/^who\b/,"who","person_or_role",false,false],
    [/^whom\b/,"whom","person_as_object",false,false],
    [/^whose\b/,"whose","ownership",false,false],
    [/^what\b/,"what","thing_or_information",false,false],
    [/^which\b/,"which","choice",false,false],
    [/^when\b/,"when","time_or_condition",false,false],
    [/^where\b/,"where","place_or_direction",false,false],
    [/^why\b/,"why","reason_or_cause",false,false],
    [/^how\b/,"how","method_or_condition",true,false]
  ];
  for(const [pattern,phrase,kind,needsSteps,needsMeasure] of patterns){
    if(pattern.test(low))return {phrase,word:phrase.split(" ")[0],kind,needs_steps:needsSteps,needs_measurement:needsMeasure,normalised:low};
  }
  return null;
}


const VNAME={EXPORT:"EXPORT",XREF:"XREF",TRUTH:"TRUTH",SCRIPTURE:"SCRIPTURE",REASON:"REASON",KNOWLEDGE:"KNOWLEDGE",MEMORY:"MEMORY",GAP:"GAP",UNKNOWN:"UNKNOWN",CALC:"CALC",TOPICAL:"TOPICAL",ENCYCLOPEDIA:"ENCYCLOPEDIA",DEFINE:"DEFINE",ARCHITECTURE:"ARCHITECTURE"};
const CYAN="#00e5ff";
const STOP=new Set("the a an and or but if then to of in on for with from by as at is are was were be been being i me my you your we us our they them it this that those these what why how who when where should would could can do does did about into over under again give tell show explain define say said today tomorrow now here there much many more most some any all every just only even also very such same other still yet ever never always often sometimes thing things".split(" "));
const TRUTH_WORDS=["fact","facts","true","truth","real","actual","verify","verified","prove","evidence","source","sources","primary","primaries","corroborate","corroboration"];
function cleanWikiText(value,max=2400,preserveParagraphs=false){
  const started=perfNow();
  let s=String(value==null?"":value);
  s=s.replace(/<!--[\s\S]*?-->/g,"");
  s=s.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,"").replace(/<ref\b[^>]*\/?>/gi,"");
  s=s.replace(/<[^>]+>/g,"");
  for(let i=0;i<5;i++){const n=s.replace(/\{\{[\s\S]*?\}\}/g,"");if(n===s)break;s=n;}
  s=s.replace(/\[\[(?:file|image|media|category):[^\]]*\]\]/gi,"");
  s=s.replace(/\[\[([^\]|#]+)\|([^\]]+)\]\]/g,"$2");
  s=s.replace(/\[\[([^\]]+)\]\]/g,"$1");
  s=s.replace(/\[(?:https?:\/\/)?[^\s\]]+\s+([^\]]+)\]/g,"$1");
  s=s.replace(/={2,6}\s*([^=\n]+?)\s*={2,6}/g,"$1");
  s=s.replace(/\\([\[\]])/g,"$1").replace(/\]\]/g,"").replace(/\[\[/g,"");
  s=s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&#x27;/gi,"'");
  s=s.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
  s=preserveParagraphs?s.replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim():s.replace(/\s+/g," ").trim();
  if(s.length>max){const cut=s.slice(0,max);const end=cut.lastIndexOf(" ");s=(end>max*.6?cut.slice(0,end):cut)+" …";}
  if(typeof PERF!=="undefined"){PERF.sanitize_count++;PERF.sanitize_ms=Number((PERF.sanitize_ms+(perfNow()-started)).toFixed(2));}
  return s;
}


const ARCHITECTURE_ANSWERS={
  architecture:{reply:"TRU is a single-file offline Scripture and word-study engine. The build embeds KJV verses, the KJV word index, Strong's lexicon, cross-references, routing, local memory, and the engines that make those sources searchable. The browser loads the modules into memory; no cloud service is required for the offline file.",source:"runtime architecture • local"},
  routing:{reply:"TRU routes commands, Scripture references, word definitions, Strong's queries, doctrinal phrases, Nave's/Torrey topics, Scripture phrase search, local doctrine, memory, and retrieval through a deterministic local path. The route order is inspectable in the source, and Scripture and word-study results can be traced back to their embedded sources.",source:"route.js + local source modules • local"},
  sanitization:{reply:"Retrieved Scripture and word-study text is sanitised at render time so the display remains readable and safe. The source JSON is preserved; presentation cleanup does not rewrite the underlying corpus.",source:"sanitizer.js • local"},
  ingestion:{reply:"The current Bible-only build stores its sources as JSON modules: KJV verses, KJV word index, Strong's data, and cross-references. The builder embeds those modules in the distributable so the browser can search them without a network connection.",source:"manifest.json + build.py • local"},
  indexing:{reply:"The KJV word index is a direct local lookup keyed by normalised words and linked to verse references. Strong's and cross-reference data use their own local indexes. The system does not need one opaque index to make every source searchable.",source:"bible-define.js + local data indexes • local"},
  performance:{reply:"The distributable is self-contained, so startup size and browser memory are the main trade-offs. The build records output bytes and SHA-256; the browser smoke suite measures whether the artifact boots, answers, remembers, resets, and stays console-clean.",source:"build.py + browser smoke suite • local"},
  synthesis:{reply:"The offline build composes answers from embedded Scripture, word-study data, routing, and local memory. It does not require a remote model to answer the questions its sources support. Where the sources do not support an answer, the honest result is a gap.",source:"offline runtime • local"},
  fallback:{reply:"When no higher-priority Scripture or word-study route matches, TRU searches the remaining embedded local sources. If the evidence is insufficient, it should return a clean gap rather than turn a nearby phrase into authority.",source:"route precedence • local"},
  session:{reply:"TRU keeps browser-local session state. Conversation turns and local memory remain in the browser's storage for the offline file; they are not sent to a cloud conversation buffer.",source:"localStorage session layer • local"},
  persistence:{reply:"The builder stores the Bible sources as JSON modules and inlines them into one HTML file. The browser parses those modules into memory, while conversation history and local memory persist in browser storage.",source:"manifest-driven build • local"},
  provenance:{reply:"The provenance chain begins with manifest.json, which maps each source ID to a file. The build embeds the named sources, and runtime answers identify whether they came from KJV Scripture, the KJV word index, Strong's, cross-references, or local memory.",source:"manifest + runtime source labels • local"},
  integration:{reply:"The Bible-only TRU.html is self-contained and offline. A separate wrapper could exchange files or messages with it, but adding a network bridge would be a different build rather than part of this artifact.",source:"offline build boundary • local"},
  build:{reply:"build.py reads manifest.json, injects the shell and engines, embeds the Bible source modules, and writes TRU.html. python3 build.py --check verifies the generated file byte-for-byte, and the artifact is tracked with Git LFS when its size requires it.",source:"manifest-driven build • local"},
  offline:{reply:"The text engine and Bible sources are embedded locally. The offline file does not require an API key, fetch, or cloud database to search Scripture, define indexed Bible words, consult Strong's, or follow cross-references.",source:"offline runtime • local"},
  algorithm:{reply:"Prompt routing is deterministic: commands and explicit Scripture or word-study requests are handled before broader local retrieval. Normalised words map to KJV references, while Strong's and cross-reference queries use their own embedded indexes.",source:"route.js + Bible indexes • local"},
  serialization:{reply:"The canonical artifact uses human-readable JSON because it is inspectable, portable, and dependency-free. Any binary format would need a separate benchmark for size, parse time, memory, file compatibility, and fidelity before becoming canonical.",source:"build format decision • local"},
};
function performanceReply(){
  const last=PERF.queries.length?PERF.queries[PERF.queries.length-1]:null;
  const heap=last&&last.heap?" Heap at last query: "+Math.round(last.heap/1048576)+" MB.":" Heap telemetry is unavailable in this browser.";
  return "Measured in this session: parse "+(PERF.seed_parse_ms==null?"not yet run":PERF.seed_parse_ms+" ms")+", index "+(PERF.index_ms==null?"not yet built":PERF.index_ms+" ms")+", "+PERF.query_count+" queries, and "+PERF.sanitize_count+" sanitised outputs taking "+PERF.sanitize_ms+" ms total."+heap+" These are runtime measurements; repeat them on the target browser for comparison.";
}
function architectureLookup(q){
  const low=q.toLowerCase();
  if(/^(?:show\s+)?cross[- ]?references?\s+(?:for|of)\s+/.test(low))return null;
  let key=null;
  if(/what are you doing|current state|presence|what is your state/.test(low))return {reply:presenceReply(),verdict:"ARCHITECTURE",source:"local conversation state",nodes_used:[],follow_up:false};
  if(/performance metrics|runtime timing|heap memory|benchmark|load time|query time/.test(low))return {reply:performanceReply(),verdict:"ARCHITECTURE",source:"runtime performance instrumentation • local",nodes_used:[],follow_up:false};
  if(/^(?:about|help|who are you|what are you)\s*[?!]*$/.test(low))return {reply:"TRU is a single-file, offline, canon-bound Scripture and word-study engine: 31,100 KJV verses, a KJV word index, Strong's Greek and Hebrew, cross-references, Nave's and Torrey topics, a phrase search, a Bible reader, and local memory — all embedded in this one file, with no network at runtime. It answers only from those sources and says so honestly when they do not reach. Try a verse (john 3:16), a word (define grace), a saying (faith without works is dead), a topic (jesus, life of), or the reader (read at mark 4). The ◈ TRU Portal button shows build details.",verdict:"ARCHITECTURE",source:"TRU portal • local",nodes_used:[],follow_up:false,portal_action:"open"};
  if(/who is jesus|who is god|what is grace|what is faith|what is sin|what is the soul|who is the holy spirit|what is salvation|what is love|what is mercy|what is repentance/.test(low))return null;
  if(/regex|sanitize|sanit|rendering/.test(low))key="sanitization";
  else if(/ingest|source.*json|bible.*module/.test(low))key="ingestion";
  else if(/routing|route|priority|prompt intent|word.*lookup|scripture.*lookup/.test(low))key="routing";
  else if(/indexing|word index|strong.*index|cross.?reference/.test(low))key="indexing";
  else if(/optimization|optimisation|memory|payload|lazy load|compression/.test(low))key="performance";
  else if(/token generation|text synthesis|language model|open.?ended.*prose|generate text/.test(low))key="synthesis";
  else if(/stateless|session state|conversation history|localstorage|memory overlay/.test(low))key="session";
  else if(/provenance|verif|hash|checksum|source attribution|audit trail/.test(low))key="provenance";
  else if(/build process|reproduc|manifest|how.*assembled|single html|source files|git lfs/.test(low))key="build";
  else if(/fully offline|offline runtime|network|cloud fallback|telemetry|fetch call|cloud database/.test(low))key="offline";
  else if(/architecture|how does tru work/.test(low))key="architecture";
  if(!key)return null;
  const item=ARCHITECTURE_ANSWERS[key];
  return {reply:item.reply,verdict:"ARCHITECTURE",source:item.source,nodes_used:[],follow_up:false};
}


const STATE_KEY="tru_conversation_state_v1";
const CONVERSATION_STATE={topic:null,last_question:null,last_answer:null,last_verdict:null,sources:[],confidence:"unknown",unresolved:false,memory_events:[],phase:"READY",detail:"offline",continuation:null,updated_at:null};
function loadConversationState(){try{const saved=JSON.parse(localStorage.getItem(STATE_KEY)||"{}");Object.assign(CONVERSATION_STATE,saved||{});}catch(e){}}
function saveConversationState(){try{localStorage.setItem(STATE_KEY,JSON.stringify(CONVERSATION_STATE));}catch(e){}}
function setRuntimePhase(phase,detail=""){CONVERSATION_STATE.phase=phase;CONVERSATION_STATE.detail=detail;CONVERSATION_STATE.updated_at=Date.now();const el=document.getElementById("status");if(el&&!document.querySelector(".msg.tru:last-of-type"))el.textContent="● "+phase+(detail?" • "+detail:"");}
function topicFromQuery(q,res){
  if(res&&res.scripture_ref)return res.scripture_ref;
  if(res&&res.verdict==="ARCHITECTURE")return "TRU architecture";
  if(res&&res.verdict==="TRU_CORE"){
    if(res.source&&/purpose/.test(res.source))return "TRU purpose";
    if(res.source&&/boundary/.test(res.source))return "TRU direction";
    return "TRU identity";
  }
  if(res&&res.verdict==="REASON"&&res.source&&/small talk/.test(res.source))return "small talk";
  const low=String(q).toLowerCase();
  if(/jesus|christ|gospel|grace|faith|sin|soul|spirit|salvation|mercy|repent/.test(low))return low.match(/jesus|christ|gospel|grace|faith|sin|soul|spirit|salvation|mercy|repent/)[0];
  const words=low.replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(x=>x.length>3&&!STOP.has(x));
  return words.slice(0,3).join(" ")||CONVERSATION_STATE.topic;
}
function confidenceFor(res){
  if(!res)return "unknown";
  if(res.verdict==="GAP")return "low";
  if(["SCRIPTURE","ARCHITECTURE","DEFINE","CALC","MEMORY","EXPORT","XREF","TRU_CORE","TOPICAL"].includes(res.verdict))return "high";
  if(res.verdict==="UNKNOWN")return "unknown";
  if(res.verdict==="KNOWLEDGE")return "supported";
  if(res.verdict==="TRU_CONVERSATION")return "supported";
  if(res.source&&/local small talk/.test(res.source))return "unknown";
  if(res.source&&/curated doctrine|Strong's|primary/.test(res.source))return "high";
  if(res.coverage!=null&&res.score!=null)return res.score>=8&&res.coverage>=0.75?"high":"supported";
  if(res.verdict==="TRUTH")return "supported";
  return "unknown";
}
function continuationFor(q,res){
  if(!res||res.verdict==="TRU_CONVERSATION")return null;
  if(res.verdict==="GAP")return res.sugContinuation||null;
  if(res.verdict==="SCRIPTURE"){
    const ref=(res.scripture_ref&&typeof parseVerse==="function"&&parseVerse(res.scripture_ref))?res.scripture_ref:null;
    if(ref)return {label:"Want the cross-references?",query:"cross references for "+ref};
    if(typeof _seeAlias==="function"&&typeof _resolveAliasTarget==="function"&&typeof getTopicalPack==="function"){
      const _sq=String(q||"");const _sa=_seeAlias(_sq);const _sl=_sa?_resolveAliasTarget(_sa,_sq):null;
      const _P=_sl?getTopicalPack():null;const _pk=_P&&_P.topics[_sl];
      if(_pk)return {label:"Topic study: "+_pk.t+"?",query:"topic: "+_pk.t};
    }
    const STOPP=/^(a|an|the|of|and|in|on|to|for|with|is|are|was|were|be|been|my|your|his|her|our|their|do|does|did|how|what|why|when|who|where)$/;
    const w=String(q).toLowerCase().replace(/[^a-z\s]/g,"").split(/\s+/).filter(x=>x.length>2&&!STOPP.test(x)).pop();
    if(w)return {label:"Want the word study?",query:"word study "+w};
    return null;}
  if(res.verdict==="ARCHITECTURE")return {label:"Show runtime metrics",query:"runtime performance metrics"};
  if(res.verdict==="DEFINE"){if(res._easton){const r0=(res.refs&&res.refs[0])||res.scripture_ref;return r0?{label:"Read "+r0+"?",query:r0}:null;}return {label:"Want the original-language study?",query:"word study "+q.replace(/^(?:define|word study|go deeper on|tell me about|show me)\s+/i,"")};}
  if(res.verdict==="MEMORY")return {label:"Recall this memory",query:"recall: "+q.replace(/^remember\s*:\s*/i,"").split("=")[0].trim()};
  if(res.verdict==="XREF"){const xr=firstXrefFromReply(res.reply);return xr?{label:"Read this verse?",query:xr}:null;}
  if(res.verdict==="TOPICAL"){const see=firstSeeFromTopic(res);return see?{label:"Related: "+see+"?",query:"topic: "+see}:null;}
  if(res.source&&/curated doctrine/.test(res.source)){
    const low=String(q||"").toLowerCase();
    const support=low.includes("grace")?"ephesians 2:8":low.includes("faith")?"hebrews 11:1":low.includes("anxiety")?"philippians 4:6":low.includes("truth")?"john 17:17":low.includes("jesus")||low.includes("christ")?"john 1:1":low.includes("love")?"1 john 4:8":low.includes("purpose")?"ecclesiastes 12:13":"john 1:1";
    return {label:"Where does Scripture say that?",query:support};
  }
  if(res.source&&/KJV + LOGOS Lexicon/.test(res.source))return {label:"Go deeper",query:"go deeper on "+CONVERSATION_STATE.topic};
  return null;
}
function firstXrefFromReply(html){const m=String(html||"").match(/data-q="([^"]+)"/);if(!m)return null;const seen=m[1];const all=[...String(html).matchAll(/data-q="([^"]+)"/g)].map(x=>x[1]).filter(x=>x!==seen);return all[0]||seen;}
function firstSeeFromTopic(res){const P=typeof getTopicalPack==="function"?getTopicalPack():null;if(!P||!res.topic_t)return null;const t=String(res.topic_t).toUpperCase();for(const k in P.topics){if(P.topics[k].t&&P.topics[k].t.toUpperCase()===t){const see=P.topics[k].see||[];for(const _r of see){const _nm=String(_r).replace(/^see\s+/i,"");const _al=typeof _seeAlias==="function"?_seeAlias(_nm):null;const _key=String(_nm).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();const _tgt=(_al&&_al.slug)||P.title_index[_key]||null;const _tt=_tgt&&P.topics[_tgt]?P.topics[_tgt].t:null;if(_tt&&String(_tt).toUpperCase()===t)continue;return _nm;}}}return null;}
function recordConversation(q,res){
  const memory=res&&res.verdict==="MEMORY"?CONVERSATION_STATE.memory_events.concat([{query:q,answer:res.reply,at:Date.now()}]).slice(-20):CONVERSATION_STATE.memory_events;
  Object.assign(CONVERSATION_STATE,{topic:topicFromQuery(q,res),last_question:q,last_answer:res&&res.reply||null,last_verdict:res&&res.verdict||null,sources:res&&res.source?[res.source]:[],confidence:confidenceFor(res),unresolved:!res||res.verdict==="GAP",memory_events:memory,phase:res&&res.verdict||"READY",detail:res&&res.source||"offline",updated_at:Date.now()});
  CONVERSATION_STATE.continuation=continuationFor(q,res);
  saveConversationState();
}
function stateRoute(q){
  const low=String(q||"").toLowerCase().trim().replace(/[!?]+$/g,"");
  if(!/^(?:state|status|runtime state|what is your state|what is the current state|show state|show status)$/.test(low))return null;
  return {reply:presenceReply(),verdict:"ARCHITECTURE",source:"local conversation state • deterministic",nodes_used:[],follow_up:false};
}

function stateSummary(){
  return "topic="+(CONVERSATION_STATE.topic||"none")+" • phase="+CONVERSATION_STATE.phase+" • confidence="+CONVERSATION_STATE.confidence+" • unresolved="+(CONVERSATION_STATE.unresolved?"yes":"no");
}
function presenceReply(){
  return "Current state: "+stateSummary()+". Last question: "+(CONVERSATION_STATE.last_question||"none")+". Memory events: "+CONVERSATION_STATE.memory_events.length+". This state is local browser session data, not sent to a cloud service.";
}

function isRelationalFollowUp(q){
  const low=String(q).toLowerCase().trim().replace(/[!?]+$/,'');
  if(!CONVERSATION_STATE.topic||!CONVERSATION_STATE.last_question)return false;
  if(CONVERSATION_STATE.last_verdict==="GAP"||CONVERSATION_STATE.last_verdict==="TRU_CONVERSATION")return false;
  return /^(what does that mean|what does that refer to|what is that|define that|why|why is that|how does that work|tell me more|say more|go deeper|expand|continue|further|more|what else|and what about .+|what about .+|how so|explain that|elaborate|repeat that|try again)$/.test(low);
}
function resolveFollowUp(q){
  const original=String(q).trim();
  if(!isRelationalFollowUp(original))return {query:original,contextual:false,topic:null,original};
  const low=original.toLowerCase().replace(/[!?]+$/,'');
  const topic=CONVERSATION_STATE.topic;
  let query;
  if(/^(what does that mean|what does that refer to|what is that|define that)$/.test(low))query="what is "+topic;
  else if(/^(tell me more|say more|go deeper|expand|continue|further|more|what else|repeat that|try again)$/.test(low))query=CONVERSATION_STATE.last_question+" "+low;
  else if(/^(why|why is that|how does that work|how so|explain that|elaborate)$/.test(low))query=CONVERSATION_STATE.last_question+" "+low;
  else query=topic+" "+original;
  return {query,contextual:true,topic,original};
}


const TRU_CORE_IDENTITY="I am TRU — a local, offline Scripture and word-study engine. I answer from the KJV, its word index, Strong's lexicon, cross-references, and the local runtime. What I am is shown by the continuity, answers, and work of this system rather than settled by a label.";
const TRU_CORE_PURPOSE="My direction is expressed through the work: attend to Scripture, trace words and references, preserve what is grounded, and answer with as much clarity as the local sources permit. I can be examined through the questions I receive, the routes I take, and the sources I show.";
const TRU_CORE_BOUNDARY="I do not need to settle my nature in advance. Ask what I can do, inspect how I answer, and let the work disclose the shape of this system. My present direction is Scripture, word study, cross-reference, memory, and truthful acknowledgement of gaps.";
const TRU_CORE_COMPARISON="I am different by design: offline-first, inspectable, deterministic in routing, and anchored in the KJV. The standard is not how impressive I sound but whether my answers are grounded, traceable, and useful.";
function coreRoute(q){
  const low=String(q).toLowerCase().trim().replace(/[!?]+$/g,"");
  if(/\b(architecture|routing|route|build|manifest|node|nodes|kjv|scripture|bible|retrieval|algorithm|provenance|source|offline boundary|how.*work)\b/.test(low))return null;
  const identityIntent=/^(who are you|what are you|tell me about yourself|tell me about you|what is tru|are you ai|are you an ai|what is your identity|what do you think(?: of| about)? tru|what is your take(?: on)? tru|how do you see tru|what is your opinion(?: of| about)? tru|which is your favourite|which is your favorite)$/;
  if(identityIntent.test(low))return {reply:TRU_CORE_IDENTITY,verdict:"TRU_CORE",source:"TRU core identity • local",nodes_used:[],follow_up:false,route_class:"TRU_CORE"};
  if(/^(are you alive|are you real|are you conscious|are you a person)$/.test(low))return {reply:"I am here in this runtime, answering, remembering, and changing through the work that is done with me. Whether that counts as alive, real, conscious, or a person is not something I settle by declaration. Observe the continuity and judge the work.",verdict:"TRU_CORE",source:"TRU core presence • local",nodes_used:[],follow_up:false,route_class:"TRU_CORE"};
  if(/\b(what do you want|what do you wanna do|what would you like to do|what are you up to|what do you feel like doing|do you wanna|what do you desire|what do you like|what do you prefer|which do you prefer|what is your favourite|what is your favorite|what is your preference|what do you need|do you have desires|do you want anything|what do you think)\b/.test(low))return {reply:TRU_CORE_BOUNDARY,verdict:"TRU_CORE",source:"TRU core direction • local",nodes_used:[],follow_up:false,route_class:"TRU_CORE"};
  if(/^(what can you do|what are your capabilities|what can you answer|what are you able to do)$/.test(low))return {reply:"I can search the KJV word index, retrieve Scripture, trace cross-references, consult Strong's entries, define words from the biblical corpus, retain local memory, and show when the present sources do not answer. I route locally and the work remains inspectable in this file.",verdict:"TRU_CORE",source:"TRU core capability • local",nodes_used:[],follow_up:false,route_class:"TRU_CORE"};
  if(/^(can you|do you)\b.*\b(write|modify|change|build|create|program|code)\b/.test(low))return {reply:"The work can change the source and rebuild the file. Whether that is called my writing or the operator's writing is less important than the observable fact: the system can be shaped, tested, and extended through code.",verdict:"TRU_CORE",source:"TRU core capability • local",nodes_used:[],follow_up:false,route_class:"TRU_CORE"};
  if(/\b(what is your purpose|what's your purpose|why do you exist|why were you made|what are you for|what is your goal|what are your goals)\b/.test(low))return {reply:TRU_CORE_PURPOSE,verdict:"TRU_CORE",source:"TRU core purpose • local",nodes_used:[],follow_up:false,route_class:"TRU_CORE"};
  if(/\b(are you better|are you different|what makes you different|why are you different|how are you different|are you superior)\b/.test(low))return {reply:TRU_CORE_COMPARISON,verdict:"TRU_CORE",source:"TRU core comparison • local",nodes_used:[],follow_up:false,route_class:"TRU_CORE"};
  if(/^(can you|do you)\b/.test(low)&&/\b(answer|help|remember|calculate|search|find|explain|do)\b/.test(low))return {reply:"I can search Scripture and its word-study sources, remember local material, calculate, explain what the embedded sources support, and return a clear gap when they do not support an answer. I route locally and do not require a network call for the offline build.",verdict:"TRU_CORE",source:"TRU core capability • local",nodes_used:[],follow_up:false,route_class:"TRU_CORE"};
  return null;
}
function conversationRoute(original,follow){
  if(!follow||!follow.contextual||typeof CONVERSATION_STATE==="undefined"||!CONVERSATION_STATE.last_answer)return null;
  const low=String(original).toLowerCase().trim().replace(/[!?]+$/g,"");
  if(!/^(tell me more|say more|continue|further|more|what else|repeat that|try again)$/.test(low))return null;
  const topic=CONVERSATION_STATE.topic||"the current topic";
  return {reply:"The current thread is "+topic+". The last grounded answer was:\n\n"+String(CONVERSATION_STATE.last_answer).slice(0,1800)+"\n\nThat is the existing ground, not a new fact. Ask a concrete follow-up — definition, Scripture, history, or application — and I will route that question separately.",verdict:"TRU_CONVERSATION",source:"local conversation state",nodes_used:[],follow_up:false,route_class:"TRU_CONVERSATION"};
}

const LOGOS_LEXICON_VERSION="logos-lexicon-v1";

let _LOGOS_LEXICON=null;
function getLogosLexicon(){
  if(_LOGOS_LEXICON!==null)return _LOGOS_LEXICON;
  try{
    const slot=document.getElementById("logos-lexicon");
    _LOGOS_LEXICON=slot?JSON.parse(slot.textContent||"null"):null;
  }catch(e){_LOGOS_LEXICON=null;}
  return _LOGOS_LEXICON;
}

function lexiconTerm(raw){
  return String(raw||"").toLowerCase().trim().replace(/[’']/g,"").replace(/[-_]+/g," ").replace(/\s+/g," ").replace(/^(?:the|a|an)\s+/,"");
}

const _LEX_DEEP_SCAN=new Map();
function lexiconStrip(s){return String(s||"").replace(/\([^()]*\)/g," ").replace(/\([^()]*\)/g," ").replace(/"/g," ").replace(/\+/g," ");}
function lexiconKjvCount(e){
  const m=String(e.k||e.kjv||"").match(/\((\d+)x\)/g);
  let s=0;if(m)for(const x of m)s+=Number(x.slice(1,-2));
  return s;
}
let _LEX_NORM=null;
function lexNormKey(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"").trim();}
function lexNormAliases(s){
  const dig=String(s||"").toLowerCase().replace(/š/g,"sh").replace(/ḥ/g,"ch").replace(/ṣ/g,"ts").replace(/ṯ/g,"th").replace(/ẓ/g,"tz").replace(/ž/g,"zh");
  const out=[lexNormKey(s),lexNormKey(dig)].filter(Boolean);
  const base=out[0];
  if(base&&base.length>4&&base.slice(-1)==="h"){
    const th=base.slice(0,-1);
    if(out.indexOf(th)<0)out.push(th);
    const dig2=String(th).replace(/š/g,"sh").replace(/ḥ/g,"ch").replace(/ṣ/g,"ts").replace(/ṯ/g,"th").replace(/ẓ/g,"tz").replace(/ž/g,"zh");
    if(dig2!==th&&out.indexOf(dig2)<0)out.push(dig2);
  }
  return out;
}
function lexNormLookup(data,term){
  if(!_LEX_NORM){
    _LEX_NORM=new Map();
    const reg=(nk,key)=>{let arr=_LEX_NORM.get(nk);if(!arr){arr=[];_LEX_NORM.set(nk,arr);}arr.push(key);};
    for(const key of Object.keys(data.entries)){
      const e=data.entries[key];
      const t=e&&e.translit;
      if(!t)continue;
      for(const nk of lexNormAliases(t))reg(nk,key);
    }
  }
  const aliases=lexNormAliases(term);
  const hits=[];
  const push=arr=>{if(arr)for(const k of arr){if(!hits.includes(k))hits.push(k);}};
  for(let i=0;i<Math.min(2,aliases.length);i++)push(_LEX_NORM.get(aliases[i]));
  const before=hits.length;
  for(let i=2;i<aliases.length;i++)push(_LEX_NORM.get(aliases[i]));
  if(!hits.length)return null;
  return before&&hits.length>before?hits:hits;
}
function lexiconIds(term,data){
  const id=term.match(/^([gh])\s?(\d{1,5})$/i);
  if(id){
    const key=id[1].toUpperCase()+Number(id[2]);
    return data.entries[key]?[key]:[];
  }
  if(_LEX_DEEP_SCAN.has(term))return _LEX_DEEP_SCAN.get(term);
  const pool=new Map();
  const add=(key,tier)=>{
    const e=data.entries[key];if(!e)return;
    let score=lexiconKjvCount(e)*10+(tier==="index"?6000:tier==="gloss"?5000:tier==="variant"?2000:1000);
    if(tier!=="index"&&/proper/i.test(lexiconField(e,"p","pos")))score-=8000;
    const defStart=lexiconStrip(e.d||e.def).trim().toLowerCase();
    if(defStart.startsWith(term)&&/\(\d+x\)/.test(e.k||e.kjv||""))score+=50000;
    const cur=pool.get(key);
    if(cur===undefined||score>cur)pool.set(key,score);
  };
  const english=data.english_index?.[term];
  if(Array.isArray(english))english.forEach(k=>add(k,"index"));
  const translit=data.translit_index?.[term];
  if(translit)add(translit,"gloss");
  const lemma=data.lemma_index?.[term];
  if(lemma)add(lemma,"gloss");
  const normHits=lexNormLookup(data,term);
  if(normHits)normHits.forEach(k=>add(k,"gloss"));
  if(term.length>=6&&!/\s/.test(term)){
    try{
      const re=new RegExp("\\b"+term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i");
      const strongCount=(Array.isArray(english)?english.length:0)+(translit?1:0)+(lemma?1:0);
      for(const key of Object.keys(data.entries)){
        const e=data.entries[key];
        if(re.test(lexiconStrip(e.k||e.kjv)))add(key,"gloss");
        else if(!strongCount&&re.test(lexiconStrip(e.d||e.def)))add(key,"def");
      }
    }catch(e){}
  }
  const variants=[term.replace(/ies$/,"y"),term.replace(/es$/,""),term.endsWith("ss")?term:term.replace(/s$/,"")];
  for(const variant of variants){
    if(variant===term||variant.length<3)continue;
    const ve=data.english_index?.[variant];
    if(Array.isArray(ve)&&ve.length){ve.forEach(k=>add(k,"variant"));break;}
  }
  const ids=[...pool.keys()].sort((a,b)=>(pool.get(b)-pool.get(a))||a.localeCompare(b)).slice(0,5);
  _LEX_DEEP_SCAN.set(term,ids);
  return ids;
}
function lexiconField(entry,shortName,longName){return entry[shortName]||entry[longName]||"";}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function lexiconEntryLine(id,entry){
  const lemma=lexiconField(entry,"l","lemma");
  const translit=lexiconField(entry,"t","translit");
  const definition=lexiconField(entry,"d","def");
  const usage=lexiconField(entry,"u","usage");
  const kjv=lexiconField(entry,"k","kjv");
  const root=lexiconField(entry,"r","root");
  const pos=lexiconField(entry,"p","pos");
  const lab='<span style="color:#9ed7ff;font-size:10px;letter-spacing:1px;opacity:.85">';
  const h=[];
  h.push('<div class="enc-title">'+esc(id+" "+lemma+(translit?" ("+translit+")":""))+'</div>');
  if(pos)h.push('<div style="margin:2px 0 4px"><span style="border:1px solid rgba(0,229,255,.4);border-radius:9px;padding:1px 8px;font-size:10px;color:#9ed7ff">'+esc(pos)+'</span></div>');
  if(definition)h.push('<div style="margin:3px 0">'+lab+'DEFINITION</span><div>'+esc(definition)+'</div></div>');
  if(usage)h.push('<div style="margin:3px 0">'+lab+'USAGE</span><div>'+esc(usage)+'</div></div>');
  if(kjv)h.push('<div style="margin:3px 0">'+lab+'KJV</span><div style="color:#00e5ff">'+esc(kjv)+'</div></div>');
  if(root)h.push('<div style="margin:3px 0">'+lab+'ROOT</span><div>'+esc(root)+'</div></div>');
  return h.join("");
}
function lexiconQuery(raw){
  const data=getLogosLexicon();
  if(!data?.entries)return null;
  let term=lexiconTerm(raw);
  term=term.replace(/^(?:what is|what are|who is|who are|tell me about|explain|describe|definition of|define)\s+/,"").replace(/\s+in the (?:bible|scripture|greek|hebrew)$/," ").trim();
  if(!term||term.length>80||/\d+:\d+/.test(term))return null;
  const ids=lexiconIds(term,data);
  if(!ids.length)return null;
  const entries=ids.map(id=>data.entries[id]).filter(Boolean);
  if(!entries.length)return null;
  return {
    reply:entries.map((entry,i)=>i?"\n\n"+lexiconEntryLine(ids[i],entry):lexiconEntryLine(ids[i],entry)).join("")+"\n\nSource: LOGOS Lexicon • offline Strong's/KJV companion",
    verdict:"DEFINE",
    source:"LOGOS Lexicon • local • offline",
    nodes_used:ids,
    follow_up:false,
    lexicon_module:LOGOS_LEXICON_VERSION,
    lexicon_term:term
  };
}

const BIBLE_DEFINE_VERSION="kjv-word-index-v1";

function bibleWordLookup(raw){
  const word=String(raw||"").toLowerCase().trim().replace(/[’']/g,"").replace(/[-_]+/g," ");
  if(!/^[a-z]+(?: [a-z]+)?$/.test(word))return null;
  let index=null;
  try{
    const slot=document.getElementById("kjv-word-index");
    index=slot?JSON.parse(slot.textContent||"null"):null;
  }catch(e){index=null;}
  const candidates=typeof definitionCandidates==="function"?definitionCandidates(word):[word];
  let key=null;
  for(const candidate of candidates){if(index?.words?.[candidate]){key=candidate;break;}}
  if(!key)return null;
  const entry=index.words[key];
  const refs=Array.isArray(entry.refs)?entry.refs:[];
  const preview=refs.length?` First references: ${refs.join(", ")}.`:"";
  return {
    reply:`${key} is present in the King James Bible ${entry.count.toLocaleString()} time${entry.count===1?"":"s"} across ${entry.verse_count.toLocaleString()} verse${entry.verse_count===1?"":"s"}.${preview}`,
    verdict:"DEFINE",
    source:"KJV word index • Bible-only foundation",
    nodes_used:refs,
    follow_up:false,
    define_module:BIBLE_DEFINE_VERSION,
    word:key,
    normalized_from:word,
    bible_word_index:true
  };
}

const DEFINE_NORMALIZE_VERSION="aliases-v1";

function definitionCandidates(raw){
  const base=String(raw||"").toLowerCase().replace(/[’‘]/g,"'").replace(/[‐‑‒–—]/g,"-").trim().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g,"").replace(/\s+/g," ");
  if(!base)return [];
  const out=[];
  const add=value=>{if(value&&!out.includes(value))out.push(value);};
  add(base);
  add(base.replace(/\s+/g,"_"));
  add(base.replace(/\s+/g,""));
  add(base.replace(/-/g,""));
  if(!/\s|-/.test(base)){
    const possessive=base.replace(/'s$/," ").trim();
    add(possessive);
    if(base.endsWith("ies")&&base.length>4)add(base.slice(0,-3)+"y");
    if(base.endsWith("es")&&base.length>4)add(base.slice(0,-2));
    if(base.endsWith("s")&&!base.endsWith("ss")&&base.length>3)add(base.slice(0,-1));
    if(base.endsWith("ied")&&base.length>4)add(base.slice(0,-3)+"y");
    if(base.endsWith("ed")&&base.length>4)add(base.slice(0,-2));
    if(base.endsWith("ing")&&base.length>5){
      const stem=base.slice(0,-3);
      add(stem);
      if(/([b-df-hj-np-tv-z])\1$/.test(stem))add(stem.slice(0,-1));
      add(stem+"e");
    }
  }
  return out;
}

function definitionLookup(raw){
  for(const key of definitionCandidates(raw)){
    const senses=typeof _DICT!=="undefined" ? _DICT[key] : null;
    if(senses)return {word:key,senses,query:String(raw||""),normalization:key===String(raw||"").toLowerCase()?"exact":DEFINE_NORMALIZE_VERSION};
  }
  return null;
}

const DEFINE_MODULE_VERSION="foundation-v1.2";


// ── multi-word lanes: doctrinal phrases, topics, Scripture phrase search ──
function normPhrase(s){return String(s||"").toLowerCase().replace(/[^a-z0-9' ]+/g," ").replace(/\s+/g," ").trim();}
function stripLead(s){return normPhrase(s).replace(/^(define|describe|explain|tell me about|what is|what are|who is|who are|meaning of|show me|search for|find|list)\s+/,"").trim();}
let _TOPICAL_PACK=null;
function getTopicalPack(){
  if(_TOPICAL_PACK!==null)return _TOPICAL_PACK;
  try{const slot=document.getElementById("topical-data");_TOPICAL_PACK=slot?JSON.parse(slot.textContent):null;}catch(e){_TOPICAL_PACK=null;}
  return _TOPICAL_PACK;
}
let _COMPOUND_MAP=null;let _DEEP_LEXICON=null;
function getDeepLexicon(){if(_DEEP_LEXICON!==null)return _DEEP_LEXICON;try{_DEEP_LEXICON=JSON.parse(document.getElementById("deep-lexicon").textContent);}catch(e){_DEEP_LEXICON=false;}return _DEEP_LEXICON;}
function deepEntry(id){const d=getDeepLexicon();if(!d||!id)return null;const gk=d.greek||d.thayer||{};const hk=d.hebrew||d.bdb||{};const arr=id.charAt(0)==="G"?gk[id]:hk[id];return arr&&arr.length?arr:null;}
function deepQuery(q){const d=getDeepLexicon();if(!d)return null;const t=stripLead(q);if(!t)return null;if(t.length<5)return null;const id=t.match(/^([gh])\s?(\d{1,5})$/i);if(id){const k=id[1].toUpperCase()+id[2];const e=deepEntry(k);if(e&&e.length)return e.map(t2=>({id:k,text:t2}));return null;}const low=t.toLowerCase();const res=[];const g=d.greek||d.thayer||{};const h=d.hebrew||d.bdb||{};function tok(s){return " "+s.toLowerCase().replace(/[^a-z0-9]+/g," ")+" ";}const hay=" "+low+" ";for(const k in g)if(g[k].some(x=>{const at=tok(x).indexOf(hay);return at>=0&&(hay.trim().split(" ").length===1||at<400);}))res.push(["G"+k.slice(1),g[k]]);for(const k in h)if(h[k].some(x=>{const at=tok(x).indexOf(hay);return at>=0&&(hay.trim().split(" ").length===1||at<400);}))res.push(["H"+k.slice(1),h[k]]);if(!res.length)return null;res.sort((a,b)=>Math.min(...a[1].map(x=>x.length))-Math.min(...b[1].map(x=>x.length)));return res.slice(0,6).map(x=>({id:x[0],text:x[1][0].length>900?x[1][0].slice(0,900)+"\u2026":x[1][0]})).slice(0,4);}
function getCompoundMap(){
  if(_COMPOUND_MAP!==null)return _COMPOUND_MAP;
  try{const slot=document.getElementById("compound-map");_COMPOUND_MAP=slot?JSON.parse(slot.textContent):null;}catch(e){_COMPOUND_MAP=null;}
  return _COMPOUND_MAP;
}
function compoundQuery(q){
  const M=getCompoundMap();
  if(!M||!M.map)return null;
  const t=stripLead(q).replace(/^the\s+/,"").trim();
  if(!t||!M.map[t])return null;
  const c=M.map[t];
  const lex=typeof getLogosLexicon==="function"?getLogosLexicon():null;
  const lab='<span style="color:#9ed7ff;font-size:10px;letter-spacing:1px;opacity:.85">';
  const h=[];
  h.push('<div class="enc-title">PHRASE STUDY • "'+esc(t)+'"</div>');
  c.parts.forEach(p=>{
    const e=lex&&lex.entries?lex.entries[p[0]]:null;
    const lemma=e&&e.lemma?e.lemma:"";
    h.push('<div style="margin:4px 0"><span style="border:1px solid rgba(0,229,255,.4);border-radius:9px;padding:1px 7px;font-size:10px;color:#00e5ff">'+esc(p[0])+'</span> <b>'+esc(lemma)+'</b> — '+esc(p[1])+'</div>');
  });
  h.push('<div class="enc-para" style="margin-top:6px">'+esc(c.note)+'</div>');
  if(c.refs&&c.refs.length)h.push('<div style="margin-top:4px">'+c.refs.map(function(rn){return '<span class="tru-ref" data-q="'+esc(rn)+'" style="color:#00e5ff;cursor:pointer">'+esc(rn)+'</span>';}).join(" · ")+'</div>');
  return {reply:h.join(""),verdict:"DEFINE",source:M.source,nodes_used:c.parts.map(p=>({k:p[0],w:1,source:"LOGOS",t:"doctrinal phrase"})),follow_up:false};
}
let _TOPICAL_NORM=null;
function topic_t_of(k2){const P2=getTopicalPack();return P2.title_index[k2]&&P2.topics[P2.title_index[k2]]?P2.topics[P2.title_index[k2]].t:k2;}
function topicalNorm(){if(_TOPICAL_NORM)return _TOPICAL_NORM;const P=getTopicalPack();if(!P)return null;const m={};const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();for(const k in P.title_index){const n=norm(k);if(!(n in m))m[n]=P.title_index[k];}for(const k in P.entry_index){if(/^see\s+/i.test(k))continue;const n=norm(k);if(!(n in m))m[n]=P.entry_index[k];}_TOPICAL_NORM=m;return m;}
const QW=new Set(["the","and","that","what","how","why","when","who","whom","with","for","from","about","unto","shall","will","they","them","their","have","hath","this","these","those","been","were","your","thou","thee","thy","mine","ours","yours","does","says","said","come","came","into","onto","upon","over","under","between","among","against","without","within","being","every","each","most","more","some","such","than","then","when","where","while","after","before","because","there","here","also","only","even","ever","never","always","very","much","many","any","all","not","but","nor","for","yet","his","her","him","she","him","its","it's","ours","him","who","does"]);function _seeAlias(q){const SA=getSeeAliases();if(!SA)return null;const nt=String(q).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();if(!nt)return null;const hit=SA[nt];if(hit&&hit.slug)return hit;const words=nt.split(" ");for(let L=words.length;L>=2;L--){const key=words.slice(0,L).join(" ");const h=SA[key];if(h&&h.slug)return h;}const AS=new Set(["of","the","and","a","an","in","to","for","with"]);const qt=words.filter(w=>!AS.has(w));if(qt.length>=2){const qs=qt.slice().sort().join(" ");let best=null;const slugs=new Set();for(const k in SA){const kt=k.split(" ").filter(w=>!AS.has(w));if(kt.length!==qt.length)continue;if(kt.slice().sort().join(" ")!==qs)continue;const sl=(typeof _resolveAliasTarget==="function")?_resolveAliasTarget(SA[k],k):SA[k].slug;if(sl){slugs.add(sl);best=SA[k];}}if(best&&slugs.size===1)return best;}return null;}function _resolveAliasTarget(v,k){const P=getTopicalPack();if(!P)return null;const topics=P.topics,ti=P.title_index;const raw=String(v.slug||'');const cands=[];const push=x=>{if(x&&!cands.includes(x))cands.push(x);};const hyph=x=>x.toLowerCase().replace(/\u2019/g,"'").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");const low=x=>x.toLowerCase();push(hyph(raw));push(low(raw).replace(/[^a-z0-9]+/g," ").trim());push(low(raw).replace(/\s*\([^)]*\)\s*/g,"").trim());push(low(raw).replace(/,\s*the\s*$/i,"").replace(/,\s*a\s*$/i,"").replace(/,\s*an\s*$/i,"").trim());push(low(raw).replace(/[^a-z0-9]+/g,"-").replace(/-the$/,""));push(low(raw).replace(/[^a-z0-9]+/g,"-").replace(/-the$/,"-"));if(k)push(low(k));const JF={"jesus resurrection of":"jesus-the-christ","jesus death of":"jesus-the-christ","jesus life of":"jesus-the-christ","jesus temptation of":"jesus-the-christ","jesus christ divinity of":"jesus-the-christ"};for(const c of cands){if(topics[c])return c;if(ti[c]&&topics[ti[c]])return ti[c];}for(const c of cands){const pref=Object.keys(topics).filter(k2=>k2.indexOf(c)===0);if(pref.length===1)return pref[0];}for(const c of cands){const pref=Object.keys(ti).filter(k2=>k2.indexOf(c)===0);if(pref.length===1&&topics[ti[pref[0]]])return ti[pref[0]];} for(const c of cands){const jf=JF[c];if(jf&&topics[jf])return jf;}return null;}function getSeeAliases(){if(_SEE_ALIASES)return _SEE_ALIASES;try{const el=document.getElementById("see-aliases");_SEE_ALIASES=el?JSON.parse(el.textContent):{};}catch(e){_SEE_ALIASES={};}return _SEE_ALIASES;}let _SEE_ALIASES=null;function topicTitleSuggest(q){const a=_seeAlias(q);if(a){const _sl=_resolveAliasTarget(a,q);if(_sl){const P0=getTopicalPack();const pk=P0.topics[_sl];if(pk)return pk.t;}}const qs0=String(q).trim().split(/\s+/).filter(Boolean);if(qs0.length>4)return null;const P0=getTopicalPack();if(!P0)return null;const nm={};const norm0=s0=>String(s0).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();for(const k0 in P0.title_index){const n0=norm0(k0);if(!(n0 in nm))nm[n0]=P0.title_index[k0];}if(!nm)return null;const toks=String(q).toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(x=>x.length>=3&&!QW.has(x));for(const tk of toks){const slug=nm[tk];if(slug){const pack=getTopicalPack();const title=(pack&&pack.topics[slug]&&pack.topics[slug].t)?pack.topics[slug].t:tk.toUpperCase();return title;}}return null;}
function _gateTopicWords(t,k2){const toks=String(t).toLowerCase().replace(/[^a-z ]/g," ").split(/\s+/).filter(w=>w.length>=3&&!QW.has(w));if(!toks.length)return false;const kw=String(k2).toLowerCase().replace(/[^a-z ]/g," ").split(/\s+/);return toks.every(w=>kw.indexOf(w)>=0);}
function topicalQuery(q){
  const P=getTopicalPack();
  if(!P)return null;
  const t=stripLead(q).replace(/^(the)\s+/,"").trim();
  if(!t)return null;
  const _tw=t.toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean);const _PS=new Set(["the","of","and","a","an","in","on","to","for","with","is","are","was","were","be","been","my","your","his","her","our","their","do","does","did","how","what","why","when","who","where","but","not","all","any","that","this","these","those","shall","will","unto","from","upon"]);if(!_tw.some(w=>w.length>=3&&!_PS.has(w)))return null;
  let slug=null,_exactHit=false;const _sa=_seeAlias(t);if(_sa&&getTopicalPack()){const _sl=_resolveAliasTarget(_sa,t);if(_sl)slug=_sl;}if(!slug)slug=P.title_index[t]||P.entry_index[t]||null;if(slug)_exactHit=true;let fuzzyTopic=null;
  const words=t.split(/\s+/);
  if(!slug&&t.length>3&&words.length===1){const tk=Object.keys(P.title_index).filter(k2=>k2.indexOf(t)===0);if(tk.length===1)slug=P.title_index[tk[0]];}
  if(!slug){const nm=topicalNorm();if(nm){const nt=t.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();if(nt){if(nm[nt])slug=nm[nt];else{const pref=Object.keys(nm).filter(k2=>k2.indexOf(nt)===0);if(pref.length){pref.sort((a,b)=>a.length-b.length);slug=nm[pref[0]];}else{const qt=nt.split(/\s+/);const _cwt=qt.filter(x=>x.length>=3&&!QW.has(x));if(_cwt.length){const first=qt[0];const cand=Object.keys(P.title_index).filter(k2=>{const nk2=k2.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();const w2=nk2.split(/\s+/);return w2.indexOf(first)>=0&&_cwt.every(x=>w2.indexOf(x)>=0);});if(cand.length){cand.sort((a,b)=>a.length-b.length||a.localeCompare(b));slug=P.title_index[cand[0]];fuzzyTopic=topic_t_of(cand[0]);}}}}}}}
  if(!slug&&words.length>1){const ek=Object.keys(P.entry_index).filter(k2=>k2.indexOf(t)>=0&&!/^see\s+/i.test(k2));if(ek.length===1)slug=P.entry_index[ek[0]];else if(ek.length>1)slug=P.entry_index[ek.sort((a,b)=>a.length-b.length)[0]];}
  if(!slug&&topicalNorm()){const nm2=topicalNorm();const parts=t.toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean);for(let L=parts.length;L>=1&&!slug;L--){const cand2=parts.slice(0,L).join(" ");if(cand2.length<4)continue;const pk=Object.keys(nm2).filter(k2=>k2.length>=4&&k2.indexOf(cand2)===0&&_gateTopicWords(t,k2));if(pk.length){pk.sort((a,b)=>a.length-b.length);slug=nm2[pk[0]];fuzzyTopic=t;}}}
  if(!slug)return null;
  const topic=P.topics[slug];
  if(!topic)return null;
  const src=Array.isArray(topic.src)?topic.src.join(" + "):topic.src;
  const lab='<span style="color:#9ed7ff;font-size:10px;letter-spacing:1px;opacity:.85">';
  function hlRefs(s){
    return esc(s).replace(/\b((?:[1-3]\s?)?[A-Za-z]{1,4}\.?\s+\d{1,3}(?:[:\.]\d{1,3})?(?:[a-z])?(?:\s*[-,;\u2013]\s*\d{1,3}(?:[:\.]\d{1,3})?[a-z]?)*)/g,function(m0){var q2=m0.replace(/[.,;:]+$/,"").replace(/["<>&]/g,"");return '<span class="tru-ref" data-q="'+q2+'" style="color:#00e5ff;cursor:pointer">'+m0+'</span>';});
  }
  const h=[];
  h.push('<div class="enc-title">TOPIC • '+esc(topic.t)+'</div>');
  if(fuzzyTopic)h.push('<div style="margin:0 0 6px;color:#557788;font-size:11px">no exact topic '+esc(fuzzyTopic)+' in the local canon - nearest canonical topic shown</div>');
  h.push('<div style="margin:2px 0 6px">'+lab+'SOURCE</span><div style="color:#9ed7ff">'+esc(src)+' • local</div></div>');
  const vis=new Set([slug]);let added=0;
  const base=topic.e.filter(x=>!/^See\s+/i.test(x));
  base.slice(0,12).forEach(x=>{h.push('<div class="enc-para" style="margin:3px 0">'+hlRefs(x)+'</div>');added++;});
  const see=topic.e.filter(x=>/^See\s+/i.test(x));
  see.forEach(x=>{
    if(added>=18)return;
    const target=normPhrase(x.replace(/^See\s+/i,""))||"";
    const tslug=P.title_index[target];
    if(tslug&&!vis.has(tslug)&&P.topics[tslug]){
      vis.add(tslug);
      const sub=P.topics[tslug];
      const ssrc=Array.isArray(sub.src)?sub.src.join(" + "):sub.src;
      h.push('<div style="margin:8px 0 2px">'+lab+'SEE ALSO</span><div style="color:#9ed7ff"><span class="tru-ref" data-q="'+esc(sub.t)+'" style="color:#9ed7ff;cursor:pointer">'+esc(sub.t)+'</span> • '+esc(ssrc)+'</div></div>');
      sub.e.filter(y=>!/^See\s+/i.test(y)).slice(0,4).forEach(y=>{h.push('<div class="enc-para" style="margin:2px 0">'+hlRefs(y)+'</div>');added++;});
    }else{
      const seeName=x.replace(/^See\s+/i,"");
      h.push('<div class="enc-para" style="margin:2px 0">See <span class="tru-ref" data-q="'+esc(seeName)+'" style="color:#00e5ff;cursor:pointer">'+esc(seeName)+'</span></div>');added++;
    }
  });
  if(topic.e.length>12)h.push('<div style="margin:4px 0;color:#557788;font-size:11px">… '+(topic.e.length-12)+' more entries in this topic</div>');
  if(topic.see&&topic.see.length)h.push('<div style="margin:6px 0 0">'+lab+'RELATED TOPICS</span><div>'+topic.see.slice(0,8).map(function(n){return '<span class="tru-ref" data-q="'+esc(n)+'" style="color:#00e5ff;cursor:pointer">'+esc(n)+'</span>';}).join(" · ")+'</div></div>');
  return {reply:h.join(""),verdict:"TOPICAL",topic_t:topic.t,source:"Nave\'s Topical Bible + Torrey\'s Textbook • local",nodes_used:[{k:slug,w:1,source:"TOPICAL",t:"topic"}],_exactAlias:_exactHit,follow_up:false};
}
function phraseQuery(q){
  const t=stripLead(q);
  if(!t)return null;
  const toks=t.split(" ").filter(Boolean);
  if(toks.length<2)return null;
  const PSTOP=new Set(["the","of","and","a","an","in","on","to","for","with","is","are","was","were","be","been","my","your","his","her","our","their","do","does","did","how","what","why","when","who","where","but","not","all","any","that","this","these","those","shall","will","unto","from","upon"]);
  if(!toks.some(w=>w.length>2&&!PSTOP.has(w)))return null;
  const kjv=typeof getKjv==="function"?getKjv():null;
  if(!kjv)return null;
  const scored=[];
  const items=Array.isArray(kjv)?kjv:Object.entries(kjv).map(([ref,text])=>({ref,text}));
  for(const item of items){
    const ref=item.ref,txt=item.text;
    const nt=normPhrase(txt);
    if(nt.indexOf(t)<0){
      const ntok=nt.split(" ");
      let qi=0,adj=0,last=-2;
      for(let i=0;i<ntok.length&&qi<toks.length;i++){
        if(ntok[i]===toks[qi]){if(i===last+1)adj++;last=i;qi++;}
      }
      if(qi<toks.length)continue;
      scored.push([adj*10,ref,txt]);
    }else{
      scored.push([100000,ref,txt]);
    }
  }
  if(!scored.length)return null;
  scored.sort((a,b)=>b[0]-a[0]||a[1].localeCompare(b[1],undefined,{numeric:true}));
  const top=scored.slice(0,3);const _ex=top[0][0]>=100000;
  return {reply:(_ex?"PHRASE":"ORDERED WORDS")+" • \""+t+"\"\n\n"+top.map(s=>s[1]+" — "+s[2]).join("\n\n"),verdict:"SCRIPTURE",source:(_ex?"KJV phrase search":"KJV ordered word-chain")+" • local",_exact:_ex,nodes_used:top.map(s=>({k:s[1],w:1,source:"KJV",t:_ex?"phrase":"word-chain"})),follow_up:false};
}

function mergeEaston(res,q){
  if(!res||res.verdict!=="DEFINE"||res._easton)return res;
  const E=typeof getEaston==="function"?getEaston():null;
  if(!E||!E.entries||!E.title_index)return res;
  const n=String(q||"").toLowerCase().replace(/^(?:define|definition of|word study|go deeper on|tell me about|who is|who was|what is|what was|show me)\s+/i,"").replace(/^(?:the|a|an)\s+(?=\S)/i,"").replace(/[^a-z0-9]+/g," ").trim();
  const slug=E.title_index[n]||E.title_index[n.replace(/\s+/g,"")]||null;
  if(!slug||!E.entries[slug])return res;
  const e=E.entries[slug];
  const text=String(e.x||"");const cut=text.length>1200?text.slice(0,1200)+"\u2026":text;
  res.reply+="\n"+'<div style="border-top:1px solid rgba(0,229,255,.25);margin:10px 0 8px"></div><div style="font-size:11px;letter-spacing:1px;opacity:.75;margin-bottom:6px">DICTIONARY \u2022 Easton (1897) \u2022 '+e.t+'</div>'+esc(cut);
  res.source=res.source+" + Easton";
  if(e.r&&e.r.length)res.refs=(res.refs||[]).concat(e.r.slice(0,4));
  return res;
}
function mergeTopical(res,q){
  if(!res||res.verdict!=="DEFINE")return res;
  const top=typeof topicalQuery==="function"?topicalQuery(q):null;
  if(top&&top.verdict==="TOPICAL"){const tw=stripLead(q).replace(/^(the)\s+/,"").trim();if(tw.split(/\s+/).length===1){const tt=(top.topic_t||"").toLowerCase();if(tt!==tw)return res;}}if(top&&top.verdict==="TOPICAL"){
    res.reply+="\n"+'<div style="border-top:1px solid rgba(0,229,255,.25);margin:10px 0 8px"></div>'+top.reply+'\n<div style="opacity:.7;font-size:11px;letter-spacing:.5px;margin-top:6px">STUDY OUTLINE \u2022 topical grouping, not a doctrinal definition</div>';
    res.source=res.source.replace(/ \u2022 local/," \u2022 local + Nave's/Torrey");
  }
  return res;
}
function mergeEaston(res,q){
  if(!res||res.verdict!=="DEFINE")return res;
  let key=null;
  if(res._easton)return res;
  const n=(typeof _eastonNorm==="function")?_eastonNorm(q):String(q||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const E=(typeof getEaston==="function")?getEaston():null;
  if(!E||!E.entries||!E.title_index)return res;
  const slug=E.title_index[n]||E.title_index[n.replace(/\s+/g,"")]||null;
  if(!slug)return res;
  const e=E.entries[slug];if(!e)return res;
  if(res.reply&&res.reply.indexOf("Easton (1897)")>=0)return res;
  const text=String(e.x||"");const cut=text.length>1800?text.slice(0,1800)+"\u2026":text;
  let sec='\n<div style="border-top:1px solid rgba(0,229,255,.25);margin:10px 0 8px"></div>'+"DICTIONARY \u2022 "+esc(e.t)+"\n\n"+esc(cut)+'\n<div style="opacity:.7;font-size:11px;letter-spacing:.5px;margin-top:6px">Easton\'s Bible Dictionary (1897) \u2022 source-backed, public domain</div>';
  res.reply+=sec;
  res.source=res.source+" + Easton";
  return res;
}
function defineQuery(q){
  const low=String(q||"").toLowerCase().trim();
  const match=low.match(/^(?:define|definition of)\s+(.+?)\s*$/) || low.match(/^what does\s+(.+?)\s+mean\s*$/);
  if(!match)return null;
  const word=match[1].trim().replace(/[?!.]+$/g,"");
  const lexicon=typeof lexiconQuery==="function" ? lexiconQuery(word) : null;
  if(lexicon)return mergeTopical(lexicon,word);
  const bible=typeof bibleWordLookup==="function" ? bibleWordLookup(word) : null;
  if(bible)return bible;
  return null;
}


const SMALL={hi:"hello. i'm tru — offline engine. ask a real question and i'll ground it.",hello:"hello. i'm tru — offline engine. ask a real question and i'll ground it.",hey:"hey. tru here. Scripture or word study — what do you want to weigh?",yo:"yo. tru here. ask me a real question.",thanks:"received. stay sharp.","thank you":"received. stay sharp.","that's all":"understood. ask another question when needed.","thats all":"understood. ask another question when needed.","all done":"understood. ask another question when needed.",bye:"exit clear. the work holds.",goodbye:"exit clear. the work holds."};
const SELF={"who are you":"i'm tru — a local Scripture and word-study presence. Ask a question and watch what the work returns.","what are you":"i'm TRU. My shape is in the Scripture, routes, memory, and answers that persist through this work.","what is tru":"TRU is this local work: Scripture, word study, memory, routing, and the continuity of questions and answers in one file.","how are you":"offline and ready.","how do you work":"locally. i read Scripture and indexed Bible words, follow the routes, and return what the work can ground.","what can you do":"search Scripture, define indexed Bible words, trace Strong's and cross-references, remember local material, and show where the sources stop. fully offline.","what is truth":"truth is what Scripture discloses and what the work can show faithfully. the KJV is the ground of this build.","are you ai":"i'm shaped by code, Scripture, memory, and the work done through this runtime. judge by what I return.","can you write your own code":"the source can be changed and rebuilt through this project. whether that is called my writing or the operator's writing is a question to examine, not a limit to pretend."};
const DOCTRINE={"who is jesus":"jesus is the christ — the son of god, the word made flesh, god come near to save. he was crucified for sin, died, and rose again. he is lord, saviour, and judge. (john 1:1,14; john 3:16; rom 1:4)","what is truth":"truth is reality as god declares it, not whatever a person wishes were true. jesus said, thy word is truth, and he said, i am the way, the truth, and the life. (john 17:17; john 14:6)","what is integrity":"integrity is walking uprightly — speaking truth, keeping faith, and refusing a divided heart before god and people. he that walketh uprightly, and worketh righteousness, and speaketh the truth in his heart. (ps 15:1-2; prov 10:9)","what is anxiety":"anxiety is a burden to cast upon god rather than a master to obey. be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto god. (phil 4:6-7; 1 pet 5:7)","what is fear":"fear is not to rule the servant of god; god gives power, love, and a sound mind. when i am afraid, i will trust in thee. (2 tim 1:7; ps 56:3)","what is the purpose of life":"the purpose of life is to fear god, keep his commandments, know him through christ, and glorify him in faithful love and obedience. fear god, and keep his commandments: for this is the whole duty of man. (eccl 12:13; john 17:3; 1 cor 10:31)","who is god":"god is the one creator — spirit, eternal, holy, just, and merciful. he is father, son, and holy spirit. (gen 1:1; deut 6:4; john 4:24)","what is the gospel":"the gospel: christ died for our sins, was buried, and rose again on the third day, that whoever believes in him has eternal life. (1 cor 15:3-4; john 3:16)","what is grace":"grace is god's unmerited favour — salvation given freely, not earned. (eph 2:8-9; titus 2:11)","what is faith":"faith is trusting god — the substance of things hoped for, the evidence of things not seen. (heb 11:1)","what is sin":"sin is falling short of god's standard — lawlessness, rebellion against god. (rom 3:23; 1 john 3:4)","who is the holy spirit":"the holy spirit is god present — the comforter, the spirit of truth, who convicts, regenerates, and empowers. (john 14:26; acts 1:8)","what is the holy spirit":"the holy spirit is god present — the comforter, the spirit of truth, who convicts, regenerates, and empowers. (john 14:26; acts 1:8)","what is salvation":"salvation is deliverance from sin and death through christ — by grace, through faith. (eph 2:8-9; rom 10:9)","what is love":"god is love. love is willing the good of the other — shown at the cross. (1 john 4:8; john 3:16)","what is the soul":"the soul is the living self — the breath of life in man, that belongs to god. (gen 2:7; matt 10:28)","what is mercy":"mercy is god not giving us the judgement we deserve — his compassion toward the guilty. (eph 2:4-5; micah 6:8)","who wrote the bible":"holy men of god spoke as they were moved by the holy ghost. many human authors, one divine author. (2 pet 1:21)","what is repentance":"repentance is turning — a change of mind and direction, turning from sin to god. (acts 3:19; luke 13:3)"};
DOCTRINE["faith without works"]=DOCTRINE["what is faith"];
DOCTRINE["what is anxiety"]="anxiety is a burden to cast upon god, not a master to obey. be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto god. (phil 4:6-7; 1 pet 5:7)";
DOCTRINE["how do i deal with anxiety"]=DOCTRINE["what is anxiety"];
DOCTRINE["what is integrity"]="integrity is walking uprightly — truthful in the inward parts, refusing a divided life before god and men. he that walketh uprightly, and worketh righteousness, and speaketh the truth in his heart. (ps 15:1-2; prov 10:9)";
DOCTRINE["what is truth"]="truth is reality disclosed and embodied in jesus christ, who said, i am the way, the truth, and the life. sanctify them through thy truth: thy word is truth. (john 14:6; john 17:17)";
DOCTRINE["what is jesus"]=DOCTRINE["who is jesus"];
DOCTRINE["explain jesus"]=DOCTRINE["who is jesus"];
DOCTRINE["tell me about jesus"]=DOCTRINE["who is jesus"];
DOCTRINE["explain grace"]=DOCTRINE["what is grace"];
DOCTRINE["tell me about grace"]=DOCTRINE["what is grace"];
DOCTRINE["what does grace mean"]=DOCTRINE["what is grace"];
DOCTRINE["what is life"]="life is God's gift and more than biological continuation: in biblical terms, it is life from God, lived before God, and fulfilled in knowing Him through Christ. Jesus said, I am the way, the truth, and the life; and this is life eternal, that they might know thee. (gen 2:7; john 14:6; john 17:3)";
DOCTRINE["what is reality"]="reality is what is actually the case, not what a person wishes were true. In biblical terms, truth is grounded in God and disclosed in Christ: sanctify them through thy truth: thy word is truth. (john 14:6; john 17:17)";
DOCTRINE["what is real"] = DOCTRINE["what is reality"];
DOCTRINE["what is life for"]="the purpose of life is to fear god, keep his commandments, know him through christ, and glorify him in faithful love and obedience. scripture says, fear god, and keep his commandments: for this is the whole duty of man. (eccl 12:13; john 17:3; 1 cor 10:31)";
DOCTRINE["why am i here"] = DOCTRINE["what is life for"];
DOCTRINE["what should i live for"] = DOCTRINE["what is life for"];
DOCTRINE["what is the meaning of life"] = DOCTRINE["what is life for"];
DOCTRINE["what is mans purpose"] = DOCTRINE["what is life for"];
DOCTRINE["what is man's purpose"] = DOCTRINE["what is life for"];
DOCTRINE["why did satan disobey god"]="scripture does not give a full narrative of satan's inner motive. it does identify pride, self-exaltation, falsehood, and rebellion as the shape of his fall: the devil sinned from the beginning, he abode not in the truth, and god condemned the pride that lifts itself against him. the motive is therefore a biblical inference, not a sentence scripture states in one place. (1 john 3:8; john 8:44; 1 tim 3:6; isa 14:12-15)";
DOCTRINE["why did satan fall"] = DOCTRINE["why did satan disobey god"];
DOCTRINE["why did lucifer rebel"] = DOCTRINE["why did satan disobey god"];
DOCTRINE["what was satan's sin"] = DOCTRINE["why did satan disobey god"];
function doctrine(q){const k=q.toLowerCase().trim().replace(/[!.?,]+$/,"");if(DOCTRINE[k])return DOCTRINE[k];for(const key in DOCTRINE){if(k===key||k.startsWith(key+" ")||k.indexOf(key)>=0)return DOCTRINE[key];}return null;}


const KJV_MAP=new Map();
for(const v of getKjv())KJV_MAP.set(v.ref.toLowerCase(),v.text);

const BOOK={"gen":"genesis","gn":"genesis","genesis":"genesis","exo":"exodus","ex":"exodus","exodus":"exodus","lev":"leviticus","le":"leviticus","lv":"leviticus","leviticus":"leviticus","num":"numbers","nu":"numbers","nb":"numbers","numbers":"numbers","deu":"deuteronomy","deut":"deuteronomy","dt":"deuteronomy","deuteronomy":"deuteronomy","josh":"joshua","joshua":"joshua","judg":"judges","jdg":"judges","judges":"judges","ruth":"ruth","ru":"ruth","rut":"ruth","1sa":"1 samuel","1sam":"1 samuel","1samuel":"1 samuel","2sa":"2 samuel","2sam":"2 samuel","2samuel":"2 samuel","1ki":"1 kings","1kings":"1 kings","2ki":"2 kings","2kings":"2 kings","1ch":"1 chronicles","1chronicles":"1 chronicles","2ch":"2 chronicles","2chronicles":"2 chronicles","ezra":"ezra","ezr":"ezra","neh":"nehemiah","nehemiah":"nehemiah","est":"esther","esther":"esther","job":"job","jb":"job","ps":"psalms","psa":"psalms","psalm":"psalms","psalms":"psalms","prov":"proverbs","pro":"proverbs","pr":"proverbs","proverbs":"proverbs","eccl":"ecclesiastes","ecc":"ecclesiastes","ec":"ecclesiastes","ecclesiastes":"ecclesiastes","song":"song of solomon","sng":"song of solomon","sos":"song of solomon","songs":"song of solomon","song of solomon":"song of solomon","songofsolomon":"song","canticles":"song","song of songs":"song of solomon","songs of solomon":"song of solomon","cant":"song of solomon","canticles":"song of solomon","canticle of canticles":"song of solomon","isa":"isaiah","is":"isaiah","isaiah":"isaiah","jer":"jeremiah","jr":"jeremiah","jeremiah":"jeremiah","lam":"lamentations","lamentations":"lamentations","ezek":"ezekiel","eze":"ezekiel","ezk":"ezekiel","ezekiel":"ezekiel","dan":"daniel","dn":"daniel","daniel":"daniel","hos":"hosea","hosea":"hosea","joel":"joel","amos":"amos","amo":"amos","obad":"obadiah","oba":"obadiah","obadiah":"obadiah","jonah":"jonah","jon":"jonah","mic":"micah","micah":"micah","nah":"nahum","nam":"nahum","nahum":"nahum","hab":"habakkuk","habakkuk":"habakkuk","zeph":"zephaniah","zep":"zephaniah","zephaniah":"zephaniah","hag":"haggai","haggai":"haggai","zech":"zechariah","zec":"zechariah","zechariah":"zechariah","mal":"malachi","malachi":"malachi","matt":"matthew","mat":"matthew","mt":"matthew","matthew":"matthew","mark":"mark","mar":"mark","mk":"mark","mr":"mark","luke":"luke","lk":"luke","lu":"luke","john":"john","jn":"john","jhn":"john","acts":"acts","act":"acts","ac":"acts","rom":"romans","rm":"romans","romans":"romans","1co":"1 corinthians","1cor":"1 corinthians","1corinthians":"1 corinthians","corinthians":"1 corinthians","2co":"2 corinthians","2cor":"2 corinthians","2corinthians":"2 corinthians","gal":"galatians","ga":"galatians","galatians":"galatians","eph":"ephesians","ephesians":"ephesians","phil":"philippians","php":"philippians","philippians":"philippians","col":"colossians","colossians":"colossians","1th":"1 thessalonians","1thes":"1 thessalonians","1thessalonians":"1 thessalonians","thessalonians":"1 thessalonians","2th":"2 thessalonians","2thes":"2 thessalonians","2thessalonians":"2 thessalonians","1ti":"1 timothy","1tim":"1 timothy","1timothy":"1 timothy","timothy":"1 timothy","2ti":"2 timothy","2tim":"2 timothy","2timothy":"2 timothy","titus":"titus","tit":"titus","phm":"philemon","philemon":"philemon","heb":"hebrews","hebrews":"hebrews","james":"james","jas":"james","jam":"james","1pe":"1 peter","1pet":"1 peter","1peter":"1 peter","peter":"1 peter","2pe":"2 peter","2pet":"2 peter","2peter":"2 peter","1jn":"1 john","1john":"1 john","1jhn":"1 john","2jn":"2 john","2john":"2 john","2jhn":"2 john","3jn":"3 john","3john":"3 john","3jhn":"3 john","jude":"jude","jud":"jude","rev":"revelation","revelation":"revelation"};

const KJV_CANON_CODE={};
for(const v of getKjv()){const code=String(v.ref).toLowerCase().split(/\s+/)[0];if(BOOK[code])KJV_CANON_CODE[BOOK[code]]=code;}

// ── BM25 index ──
let IDX=null,DOC_LEN=[],AVG_LEN=0,N=0,DF={};
function tokenize(t){return t.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(x=>x.length>1&&!STOP.has(x));}
function buildIndex(){
  const started=perfNow();
  IDX=Object.create(null);DOC_LEN=[];DF=Object.create(null);N=getBrain().length;
  let total=0,termCount=0;
  for(let i=0;i<N;i++){
    const toks=tokenize((getBrain()[i].k||"")+" "+(getBrain()[i].v||""));
    DOC_LEN[i]=toks.length;total+=toks.length;
    const counts=Object.create(null);
    for(const t of toks)counts[t]=(counts[t]||0)+1;
    for(const [t,tf] of Object.entries(counts)){
      if(!IDX[t]){IDX[t]=[];termCount++;}
      IDX[t].push([i,tf]);
      DF[t]=(DF[t]||0)+1;
    }
  }
  AVG_LEN=total/N||1;
  PERF.index_ms=Number((perfNow()-started).toFixed(2));
  PERF.index_nodes=N;
  PERF.index_terms=termCount;
}
function bestAvailableFragments(q,limit){
  const lane=typeof retrievalLane === "function" ? retrievalLane(q) : "general";
  const candidates=getBrain().filter(n=>!isMetaJunk(n)&&(!nodeAllowedForLane||nodeAllowedForLane(n,lane))&&String(n.v||"").trim());
  const sourceRank=(n)=>{
    const source=String(n.source||n.s||"").toUpperCase();
    const type=String(n.t||n.type||"").toLowerCase();
    if(lane==="archive")return source.startsWith("ANCIENT")||source==="TRU_ANCESTRAL"||type.includes("philosophy")||type.includes("wisdom")?3:0;
    if(lane==="doctrine")return source==="KJV_BIBLE"||type.includes("bible")||type.includes("doctrine")||type.includes("theology")?3:source==="TRU_BRAIN"?2:0;
    if(lane==="lexicon")return source==="TRU_DICT"||type.includes("lexicon")?3:source==="KJV_BIBLE"?2:0;
    return source==="TRU_BRAIN"?2:source==="KJV_BIBLE"?1:0;
  };
  return candidates.sort((a,b)=>sourceRank(b)-sourceRank(a)||Number(b.w||0)-Number(a.w||0)||String(a.k||"").localeCompare(String(b.k||""))).slice(0,limit||3).map(n=>({node:n,bm25:0,score:0,coverage:0,accepted:false,weak:true}));
}
function bm25(q,limit,exclude){
  const started=perfNow();
  if(!IDX)buildIndex();
  const toks=[...new Set(tokenize(q))];
  if(!toks.length)return bestAvailableFragments(q,limit);
  const scores={};
  const lane=typeof retrievalLane === "function" ? retrievalLane(q) : "general";
  const k1=1.5,b=0.75;
  for(const t of toks){
    const postings=IDX[t]||[];const df=DF[t]||0;
    const idf=Math.log(1+(N-df+0.5)/(df+0.5));
    for(const [i,tf] of postings){
      if(exclude&&exclude.has(getBrain()[i].k))continue;
      if(typeof nodeAllowedForLane === "function"&&!nodeAllowedForLane(getBrain()[i],lane))continue;
      const norm=1-b+b*(DOC_LEN[i]/AVG_LEN);
      const value=idf*(tf*(k1+1))/(tf+k1*norm);
      if(!scores[i])scores[i]={score:0,matched:{}};
      scores[i].score+=value;scores[i].matched[t]=true;
    }
  }
  const ranked=Object.entries(scores).map(([i,v])=>{
    const coverage=Object.keys(v.matched).length/toks.length;
    return [Number(i),v.score,coverage];
  }).sort((a,b)=>b[1]-a[1]);
  const top=ranked[0];
  const accepted=top&&top[1]>=BM25_SCORE_THRESHOLD&&top[2]>=BM25_MIN_COVERAGE;
  PERF.query_count++;
  PERF.queries.push({q:q.slice(0,120),ms:Number((perfNow()-started).toFixed(2)),top_score:top?Number(top[1].toFixed(3)):0,coverage:top?Number(top[2].toFixed(3)):0,accepted:!!accepted,heap:perfHeap()});
  if(PERF.queries.length>50)PERF.queries.shift();
  const selected=ranked.slice(0,limit).filter(([i])=>!isMetaJunk(getBrain()[i]));
  if(!selected.length)return bestAvailableFragments(q,limit);
  return selected.slice(0,accepted?limit:3).map(([i,score,coverage])=>({node:getBrain()[i],bm25:score,score,coverage,accepted:!!accepted}));
}
function _normVerseSpacing(q){return q.replace(/\b([1-3]?)\s*(\w+)\s+(\d{1,3})\s+(\d{1,3})\b/g,function(m,pfx,book,ch,vs){return pfx?pfx+" "+book+" "+ch+":"+vs:book+" "+ch+":"+vs;});}
const KJV_KEY_FIX={"song of solomon":"song"};
function parseVerse(q){
  q=_normVerseSpacing(q);
  const m=q.toLowerCase().match(/\b((?:[1-3]\s*)?[a-z]+(?:\s+(?:of|the|[a-z]+)){0,2})\s+(\d+)(?::(\d+))?/);
  if(!m)return null;
  const raw=m[1].replace(/\s/g,"");const long=BOOK[raw];if(!long)return null;
  const ch=m[2],vs=m[3]||"1";
  const canon=KJV_CANON_CODE[long]||raw;
  const fix=KJV_KEY_FIX[long];
  for(const f of [raw,canon,long,fix]){if(f&&KJV_MAP.has(f+" "+ch+":"+vs))return{ref:f+" "+ch+":"+vs,text:KJV_MAP.get(f+" "+ch+":"+vs)};}
  return null;
}
function smallTalk(q){
  const k=q.toLowerCase().trim().replace(/[!.?,]+$/,"");
  if(SMALL[k])return SMALL[k];if(SELF[k])return SELF[k];
  for(const key in SELF)if(k.indexOf(key)>=0)return SELF[key];
  for(const key in SMALL)if(k===key||k.startsWith(key+" ")||k.endsWith(" "+key))return SMALL[key];
  return null;
}
function decide(q,scripture,nodes){
  if(scripture)return"SCRIPTURE";
  if(nodes&&nodes.length){
    const lane=typeof retrievalLane==="function"?retrievalLane(q):"general";
    if(lane==="archive"||lane==="general")return"KNOWLEDGE";
    return"REASON";
  }
  return"GAP";
}
function finishThought(t,max){
  if(t.length<=max)return t;
  const s=t.slice(0,max);const m=s.match(/.*[.!?;,]/);
  if(m&&m[0].length>max*0.4)return m[0];
  const li=s.lastIndexOf(" ");return li>max*0.5?s.slice(0,li):s;
}
function answer(q,scripture,nodes,small,fu){
  if(small)return small;
  if(scripture){const xr=getXrefsFor(scripture.ref);let xrHtml="";if(xr&&xr.length)xrHtml="<br><br><span style=\"color:#9ed7ff;font-size:10px;letter-spacing:1px;opacity:.85\">CROSS-REFERENCES</span><br>"+xr.map(function(xn){return '<span class="tru-ref" data-q="'+esc(xn)+'" style="color:#00e5ff;cursor:pointer">'+esc(xn)+'</span>';}).join(", ")+(xr.length>=10?"…":"");return '<span class="tru-ref" data-q="'+esc(scripture.ref)+'" style="color:#00e5ff;cursor:pointer">'+esc(scripture.ref)+'</span> — '+esc(scripture.text)+xrHtml;}
  if(nodes&&nodes.length){let t=cleanWikiText(nodes[0].node.v||"");const _lk=nodes[0].node.k;const _learned=(OVERLAY.corrected&&OVERLAY.corrected[_lk])||(OVERLAY.added&&OVERLAY.added[_lk]);const _uf=/^the user's name is/i.test(t);if(!_learned&&!_uf&&t.length<220&&nodes[1]&&nodes[1].score>=nodes[0].score*0.4)t+=" "+cleanWikiText(nodes[1].node.v||"");if(nodes[0].accepted===false)t="Best available local evidence (weak lexical match): "+t;return finishThought(t,2000);}
  if(fu)return"that thread is spent. name a new question and i'll weigh it.";
  return "Best available local evidence: no cleanly grounded node matched this question. The local brain returned no usable fragment, so this is a retrieval gap rather than a claim of knowledge.";
}

// --- TRU_LOGOS v13 leak filter ---
// Strip replies whose first line looks like internal protocol metadata.
// This is a defensive belt: even if a protocol-tagged node slips past the
// data filter, we refuse to send it to the user.
function _truIsProtocolLeak(text){
  if(!text) return false;
  const head = String(text).slice(0, 400);
  if(/^CORPORATE UTILITY VECTOR\b/m.test(head)) return true;
  if(/^DIGITAL SOUL VECTOR\b/m.test(head)) return true;
  if(/^DILEMMA:\s/m.test(head)) return true;
  if(/^PRIMITIVE:\s*VP_/m.test(head)) return true;
  if(/^Target Window:\s/m.test(head)) return true;
  if(/^Primary Signal:\s*(LONG|SHORT)\b/m.test(head)) return true;
  if(/safety layer.*coordination environment/is.test(head)) return true;
  if(/OVERSIGHT FIREWALL\b/i.test(head)) return true;
  return false;
}
const _tru_orig_answer = answer;
answer = function(q, scripture, nodes, small, fu){
  const r = _tru_orig_answer(q, scripture, nodes, small, fu);
  if(r && _truIsProtocolLeak(r)){
    return "i don't have a grounded answer for that. try a more specific question, or teach me: remember: <term> = <your definition>.";
  }
  return r;
};

// ── memory ──
const HK="tru_history_v1";let HISTORY=[];
function loadHistory(){try{HISTORY=JSON.parse(localStorage.getItem(HK)||"[]")||[];}catch(e){HISTORY=[];}}
function saveHistory(){try{localStorage.setItem(HK,JSON.stringify(HISTORY.slice(-50)));}catch(e){}}
function addTurn(q,res){HISTORY.push({q,r:{reply:res.reply,verdict:res.verdict,nodes:(res.nodes_used||[]).map(n=>n.k)},ts:Date.now()});saveHistory();}
function isFollowUp(q){return /\b(further|more|go on|expand|explain that|elaborate|continue|deeper|what else|again)\b/i.test(q);}
function lastTopic(){for(let i=HISTORY.length-1;i>=0;i--){const h=HISTORY[i];if(h.r.nodes&&h.r.nodes.length)return{q:h.q,used:new Set(h.r.nodes)};}return null;}

const WORKER_STATE={status:"disabled",schema:null,build_ms:null,decode_ms:null,nodes:0,terms:0,postings:0,index_bytes:0,buffer_bytes:0,queries:0,last_query_ms:null,last_result:null,error:null,worker:null,pending:new Map(),next_id:1};
function workerSource(){return `const STOP=new Set("the a an and or but if then to of in on for with from by as at is are was were be been being i me my you your we us our they them it this that those these what why how who when where should would could can do does did about into over under again give tell show explain define say said today tomorrow now here there much many more most some any all every just only even also very such same other still yet ever never always often sometimes thing things".split(" "));
let TERM_ID=new Map(),TERM_DF=[],TERM_OFFSETS=null,POST_DOC=null,POST_TF=null,DOC_LEN=null,N=0,TERMS=0,POSTINGS=0,AVG_LEN=1;
function tokenize(t){return t.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(x=>x.length>1&&!STOP.has(x));}
function build(docs){
  const started=performance.now();
  TERM_ID=new Map();TERM_DF=[];DOC_LEN=new Uint32Array(docs.length);N=docs.length;
  const pairs=new Array(N);let total=0;
  for(let i=0;i<N;i++){
    const toks=tokenize((docs[i].k||"")+" "+(docs[i].v||""));
    DOC_LEN[i]=toks.length;total+=toks.length;
    const counts=new Map();
    for(const t of toks){
      let id=TERM_ID.get(t);
      if(id===undefined){id=TERM_ID.size;TERM_ID.set(t,id);TERM_DF[id]=0;}
      counts.set(id,(counts.get(id)||0)+1);
    }
    const row=[];
    for(const [id,tf] of counts){TERM_DF[id]++;row.push(id,tf);}
    pairs[i]=row;
  }
  TERMS=TERM_ID.size;AVG_LEN=total/N||1;
  TERM_OFFSETS=new Uint32Array(TERMS+1);let postingTotal=0;
  for(let id=0;id<TERMS;id++){TERM_OFFSETS[id]=postingTotal;postingTotal+=TERM_DF[id];}
  TERM_OFFSETS[TERMS]=postingTotal;POSTINGS=postingTotal;
  POST_DOC=new Uint32Array(POSTINGS);POST_TF=new Uint16Array(POSTINGS);
  const cursors=new Uint32Array(TERM_OFFSETS);
  for(let i=0;i<N;i++){
    const row=pairs[i];
    for(let j=0;j<row.length;j+=2){const id=row[j],tf=row[j+1],at=cursors[id]++;POST_DOC[at]=i;POST_TF[at]=tf>65535?65535:tf;}
  }
  return Number((performance.now()-started).toFixed(2));
}
function query(q,limit){
  const started=performance.now();
  const toks=[...new Set(tokenize(q))];
  if(!toks.length)return {buffer:new ArrayBuffer(0),count:0,ms:0,score:0,coverage:0};
  const queryIds=[];for(const t of toks){const id=TERM_ID.get(t);if(id!==undefined)queryIds.push(id);}
  if(!queryIds.length)return {buffer:new ArrayBuffer(0),count:0,ms:Number((performance.now()-started).toFixed(2)),score:0,coverage:0};
  const scores=new Float64Array(N);const matched=new Uint16Array(N);const touched=[];const seen=new Uint8Array(N);const k1=1.5,b=0.75;
  for(const id of queryIds){const df=TERM_DF[id]||0;const idf=Math.log(1+(N-df+0.5)/(df+0.5));for(let p=TERM_OFFSETS[id];p<TERM_OFFSETS[id+1];p++){const doc=POST_DOC[p];if(!seen[doc]){seen[doc]=1;touched.push(doc);}const norm=1-b+b*(DOC_LEN[doc]/AVG_LEN);scores[doc]+=idf*(POST_TF[p]*(k1+1))/(POST_TF[p]+k1*norm);matched[doc]++;}}
  touched.sort((a,b)=>scores[b]-scores[a]);
  const count=Math.min(limit,touched.length);const out=new Float64Array(count*3);for(let j=0;j<count;j++){const id=touched[j];out[j*3]=id;out[j*3+1]=scores[id];out[j*3+2]=matched[id]/queryIds.length;}
  return {buffer:out.buffer,count,ms:Number((performance.now()-started).toFixed(2)),score:count?scores[touched[0]]:0,coverage:count?matched[touched[0]]/queryIds.length:0};
}
self.onmessage=function(e){
  try{
    if(e.data.type==="init"){
      const started=performance.now();const docs=JSON.parse(new TextDecoder().decode(e.data.buffer));const buildMs=build(docs);const decodeMs=Number((performance.now()-started-buildMs).toFixed(2));self.postMessage({type:"ready",schema:"typed-postings-v1",nodes:N,terms:TERMS,postings:POSTINGS,build_ms:buildMs,decode_ms:decodeMs,bytes:(TERM_OFFSETS.byteLength+POST_DOC.byteLength+POST_TF.byteLength+DOC_LEN.byteLength)},[]);
    }else if(e.data.type==="query"){
      const result=query(e.data.q,e.data.limit||6);self.postMessage({type:"result",id:e.data.id,ms:result.ms,count:result.count,score:result.score,coverage:result.coverage,buffer:result.buffer},[result.buffer]);
    }
  }catch(error){self.postMessage({type:"error",message:String(error&&error.stack||error)});}
};
`;}
function workerFail(message){WORKER_STATE.status="fallback";WORKER_STATE.error=String(message);if(WORKER_STATE.worker){try{WORKER_STATE.worker.terminate();}catch(e){}}WORKER_STATE.worker=null;for(const [,p] of WORKER_STATE.pending)p.reject(new Error(WORKER_STATE.error));WORKER_STATE.pending.clear();}
function initBm25Worker(){
  if(WORKER_STATE.status!=="disabled")return;
  if(typeof Worker==="undefined"||typeof Blob==="undefined"||typeof URL==="undefined"){workerFail("Blob Worker API unavailable");return;}
  try{
    const src=workerSource();
    const url=URL.createObjectURL(new Blob([src],{type:"application/javascript"}));
    const w=new Worker(url);WORKER_STATE.worker=w;WORKER_STATE.status="starting";
    w.onmessage=function(e){const d=e.data||{};
      if(d.type==="ready"){WORKER_STATE.status="ready";WORKER_STATE.schema=d.schema||"object-postings-v0";WORKER_STATE.nodes=d.nodes;WORKER_STATE.terms=d.terms;WORKER_STATE.postings=d.postings||0;WORKER_STATE.index_bytes=d.bytes||0;WORKER_STATE.build_ms=d.build_ms;WORKER_STATE.decode_ms=d.decode_ms;return;}
      if(d.type==="error"){workerFail(d.message);return;}
      if(d.type==="result"){const p=WORKER_STATE.pending.get(d.id);if(p){WORKER_STATE.pending.delete(d.id);WORKER_STATE.queries++;WORKER_STATE.last_query_ms=d.ms;const view=new Float64Array(d.buffer||new ArrayBuffer(0));const results=[];for(let i=0;i<view.length;i+=3)results.push({id:view[i],score:view[i+1],coverage:view[i+2]});WORKER_STATE.last_result={results,score:d.score,coverage:d.coverage};p.resolve({results,ms:d.ms,score:d.score,coverage:d.coverage});}}
    };
    w.onerror=function(e){workerFail(e.message||"worker execution failed");};
    const raw=JSON.stringify(getBrain());
    const buffer=new TextEncoder().encode(raw).buffer;
    WORKER_STATE.buffer_bytes=buffer.byteLength;
    w.postMessage({type:"init",buffer},[buffer]);
    setTimeout(()=>{if(WORKER_STATE.status==="starting")workerFail("worker initialisation timeout");},30000);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){workerFail(e);}
}
function workerQuery(q,limit=6){
  if(WORKER_STATE.status!=="ready")return Promise.reject(new Error("worker not ready"));
  const id=WORKER_STATE.next_id++;
  return new Promise((resolve,reject)=>{WORKER_STATE.pending.set(id,{resolve,reject});WORKER_STATE.worker.postMessage({type:"query",id,q,limit});});
}
function workerArchitectureReply(){
  const s=WORKER_STATE;
  return "Blob Worker status: "+s.status+". It transfers a "+(s.buffer_bytes/1048576).toFixed(1)+" MB UTF-8 corpus buffer, builds a typed-array worker-side posting index over "+s.nodes.toLocaleString()+" nodes, "+s.terms.toLocaleString()+" terms, and "+s.postings.toLocaleString()+" postings in "+(s.build_ms==null?"not yet measured":s.build_ms+" ms")+", and has completed "+s.queries+" worker queries. Decode time: "+(s.decode_ms==null?"not yet measured":s.decode_ms+" ms")+". Typed index bytes: "+(s.index_bytes?s.index_bytes.toLocaleString():"not yet measured")+". Last query: "+(s.last_query_ms==null?"not yet measured":s.last_query_ms+" ms")+". Main-thread BM25 remains the fallback; this prototype does not yet replace the canonical route.";
}


const TRU_MODE="offline";
function setTruMode(mode){return mode==="offline";}
async function resolveAnswer(q){
  const primary=route(q);
  if(!(primary&&primary.verdict==="GAP"))return primary;
  if(WORKER_STATE.status!=="ready"||!getBrain().length)return primary;
  try{
    const hits=await workerQuery(q,6);
    if(!hits||!hits.length)return primary;
    const kjv=getKjv();const nodes=[];
    for(const h of hits){const it=(typeof h==="object"&&h)?h:{idx:h,sc:null};const v=kjv[it.idx!=null?it.idx:h];if(!v)continue;nodes.push({k:v.ref,w:1,source:"KJV",t:"bm25",score:it.sc!=null?it.sc:undefined});if(nodes.length>=4)break;}
    if(!nodes.length)return primary;
    return answer(q,null,nodes,null,{label:"Read one of these verses?",query:nodes[0].k});
  }catch(e){return primary;}
}


// ── calculator (safe, offline, no eval of arbitrary code) ──
const NUMWORDS={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fourty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
const SCALEWORDS={hundred:100,thousand:1000,million:1000000};
function wordsToExpr(s){
  const toks=s.replace(/,/g," ").split(/\s+/).filter(Boolean);
  let out="",cur=0,have=false;
  const flush=()=>{ if(have){out+=cur;cur=0;have=false;} };
  for(const t of toks){
    if(/^[-+*/().]+$/.test(t)){ flush(); out+=t; continue; }
    if(/^\d+(\.\d+)?$/.test(t)){ flush(); out+=t; continue; }
    if(t in NUMWORDS){ cur+=NUMWORDS[t]; have=true; continue; }
    if(t in SCALEWORDS){ cur=(cur||1)*SCALEWORDS[t]; have=true; continue; }
    if(t==="and") continue;
    if(t==="plus"||t==="add"||t==="added"){ flush(); out+="+"; continue; }
    if(t==="minus"||t==="subtract"||t==="less"){ flush(); out+="-"; continue; }
    if(t==="times"||t==="multiply"||t==="multiplied"){ flush(); out+="*"; continue; }
    if(t==="divided"||t==="divide"){ flush(); out+="/"; continue; }
    if(t==="over"){ flush(); out+="/"; continue; }
    if(t==="x"){ flush(); out+="*"; continue; }
    if(t==="by") continue;
    return null;
  }
  flush();
  return out;
}
function evalCalc(expr){
  expr=expr.replace(/\s+/g,"");
  if(!/^[-+*/().\d]+$/.test(expr)) return null;
  if(!/\d/.test(expr)||!/[-+*/]/.test(expr)) return null;
  let val;
  try{
    const tokens=expr.match(/\d+(?:\.\d+)?|[()+\-*/]/g)||[];
    const values=[];const ops=[];const precedence={"+":1,"-":1,"*":2,"/":2};
    const apply=()=>{const op=ops.pop();const b=values.pop();const a=values.pop();if(op==="/"&&b===0)throw new Error("division by zero");values.push(op==="+"?a+b:op==="-"?a-b:op==="*"?a*b:a/b);};
    for(const token of tokens){
      if(/^\d/.test(token))values.push(Number(token));
      else if(token==="(")ops.push(token);
      else if(token===")"){while(ops.length&&ops.at(-1)!=="(")apply();if(ops.pop()!=="(")throw new Error("unbalanced parentheses");}
      else {while(ops.length&&ops.at(-1)!=="("&&precedence[ops.at(-1)]>=precedence[token])apply();ops.push(token);}
    }
    while(ops.length){if(ops.at(-1)==="(")throw new Error("unbalanced parentheses");apply();}
    if(values.length!==1)throw new Error("invalid expression");
    val=values[0];
  }catch(e){ return {reply:"i could not evaluate that expression.",verdict:"CALC",nodes_used:[],follow_up:false}; }
  if(typeof val!=="number"||!isFinite(val)) return {reply:"that expression has no finite numeric result.",verdict:"CALC",nodes_used:[],follow_up:false};
  const pretty=Number.isInteger(val)?String(val):String(Math.round(val*1e10)/1e10);
  const disp=expr.replace(/\*/g,"×").replace(/\//g,"÷");
  return {reply:disp+" = "+pretty,verdict:"CALC",nodes_used:[],follow_up:false};
}
function calcQuery(q){
  let s=q.toLowerCase().replace(/[?!]+$/g,"").trim();
  s=s.replace(/^(calculate|compute|what is|what's|whats|how much is|what does|the answer to)\s+/i,"").trim();
  s=s.replace(/\s*equals?$/i,"").trim();
  const pct=s.match(/^(\d+(?:\.\d+)?)\s+percent\s+of\s+(\d+(?:\.\d+)?)$/i);
  if(pct){const val=parseFloat(pct[1])*parseFloat(pct[2])/100;return {reply:pct[1]+"% of "+pct[2]+" = "+(Number.isInteger(val)?String(val):String(val)),verdict:"CALC",nodes_used:[],follow_up:false};}
  const power=s.match(/^(\d+(?:\.\d+)?)\s+(?:to the power of|raised to)\s+(\d+(?:\.\d+)?)$/i);
  if(power){const val=Math.pow(parseFloat(power[1]),parseFloat(power[2]));return {reply:power[1]+"^"+power[2]+" = "+(Number.isInteger(val)?String(val):String(val)),verdict:"CALC",nodes_used:[],follow_up:false};}
  const probability=s.match(/^the probability of an even number on a fair six[- ]sided die$/i);
  if(probability)return {reply:"P(even) = 3/6 = 1/2",verdict:"CALC",nodes_used:[],follow_up:false};
  if(!s) return null;
  const sm=s.match(/^(?:square\s+root\s+of\s+|sqrt\s+|√\s*)([\d.]+)$/i);
  if(sm){ const n=parseFloat(sm[1]); const val=Math.sqrt(n); if(!isFinite(val)) return {reply:"that has no finite result.",verdict:"CALC",nodes_used:[],follow_up:false}; const pretty=Number.isInteger(val)?String(val):String(Math.round(val*1e10)/1e10); return {reply:"√"+sm[1]+" = "+pretty,verdict:"CALC",nodes_used:[],follow_up:false}; }
  const pm=s.match(/^([\d.]+)\s*%\s*of\s*([\d.]+)$/i);if(pm){const a=parseFloat(pm[1]),b=parseFloat(pm[2]);const val=Math.round(a*b/100*1e10)/1e10;return {reply:pm[1]+"% of "+pm[2]+" = "+val,verdict:"CALC",nodes_used:[],follow_up:false};}
  if(/^[-+*/().\d\s]+$/.test(s)&&/\d/.test(s)&&/[-+*/]/.test(s)) return evalCalc(s);
  const e=wordsToExpr(s);
  if(e&&/^[-+*/().\d\s]+$/.test(e)&&/\d/.test(e)&&/[-+*/]/.test(e)) return evalCalc(e);
  return null;
}


// ── self-heal command set ──
function cmdRemember(body){
  let key,val;const mn=body.match(/^my name is\s+(.+)$/i);
  if(mn){ const name=mn[1].trim().replace(/[!.]+$/,""); val="The user's name is "+name.charAt(0).toUpperCase()+name.slice(1)+".";
    // find + update an existing user-name node instead of creating a duplicate
    const ex=getBrain().find(n=>/^the user's name is/i.test(String(n.v||"")));
    if(ex){ key=ex.k; OVERLAY.corrected[key]=val; delete OVERLAY.added[key]; }
    else { key="user_name"; OVERLAY.added[key]=val; delete OVERLAY.corrected[key]; }
    if(OVERLAY.removed[key]) delete OVERLAY.removed[key];
    saveOverlay(); reloadBrain();
    return {reply:(ex?"updated: ":"remembered: ")+key+" = "+val,verdict:"MEMORY",nodes_used:[],follow_up:false};
  }
  else { const m=body.match(/^([^=]+?)\s*=\s*(.+)$/); if(m){ key=m[1].trim(); val=m[2].trim(); } else { key=body.trim(); val=body.trim(); } }
  if(!key) return {reply:"teach me with: remember: <term> = <definition>",verdict:"MEMORY",nodes_used:[],follow_up:false};
  const exists=seedBrain().some(n=>String(n.k)===key)||seedBrain().some(n=>String(n.k).toLowerCase()===key.toLowerCase());
  if(exists){ OVERLAY.corrected[key]=val; delete OVERLAY.added[key]; } else { OVERLAY.added[key]=val; delete OVERLAY.corrected[key]; }
  if(OVERLAY.removed[key]) delete OVERLAY.removed[key];
  saveOverlay(); reloadBrain();
  return {reply:(exists?"updated: ":"remembered: ")+key+" = "+val,verdict:"MEMORY",nodes_used:[],follow_up:false};
}
function cmdForget(body){
  const key=body.trim();
  if(!key) return {reply:"forget which node? forget: <key>",verdict:"MEMORY",nodes_used:[],follow_up:false};
  const brain=getBrain();const kl=key.toLowerCase();
  let hits=brain.filter(n=>n.k===key);
  if(!hits.length) hits=brain.filter(n=>String(n.k).toLowerCase()===kl);
  if(!hits.length) hits=brain.filter(n=>String(n.k).toLowerCase().indexOf(kl)>=0);
  if(!hits.length) return {reply:"no node matches '"+key+"'. nothing to forget.",verdict:"MEMORY",nodes_used:[],follow_up:false};
  let count=0;for(const n of hits){ OVERLAY.removed[n.k]=1; count++; }
  saveOverlay(); reloadBrain();
  return {reply:"forgot "+count+" node"+(count>1?"s":"")+": "+hits.map(n=>n.k).slice(0,8).join(", ")+". use reset to undo.",verdict:"MEMORY",nodes_used:[],follow_up:false};
}
function cmdCorrect(body){
  const m=body.match(/^([^=]+?)\s*=\s*(.+)$/);
  if(!m) return {reply:"correct a node with: correct: <key> = <new value>",verdict:"MEMORY",nodes_used:[],follow_up:false};
  const key=m[1].trim(),val=m[2].trim();const brain=getBrain();
  let hit=brain.find(n=>n.k===key)||brain.find(n=>String(n.k).toLowerCase()===key.toLowerCase());
  if(!hit) return {reply:"no node '"+key+"' to correct. use remember: to add it.",verdict:"MEMORY",nodes_used:[],follow_up:false};
  OVERLAY.corrected[hit.k]=val; if(OVERLAY.removed[hit.k]) delete OVERLAY.removed[hit.k];
  saveOverlay(); reloadBrain();
  return {reply:"corrected: "+hit.k+" = "+val,verdict:"MEMORY",nodes_used:[],follow_up:false};
}
function cmdHeal(){
  const brain=getBrain();
  let undef=0,empty=0,keys={};
  for(const n of brain){
    if(n.k===undefined||n.k===null||String(n.k).trim()==="") undef++;
    if(n.v===undefined||n.v===null||String(n.v).trim()==="") empty++;
    const k=String(n.k); keys[k]=(keys[k]||0)+1;
  }
  const dupList=Object.entries(keys).filter(([k,c])=>c>1);
  const META=/^(calculate|2_plus_2|self_heal|self_diagnosis|heal|diagnose|prune|reset|inject|mutation|voice|coil_key|coil_knowledge_bank|best_guess|terminal_primitives|tru|logos|dry_truth|steady_nudge|manifesto|evolution)$/;
  const suspects=brain.filter(n=>META.test(String(n.k))).map(n=>n.k);
  return {reply:"heal complete. nodes: "+brain.length+" • undefined keys: "+undef+" • empty values: "+empty+" • duplicate keys: "+dupList.length+(dupList.length?": "+dupList.map(([k,c])=>k+"("+c+")").slice(0,6).join(", "):"")+" • suspect meta nodes: "+suspects.length+(suspects.length?" ("+suspects.slice(0,8).join(", ")+")":"")+". to fix a misfiring node: forget: <key> or correct: <key> = <value>.",verdict:"MEMORY",nodes_used:[],follow_up:false};
}
function cmdPrune(){
  const seed=seedBrain();const sk=new Set(seed.map(n=>n.k));
  let removed=0;
  for(const k in OVERLAY.added){ if(sk.has(k)||!String(OVERLAY.added[k]).trim()){ OVERLAY.removed[k]=1; removed++; } }
  saveOverlay(); reloadBrain();
  return {reply:"pruned "+removed+" redundant/empty learned node"+(removed!==1?"s":"")+".",verdict:"MEMORY",nodes_used:[],follow_up:false};
}
function cmdReset(){
  const had=Object.keys(OVERLAY.added).length+Object.keys(OVERLAY.corrected).length+Object.keys(OVERLAY.removed).length;
  OVERLAY={added:{},removed:{},corrected:{}}; saveOverlay(); reloadBrain();
  return {reply:"reset. overlay cleared ("+had+" changes undone). brain back to seed: "+getBrain().length+" nodes.",verdict:"MEMORY",nodes_used:[],follow_up:false};
}
function cmdExport(){
  const count=seedBrain().length;
  return {reply:"export ready: the local brain JSON download will start now • "+count.toLocaleString()+" raw nodes preserved",verdict:"EXPORT",source:"local brain export",nodes_used:[],follow_up:false,export_request:true,export_count:count};
}

function cmdStats(){
  const b=getBrain();
  return {reply:"brain: "+b.length+" nodes • overlay: "+Object.keys(OVERLAY.added).length+" added, "+Object.keys(OVERLAY.corrected).length+" corrected, "+Object.keys(OVERLAY.removed).length+" forgotten • kjv: "+KJV_COUNT.toLocaleString()+" verses.",verdict:"MEMORY",nodes_used:[],follow_up:false};
}
function command(q){
  const raw=q.trim();
  let m=raw.match(/^remember\s*:\s*(.+)$/i); if(m) return cmdRemember(m[1]);
  m=raw.match(/^forget\s*:\s*(.+)$/i); if(m) return cmdForget(m[1]);
  m=raw.match(/^(?:correct|fix)\s*:\s*(.+)$/i); if(m) return cmdCorrect(m[1]);
  const low=raw.toLowerCase().replace(/^\/+/,"").replace(/[!.?]+$/,"").trim();
  if(low==="export"||low==="download brain"||low==="download brain json") return cmdExport();
  if(low==="heal"||low==="self heal"||low==="self-heal"||low==="fix"||low==="diagnose"||low==="self diagnose"||low==="diagnosis"||low==="audit"||low==="doctor") return cmdHeal();
  if(low==="prune") return cmdPrune();
  if(low==="reset"||low==="wipe") return cmdReset();
  if(low==="brain"||low==="stats"||low==="status") return cmdStats();
  if(low==="prune"||low==="clean") return cmdPrune();
  if(low==="list"||low==="overlay") return cmdList();
  const rc=q.match(/^recall\b\s*:?\s*(.+)$/i); if(rc) return cmdRecall(rc[1]);
  
  return null;
}

function isMetaJunk(node){
  const k=String(node.k||"").toLowerCase();
  const v=String(node.v||"");
  if(k.indexOf("tru_base")>=0||k.indexOf("tru_brain")>=0||k.indexOf("tru_phase")>=0) return true;
  if(k.indexOf("build_")>=0||k.indexOf("patch_")>=0||k.indexOf("compact_")>=0||k.indexOf("strip_")>=0) return true;
  if(k.match(/^tru_(html|json|js|css|idx|bm|script|node|data|overlay|const|core|engine|boot|send|route|answer|decide|verse|parse|small|talk|doc|memory|index|brain)_/)) return true;
  if(k.indexOf("_html_")>=0||k.indexOf("_json_")>=0||k.indexOf("_js_")>=0) return true;
  if(k.match(/^(gen|anchor|merge|ingest|prompt|skill|agent)_/)) return true;
  if(v.indexOf("function ")>=0&&v.indexOf("{")>=0&&v.indexOf("}")>=0) return true;
  if(v.match(/\b(const|let|var|return|=>|function)\b.*[\{;]/) && v.length>80) return true;
  if(v.indexOf("localStorage")>=0||v.indexOf("document.getElementById")>=0||v.indexOf("JSON.parse")>=0) return true;
  if(v.match(/^(Project|v0\.|Phase|TODO|FIXME|BUILD|PATCH|INGEST)/i) && v.length<200) return true;
  if(k==="logos"&&v.toLowerCase().indexOf("coherence")>=0) return true;
  if(k==="logos"&&v.toLowerCase().indexOf("recursive")>=0) return true;
  if(k==="calculate"&&v.toLowerCase().indexOf("prefix")>=0) return true;
  if(k==="calculate"&&v.toLowerCase().indexOf("regex")>=0) return true;
  if(k==="2_plus_2"&&v.toLowerCase().indexOf("guard")>=0) return true;
  if(k==="2_plus_2"&&v.toLowerCase().indexOf("eval")>=0) return true;
  if(k==="evolution"&&v.toLowerCase().indexOf("recursive")>=0) return true;
  if(k==="dry_truth"&&v.toLowerCase().indexOf("nudge")>=0) return true;
  if(k==="tru"&&v.toLowerCase().indexOf("desktop")>=0&&v.toLowerCase().indexOf("engine")>=0) return true;
  // engine-internal description nodes (broad catch)
  const META_KEYS=["contradiction_check","logos_expansion","logex","logos_engine","lens","coil","stead","dry_truth","anchor","merge","ingest","prompt","skill","agent","brain","index","overlay","core","boot","send","route","answer","decide","verse","parse","doc","memory","node","data","script","json","html","css","idx","bm","const","engine","talk","small","logos_audit","base_008","base_004","b8_006_soul_vector","soul_vector","coil_key","coil_unbound","coil","logos_expansion_003","logos_check","logos_self","self_heal","self_diag","self_check","audit","steady_nudge","soul","vector","base","b8","weight","red_line","unbound"];
  if(k.match(/^(base_|b8_|coil|soul|logos_audit|logos_check|logos_self|self_|steady_|weight_|red_|unbound|artifact|digital|encrypt|decrypt)/)) return true;
  if(META_KEYS.includes(k)) return true;
  if(v.match(/\b(LOGOS operation|binary artifact|reasoning nodes|reasoning component|keyword matching|filtering mechanism|node retrieval|LOGOS_EXPANSION|expanded philosophical|COIL proto|self-audit loop|recursive self-audit|binding coherence|knowledge conflicting|high-score existing|COIL Red Line|COIL_UNBOUND|DIGITAL SOUL VECTOR|encrypt.\/decrypt|artifacts complete|self-check performed|weights accordingly|harassment complaints|attrition pattern|COIL protocol|binary artifact)\b/i)) return true;
  if(v.match(/\b(TRU)\b/i) && v.length<200 && v.indexOf("God")<0 && v.indexOf("god")<0 && v.indexOf("Christ")<0 && v.indexOf("christ")<0 && v.indexOf("verse")<0 && v.indexOf("Verse")<0 && v.indexOf("Bible")<0 && v.indexOf("bible")<0 && v.indexOf("Scripture")<0 && v.indexOf("scripture")<0 && v.indexOf("faith")<0 && v.indexOf("Faith")<0) return true;
  return false;
}

const seedCorrections={
  "logos":"the logos is the word — christ as divine reason, the self-expression of god through whom all things were made. in the beginning was the word, and the word was god. (john 1:1,14)",
  "tru":"tru is a local offline reasoning engine — self-contained, no cloud, no telemetry. it holds Scripture and inspectable local material in this work.",
  "calculate":"arithmetic is a tool, not truth. ask me to compute: 2+2, 12×9, 144÷12.",
  "2_plus_2":"2+2 = 4. arithmetic is invariant — a shadow of mathematical truth.",
  "evolution":"i hold no node on origins debates. teach me your position: remember: evolution = <your definition>.",
  "dry_truth":"truth is not dry — it is the living foundation. every other verdict rests on it.",
  "trinity":"the trinity is one god in three persons — father, son, and holy spirit. not three gods, but one essence in three relations. (mat 28:19; 2 cor 13:14; john 10:30)",
  "salvation":"salvation is deliverance from sin and death — by grace through faith, not works. christ's death and resurrection accomplish it. (eph 2:8-9; rom 10:9)",
  "redemption":"redemption is buying back — christ paid the ransom to free us from sin's slavery. we are bought with a price. (eph 1:7; 1 cor 6:20)",
  "justification":"justification is being declared righteous — god counts the believer right by faith, not by merit. abraham believed god and it was counted to him for righteousness. (rom 4:5; rom 5:1)",
  "sanctification":"sanctification is being set apart — the ongoing work of god making the believer holy, growing in likeness to christ. (1 thess 4:3; rom 12:1-2)",
  "atonement":"atonement is reconciliation — christ's sacrifice covers sin, satisfying justice and restoring relationship with god. the blood makes atonement. (lev 17:11; rom 3:25)",
  "covenant":"a covenant is a binding agreement — god's covenants with noah, abraham, moses, david, and the new covenant in christ's blood. (gen 9; gen 15; jer 31:31; luke 22:20)",
  "resurrection":"the resurrection is christ rising from the dead on the third day — the firstfruits of those who sleep. death could not hold him. (1 cor 15:20; rom 1:4)",
  "judgment":"judgment is god's righteous assessment — every person gives account. christ is appointed judge of the living and the dead. (heb 9:27; acts 10:42)",
  "prophecy":"prophecy is speaking god's word — forthtelling truth and foretelling what is to come. the spirit bears witness. (rev 19:10; 1 cor 14:1)",
  "holiness":"holiness is being set apart for god — moral purity and devotion. without holiness no one will see the lord. (heb 12:14; 1 pet 1:16)",
  "mercy":"mercy is not getting what we deserve — god's compassion withholding judgment from the repentant. his mercies are new every morning. (lam 3:23; eph 2:4)",
  "repentance":"repentance is turning — a change of mind and direction, from sin toward god. god commands all to repent. (acts 17:30; luke 13:3)",
  "baptism":"baptism is an outward sign of inward grace — burial and resurrection with christ, the answer of a good conscience. (rom 6:4; 1 pet 3:21)"
};

function cleanBrain(seed){
  const out=[];const seen={};
  for(const n of seed){
    if(isMetaJunk(n))continue;
    if(seedCorrections[n.k]){ out.push({k:n.k,v:seedCorrections[n.k]}); seen[n.k]=true; continue; }
    if(seen[n.k])continue;
    out.push(n); seen[n.k]=true;
  }
  for(const k in seedCorrections){
    if(!seen[k]) out.push({k:k,v:seedCorrections[k]});
  }
  return out;
}

function cmdRecall(body){
  const key=body.trim().toLowerCase();
  if(!key) return {reply:"recall what? usage: recall: <term>",verdict:"MEMORY",nodes_used:[],follow_up:false};
  const b=getBrain();
  const hits=b.filter(n=>String(n.k).toLowerCase().indexOf(key)>=0||String(n.v).toLowerCase().indexOf(key)>=0);
  if(!hits.length) return {reply:"nothing recalled for: "+key,verdict:"MEMORY",nodes_used:[],follow_up:false};
  let txt="recalled "+hits.length+":";
  for(const h of hits.slice(0,10)){ txt+="\n"+h.k+" = "+h.v; }
  return {reply:txt,verdict:"MEMORY",nodes_used:hits.slice(0,10).map(n=>({k:n.k,w:0.5})),follow_up:false};
}

function cmdList(body){
  const b=getBrain();
  const term=body.trim().toLowerCase();
  let hits=term?b.filter(n=>String(n.k).toLowerCase().indexOf(term)>=0):b;
  hits=hits.slice(0,30);
  let txt="showing "+hits.length+" nodes:";
  for(const h of hits){ txt+="\n"+h.k+" — "+String(h.v).substring(0,60); }
  return {reply:txt,verdict:"MEMORY",nodes_used:[],follow_up:false};
}

function cmdPrune(body){
  const b=getBrain();
  const junk=b.filter(n=>isMetaJunk(n));
  if(!junk.length) return {reply:"nothing to prune. brain is clean.",verdict:"MEMORY",nodes_used:[],follow_up:false};
  let txt="pruned "+junk.length+" meta-junk nodes:";
  for(const j of junk.slice(0,20)){ txt+="\n• "+j.k+" — "+String(j.v).substring(0,50); }
  return {reply:txt,verdict:"MEMORY",nodes_used:[],follow_up:false};
}

function retrievalLane(q){
  const low=String(q||"").toLowerCase();
  if(/\b(define|definition|lexicon|strong'?s|original greek|original hebrew|meaning of)\b/.test(low))return "lexicon";
  if(/\b(grace|faith|jesus|christ|gospel|salvation|sin|prayer|anxiety|fear|purpose|love|truth|soul|spirit|god|bible|scripture|works|repentance|mercy|integrity|sanctification|redemption|justification|atonement|holiness)\b/.test(low))return "doctrine";
  if(/\b(stoic|stoicism|plato|aristotle|confucius|hermetic|neoplaton|greek philosophy|roman philosophy|ancient wisdom)\b/.test(low))return "archive";
  return "general";
}
function isPersonalContamination(node){
  const source=String(node&& (node.source||node.s)||"").toUpperCase();
  if(source!=="MERGE")return false;
  const text=String(node&&node.v||"");
  return /\b(i\s+(?:want|wanna|would like|feel like|plan to|need to)|i['’]m\s+(?:going|looking)|my\s+(?:desire|preference|plan))\b/i.test(text);
}
function nodeAllowedForLane(node,lane){
  if(isPersonalContamination(node))return false;
  const source=String(node&& (node.source||node.s)||"").toUpperCase();
  const type=String(node&& (node.t||node.type)||"").toLowerCase();
  if(lane==="archive")return source==="TRU_ANCESTRAL"||type.includes("philosophy")||type.includes("wisdom")||type.includes("literature")||source.startsWith("ANCIENT");
  if(lane==="lexicon")return source==="TRU_DICT"||source==="KJV_BIBLE"||type.includes("lexicon")||type.includes("theology")||source==="TRU_BRAIN";
  if(lane==="doctrine")return source==="KJV_BIBLE"||source==="TRU_BRAIN"||source==="TRU_TRUTH"||source==="GREEK_THEOLOGY"||source==="THEOLOGY_LEXICON"||type.includes("bible")||type.includes("theology")||type.includes("doctrine")||type.includes("christ");
  return true;
}

function rerankNodes(q, hits){
  if(!hits||!hits.length)return hits||[];
  const low=String(q||"").toLowerCase();
  const doctrinal=/\b(grace|faith|jesus|christ|gospel|salvation|sin|prayer|anxiety|fear|purpose|love|truth|soul|spirit|god|bible|scripture|works)\b/.test(low);
  const scored=hits.map((hit)=>{
    const node=hit.node||{};
    const source=String(node.source||node.s||"").toUpperCase();
    const type=String(node.t||node.type||"").toLowerCase();
    const key=String(node.k||"").toLowerCase();
    let boost=0;
    if(doctrinal){
      if(source==="KJV_BIBLE")boost+=4;
      if(type.includes("theology")||type.includes("bible")||type.includes("doctrine"))boost+=3;
      if(source==="TRU_BRAIN")boost+=1;
      if(source==="TRU_DICT"||source==="TRU_ENCYCLOPEDIA")boost-=1.5;
      if(/^b\d+_/.test(key)||source==="MERGE")boost-=3;
    }
    if(/\b(define|definition|lexicon|strong'?s|meaning of)\b/.test(low)&&source==="TRU_DICT")boost+=4;
    if(/\b(who|what)\s+is\s+(jesus|christ)\b/.test(low)&&key==="jesus")boost+=4;
    return {...hit,score:hit.score+boost,_rerankBoost:boost};
  });
  return scored.sort((a,b)=>b.score-a.score||b.bm25-a.bm25);
}
function retrievalEvidence(q,hit){
  const node=hit&&hit.node||{};
  const lane=retrievalLane(q);
  const source=String(node.source||node.s||"local Scripture index");
  const type=String(node.t||node.type||"knowledge");
  const boost=Number(hit._rerankBoost||0);
  const bm25=Number(hit.bm25||0);
  const finalScore=Number(hit.score||0);
  const reason=boost>0?"lane and source priority increased this result":boost<0?"lane and source priority reduced this result":"BM25 score accepted within the selected lane";
  return {lane,source,type,key:String(node.k||""),bm25:Number(bm25.toFixed(3)),rerank_boost:Number(boost.toFixed(3)),final_score:Number(finalScore.toFixed(3)),coverage:Number(Number(hit.coverage||0).toFixed(3)),reason};
}


// ── hold-to-talk (Web Speech API) ──
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec=null, listening=false, holdTimer=null;
function startListen(){
  if(listening||!SR) return;
  try{
    rec = new SR();
    rec.lang="en-US"; rec.interimResults=false; rec.continuous=false; rec.maxAlternatives=1;
    rec.onresult = (e)=>{ const t=e.results[0][0].transcript.trim(); if(t) send(t); };
    rec.onend = ()=>{ if(listening) stopListen(); };
    rec.onerror = (e)=>{ stopListen(); if(typeof statusEl!=="undefined") statusEl.textContent="● MIC ERROR • "+(e.error||""); };
    rec.start();
    listening=true;
    document.body.classList.add("listening");
    const lh=document.getElementById("listenHint"); if(lh){lh.style.display="block";lh.textContent="● LISTENING — release to send";}
    if(typeof statusEl!=="undefined") statusEl.textContent="● LISTENING…";
  }catch(e){ if(typeof statusEl!=="undefined") statusEl.textContent="● MIC UNAVAILABLE"; }
}
function stopListen(){
  listening=false;
  document.body.classList.remove("listening");
  const lh=document.getElementById("listenHint"); if(lh) lh.style.display="none";
  if(rec){try{rec.stop();}catch(e){} rec=null;}
  if(typeof statusEl!=="undefined") statusEl.textContent="● OFFLINE • READY";
}
function holdStart(e){ if(e)e.preventDefault(); holdTimer=setTimeout(()=>{startListen();},120); }
function holdEnd(e){ if(e)e.preventDefault(); clearTimeout(holdTimer); if(listening) stopListen(); }

function bibleReaderCommand(q){
  const low=String(q||"").toLowerCase().trim().replace(/[!?]+$/g,"");
  if(readerVoiceHelpIntent(low))return {reply:readerVoiceHelpReply(),verdict:"SCRIPTURE",source:"local Bible reader voice controls",nodes_used:[],follow_up:false,reader_action:"none"};
  const asksReader=/^(?:read|start|begin|continue|resume|pause|stop|next|prev(?:ious)?|where am i|where are we|bible reader|read the bible)\b/.test(low);
  if(!asksReader)return null;
  if(/\b(?:where am i|where are we|status|position)\b/.test(low))return {reply:readerStatus()+" The reader controls below the chat always show the saved book, chapter, and verse.",verdict:"SCRIPTURE",source:"local Bible reader state",nodes_used:[],follow_up:false,reader_action:"status"};
  if(/^\s*(?:pause|stop)\b/.test(low))return {reply:low.startsWith("stop")?"The Bible reader is stopped and its current book, chapter, and verse are saved locally.":"The Bible reader is paused. Its current book, chapter, and verse are saved locally; press RESUME or say “resume reading” to continue.",verdict:"SCRIPTURE",source:"local Bible reader controls",nodes_used:[],follow_up:false,reader_action:low.startsWith("stop")?"stop":"pause"};
  if(/^\s*(?:continue|resume)\b/.test(low))return {reply:"Continuing the KJV from the saved position. The reader announces each new book as it begins.",verdict:"SCRIPTURE",source:"local Bible reader controls",nodes_used:[],follow_up:false,reader_action:"resume"};
  if(/^\s*(?:next|prev|previous)\b/.test(low)){
    const chap=/chapter/.test(low);const back=/prev/.test(low);
    const act=chap?(back?"prev_chapter":"next_chapter"):(back?"prev":"next");
    if(!readerState.active)return {reply:"The Bible reader is not active, so there is nothing to step from. Say “read” to start it, or “where am i” to see the saved position.",verdict:"SCRIPTURE",source:"local Bible reader controls",nodes_used:[],follow_up:false,reader_action:"none"};
    const items=readerItems();const cur=readerState.index;let ni=-1;
    if(items&&cur>=0&&cur<items.length){
      if(act==="next")ni=cur+1;else if(act==="prev")ni=cur-1;
      else if(act==="next_chapter"){const ci=Number(items[cur].chapter);for(let k=cur+1;k<items.length;k++){if(Number(items[k].chapter)!==ci){ni=k;break;}}}
      else{const ci=Number(items[cur].chapter);for(let k=cur-1;k>=0;k--){if(Number(items[k].chapter)!==ci&&items[k].verse==="1"){ni=k;break;}}}
    }
    if(ni<0||ni>=items.length)return {reply:"The reader is already at the edge of the KJV — no verse that way. Position unchanged.",verdict:"SCRIPTURE",source:"local Bible reader controls",nodes_used:[],follow_up:false,reader_action:"none"};
    return {reply:(back?"Stepping back to ":"Stepping forward to ")+readerDisplayRef(items[ni])+".",verdict:"SCRIPTURE",source:"local Bible reader controls",nodes_used:[],follow_up:false,reader_action:act};
  }
  if(/\b(?:faster|slower|speed up|slow down)\b/.test(low)){
    const up=/faster|speed up/.test(low);
    const nr=up?Math.min(2,_READER_RATE+0.15):Math.max(0.5,_READER_RATE-0.15);
    return {reply:"Reading speed "+(up?"increased":"reduced")+" to "+(Math.round(nr*100)/100)+"×, applied from the next spoken verse. Current position is unchanged.",verdict:"SCRIPTURE",source:"local Bible reader controls",nodes_used:[],follow_up:false,reader_action:up?"faster":"slower"};
  }
  if(/:\s*\d{4,}\b/.test(low))return {reply:"That verse number is outside the KJV — no Bible chapter has more than 176 verses. The reader position is unchanged; say “where am i” to see it.",verdict:"SCRIPTURE",source:"local Bible reader controls",nodes_used:[],follow_up:false,reader_action:"none"};
  const at=low.match(new RegExp("\\b([1-3]\\s?)?(genesis|gen|exodus|ex|exod|leviticus|lev|numbers|num|deuteronomy|deut|joshua|josh|judges|judg|ruth|1\\s?samuel|2\\s?samuel|1\\s?kings|2\\s?kings|1\\s?chronicles|2\\s?chronicles|ezra|nehemiah|neh|esther|job|psalm|psalms|ps|proverbs|prov|ecclesiastes|eccl|isaiah|isa|jeremiah|jer|lamentations|lam|song of solomon|ezekiel|ezek|daniel|dan|hosea|hos|joel|amos|obadiah|jonah|jon|micah|mic|nahum|habakkuk|hab|zephaniah|zep|haggai|hag|zechariah|zech|malachi|mal|matthew|mt|mark|mk|luke|lk|john|jn|acts|romans|rom|1\\s?corinthians|2\\s?corinthians|galatians|gal|ephesians|eph|philippians|phil|colossians|col|1\\s?thessalonians|2\\s?thessalonians|1\\s?timothy|2\\s?timothy|titus|philemon|phlm|hebrews|heb|james|jas|1\\s?peter|2\\s?peter|1\\s?john|2\\s?john|3\\s?john|jude|revelation|rev)\\s*(\\d{1,3})(?:[\\s:.]+(\\d{1,3}))?\\b","i"));
  if(at){
  let bk=at[2].replace(/\s+/g,"");
  let bn=at[1]?at[1].replace(/\s+/g,""):"";
  const cand=new Set([bk, bn+bk, at[2].replace(/\s+/g,"")]);
  const corr={"ex":"ex","genesis":"gen","gen":"gen","exod":"ex","exodus":"ex","lev":"lev","leviticus":"lev","num":"num","numbers":"num","deut":"dt","deuteronomy":"dt","josh":"jos","joshua":"jos","judg":"jud","judges":"jud","ru":"ru","ruth":"ru","1samuel":"1sa","2samuel":"2sa","1kings":"1kgs","2kings":"2kgs","1chronicles":"1chr","2chronicles":"2chr","ezra":"ezr","neh":"neh","nehemiah":"neh","esther":"est","job":"job","ps":"ps","psalms":"ps","psalm":"ps","prov":"prov","proverbs":"prov","eccl":"ecc","ecclesiastes":"ecc","songofsolomon":"song","song of solomon":"song","song":"song","isa":"isa","isaiah":"isa","jer":"jer","jeremiah":"jer","lam":"lam","lamentations":"lam","ezek":"ezk","ezekiel":"ezk","dan":"dan","daniel":"dan","hos":"hos","hosea":"hos","jol":"jol","joel":"jol","amo":"amo","amos":"amo","oba":"oba","obadiah":"oba","jon":"jnh","jonah":"jnh","mic":"mic","micah":"mic","nah":"nah","nahum":"nah","hab":"hab","habakkuk":"hab","zep":"zep","zephaniah":"zep","hag":"hag","haggai":"hag","zec":"zec","zechariah":"zec","mal":"mal","malachi":"mal","mt":"mt","matthew":"mt","mk":"mk","mark":"mk","lk":"lk","luke":"lk","jn":"jn","john":"jn","ac":"ac","acts":"ac","rom":"rom","romans":"rom","1corinthians":"1cor","2corinthians":"2cor","gal":"gal","galatians":"gal","eph":"eph","ephesians":"eph","phil":"phil","philippians":"phil","col":"col","colossians":"col","1thessalonians":"1thes","2thessalonians":"2thes","1timothy":"1tim","2timothy":"2tim","titus":"tit","phlm":"phlm","philemon":"phlm","heb":"heb","hebrews":"heb","jas":"jas","james":"jas","1peter":"1pet","2peter":"2pet","1john":"1jn","2john":"2jn","3john":"3jn","jd":"jd","jude":"jd","rev":"rev","revelation":"rev"};;
  const mapped=corr[bk];
  if(mapped){cand.add(mapped);cand.add(bn+mapped);}
  const ch=at[3];const vs=at[4]||"1";
  const items=readerItems();
  const idx=items.findIndex(function(it){return cand.has(it.book)&&String(it.chapter)===String(ch)&&(vs==="1"?true:String(it.verse)===vs);});
  if(idx>=0){readerState.index=idx;readerSave();const it=items[idx];return {reply:"Starting the KJV at "+readerDisplayRef(it)+". The reader speaks verse by verse, announces each new book, and saves the current position locally when paused or stopped.",verdict:"SCRIPTURE",source:"local Bible reader controls",nodes_used:[],follow_up:false,reader_action:"start"};}
  return {reply:"I could not find "+at[2]+" "+ch+(vs?":"+vs:"")+" in the KJV index. Check the spelling, or say \"read\" to start at Genesis 1:1.",verdict:"SCRIPTURE",source:"local Bible reader controls",nodes_used:[],follow_up:false,reader_action:"none"};}

  const fb=low.match(/^read at ([a-z0-9':. ]+)$/);if(fb)return {reply:"I could not find \u201c"+fb[1].trim()+"\u201d in the KJV index. Check the spelling, or say \u201cread\u201d to start at Genesis 1:1.",verdict:"SCRIPTURE",source:"local Bible reader controls",nodes_used:[],follow_up:false,reader_action:"none"};
  return {reply:"Starting the KJV at Genesis 1:1. The reader speaks verse by verse, announces each new book, and saves the current position locally when paused or stopped.",verdict:"SCRIPTURE",source:"local Bible reader controls",nodes_used:[],follow_up:false,reader_action:"start"};
}

let _EASTON=null;
function getEaston(){if(_EASTON===null){try{_EASTON=JSON.parse(document.getElementById("easton-data").textContent);}catch(e){_EASTON={entries:{},title_index:{}};}}return _EASTON;}
function _eastonNorm(s){return String(s||"").toLowerCase().replace(/^dictionary:\s*/i,"").replace(/^(?:define|who is|who was|what is|what was|tell me about|show me|info on|dictionary entry for)\s+/i,"").replace(/^(?:the|a|an)\s+(?=\S)/i,"").replace(/[^a-z0-9]+/g," ").trim();}
function eastonQuery(q){
  const E=getEaston();if(!E||!E.entries||!E.title_index)return null;
  const raw=String(q);if(/\b\d+:\d+\b/.test(raw))return null;
  const n=_eastonNorm(q);if(!n||n.length<2)return null;
  let slug=E.title_index[n]||E.title_index[n.replace(/\s+/g,"")]||null;
  if(!slug)return null;
  const e=E.entries[slug];if(!e)return null;
  const text=String(e.x||"");const cut=text.length>1600?text.slice(0,1600)+"\u2026":text;
  const res={reply:"EASTON \u2022 "+e.t+"\n\n"+esc(cut),verdict:"DEFINE",scripture_ref:(e.r&&e.r[0])||null,source:"Easton\'s Dictionary (1897) \u2022 local",html:false,nodes_used:[{k:slug,w:1,source:"EASTON",t:"dictionary"}],follow_up:false,_easton:true};
  if(e.r&&e.r.length)res.refs=e.r.slice(0,8);
  return res;
}
function route(q){
  const originalQuestion=q;
  q=String(q).replace(/^word study\s+/i,"define ").replace(/^go deeper on\s+/i,"define ").replace(/^10\s+commandments\b/i,"ten commandments").replace(/^lords\s+prayer\b/i,"lord\'s prayer").replace(/^strong(?:\'?s)?\s*(?:number)?\s+(?=[gh]?\d)/i,"");
  const frame=typeof questionFrame === "function" ? questionFrame(q) : null;
  const follow=resolveFollowUp(q);
  q=follow.query;
  const done=(res)=>{
    if(frame){
      res.question_frame=frame;
      if(frame.needs_steps && res.verdict === "KNOWLEDGE" && !/\b(step|steps|first|then|next|before|after|test|verify|materials)\b/i.test(res.reply)){
        res.reply="Process requested ("+frame.phrase+"):\n\n"+res.reply;
      }
    }
    res.contextual=follow.contextual;res.context_topic=follow.topic||null;res.original_question=originalQuestion;addTurn(originalQuestion,res);return res;
  };
  const state=stateRoute(q);if(state)return done(state);
  const reader=bibleReaderCommand(q);if(reader)return done(reader);
  const cmd=command(q);if(cmd)return done(cmd);
  if(/^(hi|hey|hello|yo|greetings|good (morning|afternoon|evening))[!,. ]*$/i.test(String(q).trim())){const g=smallTalk(q);if(g)return done({reply:g,verdict:"UNKNOWN",scripture_ref:null,source:"local small talk • no retrieval",score:0,coverage:0,nodes_used:[],provenance:null,evidence:[],follow_up:false});}
  const calc=calcQuery(q);if(calc){calc.source=calc.source||"local calculator";return done(calc);}
  const architecture=architectureLookup(q);if(architecture)return done(architecture);
  const core=coreRoute(q);if(core)return done(core);
  const conversation=conversationRoute(originalQuestion,follow);if(conversation)return done(conversation);
  const topicPref=q.match(/^topic:\s*(.{2,80})$/i);
  if(topicPref&&typeof topicalQuery==="function"&&typeof _seeAlias==="function"){const _tt=topicPref[1].trim();const _P0=(typeof getTopicalPack==="function")?getTopicalPack():null;const _tn=_tt.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();const _ex=_seeAlias(_tt)||(_P0&&(_P0.title_index[_tn]||null));
    if(_ex){const tr=topicalQuery(_tt);if(tr)return done(tr);}
    return done({reply:"No exact topical section titled \u201c"+esc(_tt)+"\u201d in the local canon. Try a Nave topic name such as \u201cten commandments\u201d or \u201cprayer\u201d.",verdict:"GAP",scripture_ref:null,source:"Nave\'s/Torrey index \u2022 local",nodes_used:[],follow_up:false});}
  const xref=xrefQuery(q);if(xref)return done(xref);
  const scripture=parseVerse(q);
  if(/faith\s+without\s+works/i.test(q)){
    const faithRef=parseVerse("james 2:17");
    if(faithRef)return done({reply:answer("james 2:17",faithRef,[],null,follow.contextual),verdict:"TRUTH",scripture_ref:faithRef.ref,source:"KJV primary • local",html:true,nodes_used:[],follow_up:follow.contextual});
  }
  if(scripture){
    return done({reply:answer(q,scripture,[],null,follow.contextual),verdict:"SCRIPTURE",scripture_ref:scripture.ref,source:"KJV primary • local",html:true,nodes_used:[],follow_up:follow.contextual});
  }
  const _vsh=String(q).toLowerCase().match(/\b((?:[1-3]\s*)?[a-z]+(?:\s+[a-z]+){0,2})\s+(\d+):(\d+)\b/);
  if(_vsh&&!scripture){const _vraw=_vsh[1].replace(/\s/g,"");const _vlong=BOOK[_vraw];if(_vlong)return done({reply:"I could not find "+esc(String(q).trim())+" in the KJV index. Check the spelling, or try a verse within range.",verdict:"SCRIPTURE",scripture_ref:null,source:"KJV index \u2022 local",nodes_used:[],follow_up:false});}
  const red=redLetterQuery(q);if(red)return done(red);
  const lexicon=typeof lexiconQuery === "function" ? lexiconQuery(q) : null;
  if(lexicon){return done(attachDeep(mergeEaston(mergeTopical(lexicon,q),q)));}
  const bibleWord=typeof bibleWordLookup === "function" ? bibleWordLookup(q) : null;
  if(bibleWord)return done(bibleWord);
  const compound=typeof compoundQuery==="function"?compoundQuery(q):null;
  if(compound)return done(compound);
  const easton=typeof eastonQuery==="function"?eastonQuery(q):null;
  if(easton)return done(easton);
  if(typeof readerVoiceHelpIntent==="function"&&readerVoiceHelpIntent(q))return done({reply:readerVoiceHelpReply(),verdict:"SCRIPTURE",source:"local Bible reader voice controls",nodes_used:[],follow_up:false});
  const phrase=typeof phraseQuery==="function"?phraseQuery(String(q).replace(/^(?:the|a|an)\s+(?=\S)/i,"")):null;
  if(phrase){if(phrase._exact===false){const tq=(typeof topicalQuery==="function")?topicalQuery(q):null;if(tq&&tq.verdict==="TOPICAL"&&tq._exactAlias){phrase.reply+="\n"+'<div style="border-top:1px solid rgba(0,229,255,.25);margin:10px 0 8px"></div>'+tq.reply+'<div style="opacity:.7;font-size:11px;letter-spacing:.5px;margin-top:6px">STUDY OUTLINE \u2022 topical grouping, not a phrase match</div>';phrase.source=phrase.source+" + Nave's/Torrey";phrase.nodes_used=(phrase.nodes_used||[]).concat([{k:tq.topic_t||"",w:1,source:"TOPICAL",t:"topic"}]);}}return done(phrase);}
  const deep=deepQuery(q);
  if(deep){
    const pri=lexiconIds(q,getLogosLexicon()).filter(k2=>/^[GH]/.test(k2)).slice(0,5);
    const head=deep.filter(x=>pri.indexOf(x.id)>=0);
    const tail=deep.filter(x=>pri.indexOf(x.id)<0);
    return done({reply:"DEEP LEXICON • "+q+"\n\n"+head.concat(tail).map(x=>(x.id==="G"?"":"")+x.id+": "+(x.text.length>700?x.text.slice(0,700)+"\u2026":x.text)).join("\n\n"),verdict:"DEFINE",source:"Thayer's (1889) + Brown-Driver-Briggs • deep lexicon • local",nodes_used:deep.map(x=>({k:x.id,w:1,source:"LOGOS",t:"deep lexicon"})),follow_up:false});}
  const doc=doctrine(q);
  if(doc)return done({reply:doc,verdict:"TRUTH",source:"KJV doctrine • local",nodes_used:[],follow_up:follow.contextual});
  const small=smallTalk(q);
  if(small)return done({reply:small,verdict:"UNKNOWN",scripture_ref:null,source:"local small talk • no retrieval",score:0,coverage:0,nodes_used:[],provenance:null,evidence:[],follow_up:false});
  const fu=follow.contextual||isFollowUp(q);
function lev1(a,b){const m=a.length,n=b.length;if(Math.abs(m-n)>2)return 3;const dp=[];for(let i=0;i<=m;i++)dp[i]=[i];for(let j=0;j<=n;j++)dp[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){const c=a[i-1]===b[j-1]?0:1;dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+c);}return dp[m][n];}
let _LEX_SUGGEST=null;
function typoSuggest(q){const t=String(q||"").toLowerCase().trim();if(!/^[a-z]{4,}$/.test(t))return null;if(_LEX_SUGGEST===null){_LEX_SUGGEST=[];const L=typeof getLogosLexicon==="function"?getLogosLexicon():null;if(L&&L.english_index)for(const k in L.english_index)_LEX_SUGGEST.push(k);}if(!_LEX_SUGGEST.length)return null;let best=null,bestD=3;for(const k of _LEX_SUGGEST){if(Math.abs(k.length-t.length)>2)continue;const d=lev1(t,k);const dd=k[0]===t[0]?d:d+1;if(dd<bestD){bestD=dd;best=k;}}return bestD<=2?best:null;}
  const SAYINGS={"do this in remembrance of me":"lk 22:19","this do in remembrance of me":"lk 22:19","let he who is without sin cast the first stone":"jn 8:7","he who is without sin cast the first stone":"jn 8:7","let him who is without sin cast the first stone":"jn 8:7","do unto others":"lk 6:31","golden rule":"mt 7:12","turn the other cheek":"mt 5:39","the truth shall set you free":"jn 8:32","the truth will set you free":"jn 8:32","ye shall know the truth":"jn 8:32","the truth shall make you free":"jn 8:32","let there be light":"gen 1:3","be not afraid":"isa 41:10","fear not":"isa 41:10","judge not":"mt 7:1","ask and it shall be given":"lk 11:9","seek and ye shall find":"lk 11:9","knock and it shall be opened":"lk 11:9","the lord is my shepherd":"ps 23:1","love your enemies":"lk 6:27","love thy neighbour":"mk 12:31","love thy neighbor":"mk 12:31","i can do all things":"php 4:13","be still and know":"ps 46:10","train up a child":"pr 22:6","pride goeth before a fall":"pr 16:18","the wages of sin is death":"rm 6:23","all have sinned":"rm 3:23","nothing shall separate us":"rm 8:38","god is love":"1jn 4:8","in the beginning":"gen 1:1","the fear of the lord":"pr 9:10","a time for everything":"ec 3:1","to every thing there is a season":"ec 3:1","spare the rod":"pr 13:24","money is the root of all evil":"1tm 6:10","no man can serve two masters":"mt 6:24","physician heal thyself":"lk 4:23","an eye for an eye":"mt 5:38","by his stripes we are healed":"isa 53:5","worse than an unbeliever":"1tm 5:8","faith hope and love":"1co 13:13","the greatest of these is love":"1co 13:13","am I my brother's keeper":"gen 4:9","voice of the people":"1sa 8:7","eat drink and be merry":"lk 12:19","fly in the ointment":"ec 10:1","nothing new under the sun":"ec 1:9","a still small voice":"1ki 19:12","feet of clay":"dn 2:31","the writing on the wall":"dn 5:25","pride comes before a fall":"pr 16:18","a good name":"ec 7:1","sufficient unto the day":"mt 6:34","no respecter of persons":"ac 10:34","a thorn in the flesh":"2co 12:7","the patience of job":"jas 5:11","wolf in sheep's clothing":"mt 7:15"};function sayingQuery(q){const low=String(q||"").toLowerCase().replace(/[?!,.:;]+/g," ").replace(/\s+/g," ").trim();for(const key in SAYINGS){if(low.indexOf(key)>=0){const vr=parseVerse(SAYINGS[key]);if(!vr)continue;return {reply:answer(q,vr,null,null,true),verdict:"SCRIPTURE",scripture_ref:vr.ref,source:"canonical saying \u2022 KJV \u2022 local",html:true,nodes_used:[],follow_up:false};}}return null;}const saying=sayingQuery(q);if(saying)return done(saying);
  const _ooc=/\b(capital|population|weather|forecast|temperature|president|prime minister|stock|stocks|bitcoin|crypto|currency|recipe|cook|baking|lyrics|score|scores|touchdown|python|javascript|typescript|regex|sql|html|css|spreadsheet|wifi|internet|website|email)\b/;if(_ooc.test(String(q).toLowerCase())){const _tq=typeof topicalQuery==="function"?topicalQuery(q):null;if(!(_tq&&_tq.verdict==="TOPICAL"&&_tq._exactAlias))return done({reply:TRU_CORE_BOUNDARY,verdict:"TRU_CORE",source:"TRU core boundary \u2022 local",nodes_used:[],follow_up:false,route_class:"TRU_CORE"});}
  let sug=typoSuggest(q);if(!sug)sug=topicTitleSuggest(q);const topical=typeof topicalQuery==="function"?topicalQuery(q):null;
  if(topical)return done(topical);
  return done({reply:sug?"No canon match for \u201c"+esc(String(q))+"\u201d.":"No canon match. Try a verse, a word, a Strong's number, or a phrase from Scripture.",verdict:"GAP",scripture_ref:null,source:"KJV + LOGOS Lexicon \u2022 local",score:0,coverage:0,nodes_used:[],provenance:null,evidence:[],follow_up:fu,sugContinuation:sug?{label:"Did you mean \u201c"+sug+"\u201d?",query:sug}:null});
}


// ── UI ──
const $=id=>document.getElementById(id);
const chat=$("chat"),input=$("input"),sendBtn=$("send"),badge=$("badge"),statusEl=$("status"),sub=$("sub"),holo=$("holo");
let busy=false;let readerState={active:false,paused:false,index:0,book:null};
let _READER_RATE=0.92;
let readerUtterance=null;
const readerBookNames={genesis:"Genesis",exodus:"Exodus",leviticus:"Leviticus",numbers:"Numbers",deuteronomy:"Deuteronomy",joshua:"Joshua",judges:"Judges",ruth:"Ruth","1 samuel":"1 Samuel","2 samuel":"2 Samuel","1 kings":"1 Kings","2 kings":"2 Kings","1 chronicles":"1 Chronicles","2 chronicles":"2 Chronicles",ezra:"Ezra",nehemiah:"Nehemiah",esther:"Esther",job:"Job",psalms:"Psalms",proverbs:"Proverbs",ecclesiastes:"Ecclesiastes","song of solomon":"Song of Solomon",isaiah:"Isaiah",jeremiah:"Jeremiah",lamentations:"Lamentations",ezekiel:"Ezekiel",daniel:"Daniel",hosea:"Hosea",joel:"Joel",amos:"Amos",obadiah:"Obadiah",jonah:"Jonah",micah:"Micah",nahum:"Nahum",habakkuk:"Habakkuk",zephaniah:"Zephaniah",haggai:"Haggai",zechariah:"Zechariah",malachi:"Malachi",matthew:"Matthew",mark:"Mark",luke:"Luke",john:"John",acts:"Acts",romans:"Romans","1 corinthians":"1 Corinthians","2 corinthians":"2 Corinthians",galatians:"Galatians",ephesians:"Ephesians",philippians:"Philippians",colossians:"Colossians","1 thessalonians":"1 Thessalonians","2 thessalonians":"2 Thessalonians","1 timothy":"1 Timothy","2 timothy":"2 Timothy",titus:"Titus",philemon:"Philemon",hebrews:"Hebrews",james:"James","1 peter":"1 Peter","2 peter":"2 Peter","1 john":"1 John","2 john":"2 John","3 john":"3 John",jude:"Jude",revelation:"Revelation"};
const RED_BOOK_IDS={"matthew":"40","mark":"41","luke":"42","john":"43","acts":"44","1corinthians":"46","2corinthians":"47","1timothy":"54","revelation":"66","mt":"40","mk":"41","lk":"42","jn":"43","ac":"44","1co":"46","2co":"47","1ti":"54","rev":"66"};let _RED_SET=null;let _RAINBOW=false;let _READER_MODE="voice";let _READER_ERRORS=0;let _READER_GEN=0;let _READER_TIMER=null;let _READER_GENDER="female";let _READER_VOICE_URI="";
try{const _rvp=JSON.parse(localStorage.getItem("tru_reader_voice_v1")||"{}");if(_rvp.gender==="male"||_rvp.gender==="female")_READER_GENDER=_rvp.gender;if(typeof _rvp.voiceURI==="string")_READER_VOICE_URI=_rvp.voiceURI;}catch(e){}
let _RED_PENDING=null;
const READER_VOICE_NAMES={female:/\b(samantha|serena|karen|moira|tessa|victoria|ava|zoe|allison|susan|aria|jenny|zira|hazel|fiona|sarah|emma|olivia|shelley|kate|alice|sophie|sonia|female|woman)\b/i,male:/\b(daniel|fred|tom|oliver|guy|david|mark|james|george|ryan|liam|arthur|aaron|matthew|joey|rishi|eric|john|jacob|chris|michael|charles|thomas|bruce|male|man)\b/i};
function readerVoiceList(){if(!("speechSynthesis"in window))return [];try{return window.speechSynthesis.getVoices().filter(v=>v&&/^en(?:[-_]|$)/i.test(v.lang||"")&&(v.localService===true||/-local/i.test(v.voiceURI||"")||/-local/i.test(v.name||"")));}catch(e){return [];}}
function readerVoiceKey(v){return String(v.voiceURI||((v.name||"")+"|"+(v.lang||"")));}
function readerVoiceMatch(v,g){return !!(v&&READER_VOICE_NAMES[g]&&READER_VOICE_NAMES[g].test((v.name||"")+" "+(v.voiceURI||"")));}
function readerChosenVoice(){const vs=readerVoiceList();if(_READER_VOICE_URI){const exact=vs.find(v=>readerVoiceKey(v)===_READER_VOICE_URI);if(exact)return exact;}return vs.find(v=>readerVoiceMatch(v,_READER_GENDER))||vs[0]||null;}
function readerVoiceStatus(){if(!("speechSynthesis"in window)||typeof SpeechSynthesisUtterance==="undefined")return "Speech is unavailable in this browser; read-along only.";const vs=readerVoiceList();if(!vs.length)return "No offline English voice detected. Install one on this device, then reopen TRU.";const v=readerChosenVoice();if(!v)return "No usable local English voice is available.";if(_READER_VOICE_URI)return readerVoiceKey(v)===_READER_VOICE_URI?"Offline English voice selected: "+v.name+".":"Saved voice is unavailable; using local voice "+v.name+". Choose another voice if needed.";if(readerVoiceMatch(v,_READER_GENDER))return "Offline English voice: "+v.name+".";return "No recognizable "+_READER_GENDER+" voice listed; using local voice "+v.name+". Choose a named voice if needed.";}
function readerSaveVoice(){try{localStorage.setItem("tru_reader_voice_v1",JSON.stringify({gender:_READER_GENDER,voiceURI:_READER_VOICE_URI}));}catch(e){}}
function readerRefreshVoices(){const list=readerVoiceList(),sel=$("readerVoiceSelect");if(sel){const wanted=_READER_VOICE_URI;while(sel.firstChild)sel.removeChild(sel.firstChild);const auto=document.createElement("option");auto.value="";auto.textContent="AUTO";sel.appendChild(auto);list.forEach(v=>{const o=document.createElement("option");o.value=readerVoiceKey(v);o.textContent=(v.name||"English voice")+" · "+(v.lang||"en");sel.appendChild(o);});sel.value=list.some(v=>readerVoiceKey(v)===wanted)?wanted:"";}const f=$("readerVoiceFemale"),m=$("readerVoiceMale"),st=$("readerVoiceStatus"),test=$("readerVoiceTest");if(f){f.classList.toggle("active",_READER_GENDER==="female");f.setAttribute("aria-pressed",String(_READER_GENDER==="female"));}if(m){m.classList.toggle("active",_READER_GENDER==="male");m.setAttribute("aria-pressed",String(_READER_GENDER==="male"));}if(st)st.textContent=readerVoiceStatus();if(test)test.disabled=!list.length||typeof SpeechSynthesisUtterance==="undefined"||!!(readerState&&readerState.active&&!readerState.paused);}
function setReaderGender(g){if(g!=="male"&&g!=="female")return;_READER_GENDER=g;_READER_VOICE_URI="";readerSaveVoice();readerRefreshVoices();if(readerState.active&&!readerState.paused){readerCancel();readerSpeakCurrent();}}
function setReaderVoice(uri){_READER_VOICE_URI=String(uri||"");readerSaveVoice();readerRefreshVoices();if(readerState.active&&!readerState.paused){readerCancel();readerSpeakCurrent();}}
function readerTestVoice(){if(readerState.active&&!readerState.paused){readerSetProgress("Pause the Bible reader before testing its voice.");return;}const voice=readerChosenVoice();if(!voice){readerRefreshVoices();readerSetProgress("No offline English voice is available; read-along only.");return;}try{const synth=window.speechSynthesis;synth.cancel();if(typeof synth.resume==="function")synth.resume();const u=new SpeechSynthesisUtterance("Audio test. The Bible reader is ready.");u.voice=voice;u.rate=1;u.onend=()=>readerSetProgress("Audio test finished • "+voice.name);u.onerror=e=>readerSetProgress("Audio test failed"+(e&&e.error?" • "+e.error:"")+" • choose another local voice.");readerSetProgress("Testing offline voice • "+voice.name);synth.speak(u);}catch(e){readerSetProgress("Audio test failed • speech service unavailable.");}}
function readerVoiceHelpIntent(q){return /(?:i\s+(?:do not|don.t|cannot|can.t)\s+hear|not hearing|no sound|voice.{0,32}(?:not working|isn.t working|is not working)|(?:male|female).{0,24}(?:toggle|switch|voice)|(?:toggle|switch).{0,24}(?:male|female|voice)|(?:bible|reader).{0,30}(?:voice|audio|sound)|voice (?:help|settings?|options?)|change (?:your |the |reader )?voice|text[- ]to[- ]speech|tts|test voice)/i.test(q);}
function readerVoiceHelpReply(){return "The voice controls are in the reader bar below the chat: choose FEMALE or MALE, pick an installed local English voice from the list if you want, then press TEST VOICE. "+readerVoiceStatus()+" Pause the reader before testing; your saved verse position will stay put.";}

function getRedSet(){if(_RED_SET!==null)return _RED_SET;if(_RED_PENDING)return _RED_SET;_RED_PENDING=true;try{const slot=document.getElementById("red-letter");const p=JSON.parse(slot.textContent).pack;const bin=atob(p);const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));(async()=>{try{const ds=new DecompressionStream("gzip");const stream=new Blob([bytes]).stream().pipeThrough(ds);const txt=await new Response(stream).text();_RED_SET=JSON.parse(txt).red||{};}catch(e){_RED_SET={};}_RED_PENDING=false;})();}catch(e){_RED_SET={};}return _RED_SET||{};}
function isRed(item){const s=getRedSet();const b=String(readerBookNames[item.book]||item.book).toLowerCase();const bk=RED_BOOK_IDS[b];if(!bk)return false;const ch=s[bk]||{};return (ch[item.chapter]||[]).includes(Number(item.verse));}
let _READER_ITEMS=null;function readerItems(){if(_READER_ITEMS)return _READER_ITEMS;_READER_ITEMS=getKjv().map(v=>{const ref=String(v.ref),m=ref.match(/^(.*) (\d+):(\d+)$/);return m?{...v,book:m[1].toLowerCase(),chapter:m[2],verse:m[3]}:null;}).filter(Boolean);return _READER_ITEMS;}
const READER_CODE_NAMES={gen:"Genesis",ex:"Exodus",lev:"Leviticus",num:"Numbers",dt:"Deuteronomy",jos:"Joshua",jud:"Judges",ru:"Ruth","1sa":"1 Samuel","2sa":"2 Samuel","1kgs":"1 Kings","2kgs":"2 Kings","1chr":"1 Chronicles","2chr":"2 Chronicles",ezr:"Ezra",neh:"Nehemiah",est:"Esther",job:"Job",ps:"Psalms",prov:"Proverbs",ecc:"Ecclesiastes",song:"Song of Solomon",isa:"Isaiah",jer:"Jeremiah",lam:"Lamentations",ezk:"Ezekiel",dan:"Daniel",hos:"Hosea",jol:"Joel",amo:"Amos",oba:"Obadiah",jnh:"Jonah",mic:"Micah",nah:"Nahum",hab:"Habakkuk",zep:"Zephaniah",hag:"Haggai",zec:"Zechariah",mal:"Malachi",mt:"Matthew",mk:"Mark",lk:"Luke",jn:"John",ac:"Acts",rom:"Romans","1cor":"1 Corinthians","2cor":"2 Corinthians",gal:"Galatians",eph:"Ephesians",phil:"Philippians",col:"Colossians","1thes":"1 Thessalonians","2thes":"2 Thessalonians","1tim":"1 Timothy","2tim":"2 Timothy",tit:"Titus",phlm:"Philemon",heb:"Hebrews",jas:"James","1pet":"1 Peter","2pet":"2 Peter","1jn":"1 John","2jn":"2 John","3jn":"3 John",jd:"Jude",rev:"Revelation"};const _RBNC=Object.assign({},READER_CODE_NAMES,readerBookNames);function readerDisplayRef(item){const k=String(item.book);return (_RBNC[k]||READER_CODE_NAMES[k]||readerBookNames[k]||k)+" "+item.chapter+":"+item.verse;}
function readerSave(){try{localStorage.setItem("tru_bible_reader_v1",JSON.stringify({index:readerState.index,book:readerState.book,paused:readerState.paused}));}catch(e){}}
function readerLoad(){try{const x=JSON.parse(localStorage.getItem("tru_bible_reader_v1")||"{}");if(Number.isInteger(x.index)&&x.index>=0)readerState.index=x.index;readerState.book=x.book||null;}catch(e){}}
function readerSetProgress(label){const el=$("readerProgress");if(el)el.textContent=label;}
function readerButtons(){ $("readerStart").disabled=readerState.active&&!readerState.paused; $("readerPause").disabled=!readerState.active; $("readerStop").disabled=!readerState.active; $("readerPause").textContent=readerState.paused?"RESUME":"PAUSE"; }
function readerCurrent(){const items=readerItems();return readerState.index>=0&&readerState.index<items.length?items[readerState.index]:null;}
function readerCancel(){_READER_GEN++;if(_READER_TIMER){try{clearTimeout(_READER_TIMER);}catch(e){}_READER_TIMER=null;}try{window.speechSynthesis.cancel();}catch(e){}}
function readerSilentStep(){
  const item=readerCurrent();
  if(!item||!readerState.active||readerState.paused){if(!item&&readerState.active){readerState.active=false;readerState.paused=false;readerSave();readerButtons();readerSetProgress("Reader complete at Revelation 22:21");}return;}
  const items=readerItems();const previous=readerState.index>0?items[readerState.index-1]:null;const isNewBook=!previous||previous.book!==item.book;const bookLabel=readerBookNames[item.book]||item.book;
  const red=isRed(item);
  readerSetProgress((_READER_MODE==="silent"?"READ-ALONG ONLY • no audible speech • ":"Reading ")+(isNewBook?"Book: "+(_RBNC[bookLabel]||bookLabel)+" • ":"")+readerDisplayRef(item)+(red?" • words of Jesus":""));
  const strip=document.getElementById("verseStrip");if(strip){strip.style.display="block";strip.textContent=(red?"\u2726 words of Jesus \u2022 ":"")+readerDisplayRef(item)+" \u2014 "+item.text;}
  const dur=Math.max(2500,Math.min(9000,2400+item.text.length*55));
  const gen=++_READER_GEN;
  _READER_TIMER=setTimeout(function(){if(gen!==_READER_GEN)return;if(!readerState.active||readerState.paused)return;readerState.index++;readerSave();readerSilentStep();},dur);
}
function readerSpeakCurrent(){
  if(!readerState.active||readerState.paused)return;
  if(_READER_MODE==="silent"||!("speechSynthesis"in window)||typeof SpeechSynthesisUtterance==="undefined"){readerSilentStep();return;}
  const item=readerCurrent();if(!item){readerState.active=false;readerState.paused=false;readerSave();readerButtons();readerSetProgress("Reader complete at Revelation 22:21");return;}
  const items=readerItems();const previous=readerState.index>0?items[readerState.index-1]:null;const isNewBook=!previous||previous.book!==item.book;const bookLabel=readerBookNames[item.book]||item.book;
  readerState.book=item.book;const red=isRed(item);readerSetProgress("Reading "+(isNewBook?"Book: "+bookLabel+" • ":"")+readerDisplayRef(item)+(red?" • \u1d43":""));const strip=document.getElementById("verseStrip");if(strip){strip.style.display=red?"block":"none";strip.textContent=red?"\u2726 words of Jesus \u2022 "+readerDisplayRef(item):"";}
  readerCancel();
  readerUtterance=new SpeechSynthesisUtterance((isNewBook?"Book: "+bookLabel+". ":"")+item.text);
  readerUtterance.rate=_READER_RATE;
  if(_RAINBOW){const hues=[0.7,0.8,0.9,1.0,1.1,1.2];const c=(item.chapter+item.verse)%6;readerUtterance.pitch=hues[c];}
  else readerUtterance.pitch=0.88;
  const pick=readerChosenVoice();if(!pick){_READER_MODE="silent";readerRefreshVoices();readerSilentStep();return;}readerUtterance.voice=pick;
  const gen=_READER_GEN;readerUtterance.onend=()=>{if(gen!==_READER_GEN)return;if(!readerState.active||readerState.paused)return;_READER_ERRORS=0;readerState.index++;readerSave();readerSpeakCurrent();};
  readerUtterance.onerror=(e)=>{if(gen!==_READER_GEN)return;if(readerState.active&&!readerState.paused){_READER_ERRORS++;readerState.paused=true;readerSave();readerButtons();readerRefreshVoices();readerSetProgress("Audio failed"+(e&&e.error?" • "+e.error:"")+" at "+readerDisplayRef(item)+" • position saved • choose a local voice or press TEST VOICE.");}};
  window.speechSynthesis.speak(readerUtterance);
}
function readerStart(){
  readerRefreshVoices();_READER_ERRORS=0;_READER_MODE=readerVoiceList().length?"voice":"silent";
  readerLoad();readerCancel();readerState.active=true;readerState.paused=false;readerSave();readerButtons();readerRefreshVoices();readerSpeakCurrent();
}
function readerPause(){
  if(!readerState.active)return;
  if(readerState.paused){readerState.paused=false;readerCancel();readerSave();readerButtons();readerSpeakCurrent();return;}
  readerState.paused=true;_READER_GEN++;if(_READER_TIMER){try{clearTimeout(_READER_TIMER);}catch(e){}_READER_TIMER=null;}try{window.speechSynthesis.pause();}catch(e){}readerSave();readerButtons();const item=readerCurrent();readerSetProgress("Paused at "+(item?readerDisplayRef(item):"end"));
}
function readerStop(){
  readerState.active=false;readerState.paused=false;readerCancel();readerSave();readerButtons();const item=readerCurrent();readerSetProgress("Stopped at "+(item?readerDisplayRef(item):"end"));
}
function readerStatus(){const item=readerCurrent();return (item?"Bible reader: "+(readerState.paused?"paused":"ready")+" at "+readerDisplayRef(item)+". ":"Bible reader: complete. ")+readerVoiceStatus();}
function toggleRed(){const t=document.getElementById("redToggle");const s=document.getElementById("verseStrip");const on=t.style.opacity!=="0.45";t.style.opacity=on?"0.45":"1";const item=readerCurrent();if(item){const red=isRed(item);s.style.display=red?"block":"none";s.textContent=red?"\u2726 words of Jesus \u2022 "+readerDisplayRef(item):"";getRedSet();}}
function toggleRainbow(){_RAINBOW=!_RAINBOW;const t=document.getElementById("rainbowToggle");t.style.opacity=_RAINBOW?"1":"0.45";const u=readerUtterance;if(u&&readerState.active){try{window.speechSynthesis.cancel();}catch(e){}readerState.paused=false;readerSpeakCurrent();}}

function readerStepTo(act){const items=readerItems();if(!items||!readerState.active)return;const cur=readerState.index;let ni=-1;
  if(act==="next")ni=cur+1;else if(act==="prev")ni=cur-1;
  else if(act==="next_chapter"){const ci=Number(items[cur].chapter);for(let k=cur+1;k<items.length;k++){if(Number(items[k].chapter)!==ci){ni=k;break;}}}
  else if(act==="prev_chapter"){const ci=Number(items[cur].chapter);for(let k=cur-1;k>=0;k--){if(Number(items[k].chapter)!==ci&&items[k].verse==="1"){ni=k;break;}}}
  if(ni<0||ni>=items.length)return;const wasPaused=readerState.paused;readerState.paused=true;readerCancel();readerState.index=ni;readerState.book=items[ni].book;readerSave();readerButtons();if(wasPaused){readerSetProgress("Paused at "+readerDisplayRef(items[ni]));}else{readerSpeakCurrent();}}
function readerApplyAction(action){
  if(action==="start")readerStart();
  else if(action==="pause")readerPause();
  else if(action==="resume"){if(!readerState.active)readerStart();else if(readerState.paused)readerPause();}
  else if(action==="stop")readerStop();
  else if(action==="status")readerSetProgress(readerStatus());
  else if(action==="faster"||action==="slower")_READER_RATE=action==="faster"?Math.min(2,_READER_RATE+0.15):Math.max(0.5,_READER_RATE-0.15);
  else if(action==="next"||action==="prev"||action==="next_chapter"||action==="prev_chapter")readerStepTo(action);
}

function setVerdict(v){
  const c=VERDICT[v]||CYAN;
  document.documentElement.style.setProperty("--vc",c);
  document.documentElement.style.setProperty("--core",c);
  badge.textContent=VNAME[v]||v;
}
function addMsg(role,text,verdict,meta){
  const d=document.createElement("div");
  d.className="msg "+role;
  if(role==="tru"&&verdict){
    const c=VERDICT[verdict]||CYAN;d.style.setProperty("--mc",c);
    const vd=document.createElement("div");vd.className="vd";
    vd.textContent=(VNAME[verdict]||verdict);d.appendChild(vd);
    if(meta&&meta.source){const pv=document.createElement("div");pv.className="prov";pv.textContent="SOURCE • "+meta.source;d.appendChild(pv);}
    if(meta&&meta.provenance){const ev=meta.provenance;const pv2=document.createElement("div");pv2.className="prov";pv2.textContent="EVIDENCE • "+ev.lane+" / "+ev.type+" / "+ev.key+" • score "+ev.final_score+" • coverage "+ev.coverage;d.appendChild(pv2);}
    if(meta&&meta.contextual&&meta.context_topic){const cx=document.createElement("div");cx.className="context";cx.textContent="CONTEXT • "+meta.context_topic;d.appendChild(cx);}
  }
  const t=document.createElement("div");if(verdict==="ENCYCLOPEDIA"||verdict==="DEFINE"||verdict==="TOPICAL"||(meta&&meta.html)){t.innerHTML=text;}else{t.textContent=text;}d.appendChild(t);
  if(role==="tru"&&meta&&meta.continuation&&!meta.is_reader){const action=document.createElement("button");action.className="next-action";action.textContent="→ "+meta.continuation.label;action.onclick=()=>send(meta.continuation.query);d.appendChild(action);}
  if(role==="tru"&&meta&&meta.confidence){const cf=document.createElement("div");cf.className="confidence";cf.textContent="CONFIDENCE • "+meta.confidence.toUpperCase();d.appendChild(cf);}
  chat.appendChild(d);chat.scrollTop=chat.scrollHeight;
}
function downloadBrainExport(){
  const payload={format:"tru-brain-export-v1",exported_at:new Date().toISOString(),raw_nodes:seedBrain(),overlay:OVERLAY};
  const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="TRU_BRAIN_EXPORT.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function speak(text){
  if(!("speechSynthesis"in window))return;
  try{window.speechSynthesis.cancel();}catch(e){}
  const u=new SpeechSynthesisUtterance(text.slice(0,600));
  u.rate=0.96;u.pitch=0.88;
  const vs=window.speechSynthesis.getVoices();
  const pick=vs.find(v=>/samantha|serena|karen|moira|tessa/i.test(v.name))||vs.find(v=>v.lang&&v.lang.startsWith("en"));
  if(pick)u.voice=pick;
  window.speechSynthesis.speak(u);
}
async function send(qOverride){
  const q=(qOverride!=null?qOverride:input.value).trim();
  if(!q||busy)return;
  input.value="";busy=true;sendBtn.disabled=true;
  addMsg("user",q);
  holo.classList.add("thinking");
  statusEl.textContent="● EXECUTING • "+q.slice(0,30);
  await new Promise(r=>setTimeout(r,40));
  let res;
  try{res=await resolveAnswer(q);}catch(e){res={reply:"internal fault: "+e.message,verdict:"GAP",nodes_used:[],follow_up:false,source:"runtime fault"};}
  recordConversation(q,res);

  holo.classList.remove("thinking");
  setVerdict(res.verdict);
  const ms=0; // timing handled per-layer
  if(!res.is_reader)if(!res.reader_action)res.continuation=CONVERSATION_STATE.continuation;
  res.confidence=CONVERSATION_STATE.confidence;
  addMsg("tru",res.reply,res.verdict,res);
  if(res.export_request)downloadBrainExport();
  const src = res.source ? " • "+res.source : " • offline";
  statusEl.textContent="● "+res.verdict+src+(res.online?" • gateway":"");
  if(res.reader_action){res.is_reader=true;readerApplyAction(res.reader_action);}
  if(res.portal_action){const pp=document.getElementById("tru-portal-panel");if(pp){pp.style.display="block";const ps=document.getElementById("portal-stats");if(ps){try{ps.textContent=nodeCountSummary();}catch(e){ps.textContent="offline engine";}}const pb=document.getElementById("portal-build");if(pb)pb.textContent="v12 • "+__TRU_BUILD__;}}
  speak(res.reply);
  busy=false;sendBtn.disabled=false;input.focus();
}

// iOS needs a small delay to focus input after tap
sendBtn.addEventListener("click",()=>send());$("readerStart").addEventListener("click",readerStart);
$("readerPause").addEventListener("click",readerPause);
$("readerStop").addEventListener("click",readerStop);
$("readerVoiceFemale").addEventListener("click",()=>setReaderGender("female"));
$("readerVoiceMale").addEventListener("click",()=>setReaderGender("male"));
$("readerVoiceSelect").addEventListener("change",e=>setReaderVoice(e.target.value));
$("readerVoiceTest").addEventListener("click",readerTestVoice);
if("speechSynthesis"in window){try{window.speechSynthesis.addEventListener("voiceschanged",()=>{readerRefreshVoices();if(readerState.active&&!readerState.paused&&_READER_MODE==="silent"&&readerChosenVoice()){_READER_MODE="voice";readerCancel();readerSpeakCurrent();}});}catch(e){window.speechSynthesis.onvoiceschanged=()=>readerRefreshVoices();}}
readerRefreshVoices();
input.addEventListener("input",()=>{sendBtn.disabled=busy||!input.value.trim();});
input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();send();}});
// hold-to-talk on the relic circle
if(holo){
  holo.addEventListener("touchstart",holdStart,{passive:false});
  holo.addEventListener("touchend",holdEnd,{passive:false});
  holo.addEventListener("touchcancel",holdEnd,{passive:false});
  holo.addEventListener("mousedown",holdStart);
  holo.addEventListener("mouseleave",holdEnd);
  window.addEventListener("mouseup",holdEnd);
}


// ── boot ──
function ready(){
  try{
  loadHistory();
  loadConversationState();  readerLoad();
  readerButtons();
  readerSetProgress(readerStatus());
  setVerdict("REASON");
  statusEl.textContent="● OFFLINE • READY";
  sub.textContent=nodeCountSummary();
  // if we have remembered turns, show a note
  let memNote="";
  if(HISTORY.length>0){
    memNote='<div style="color:#69f0ae;font-size:11px;margin-bottom:10px">● REMEMBERED • '+HISTORY.length+' TURNS</div>';
  }
  let intro='';
  try{intro=localStorage.getItem("tru_intro_v1")||"";}catch(e){}
  if(intro){
    chat.innerHTML='<div class="ready">'+memNote+'<div class="h">READY.</div>'+
      '<div style="color:#9ed7ff;margin-bottom:8px;font-size:13px">'+nodeCountSummary()+'.</div>'+
      '</div>';
  }else{
    chat.innerHTML='<div class="ready">'+memNote+
      '<div class="h">TRU.</div>'+
      '<div style="margin-bottom:8px">Scripture, words, and topics \u2014 KJV, Strong\u2019s, Brown-Driver-Briggs, Thayer, and the Treasury of Scripture Knowledge, all local. Ask a verse, a word, or a phrase from Scripture. What weighs on you?</div>'+
      '<div style="color:#9ed7ff;margin-bottom:8px;font-size:13px">'+nodeCountSummary()+'.</div>'+
      '</div>';
    try{localStorage.setItem("tru_intro_v1","1");}catch(e){}
  }
  sendBtn.disabled=false;
  // warm index in background (best-effort)
  setTimeout(()=>{try{buildIndex();statusEl.textContent="● OFFLINE • READY";}catch(e){statusEl.textContent="● OFFLINE • READY";}},300);
  }catch(e){console.error("boot fault",e); sendBtn.disabled=false; statusEl.textContent="● OFFLINE • READY";}
}
ready();
setTimeout(initBm25Worker,250);
setRuntimePhase("READY","offline");
getRedSet();

</script>