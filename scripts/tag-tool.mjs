// One-time local tag reorganizer. Run `pnpm tag-tool`, open the URL, merge/rename/
// delete tags across all songs with a live preview, then Apply (rewrites the yaml).
// Local-only (writes to src/content/songs). Not part of the deployed site.
import http from 'node:http';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, stringify } from 'yaml';

const DIR = 'src/content/songs';
const PORT = Number(process.env.PORT) || 4455;

async function loadSongs() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.yaml'));
  const out = [];
  for (const file of files) {
    const data = parse(await readFile(path.join(DIR, file), 'utf8')) || {};
    out.push({ file, title: data.title ?? file, tags: Array.isArray(data.tags) ? data.tags : [] });
  }
  return out;
}

function freq(list) {
  const m = {};
  for (const s of list) for (const t of s.tags) m[t] = (m[t] || 0) + 1;
  return m;
}

/** Apply a {oldTag: newTagOrEmpty} map to every song; empty target drops the tag. */
async function apply(map) {
  const list = await loadSongs();
  let changed = 0;
  for (const s of list) {
    const next = [];
    const seen = new Set();
    for (const t of s.tags) {
      const target = (map[t] !== undefined ? map[t] : t).trim();
      if (!target) continue; // deleted
      if (!seen.has(target)) {
        seen.add(target);
        next.push(target);
      }
    }
    if (JSON.stringify(next) !== JSON.stringify(s.tags)) {
      const data = parse(await readFile(path.join(DIR, s.file), 'utf8')) || {};
      data.tags = next;
      await writeFile(path.join(DIR, s.file), stringify(data));
      changed++;
    }
  }
  const after = freq(await loadSongs());
  return { changed, uniqueAfter: Object.keys(after).length };
}

const HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Tag reorganizer</title>
<style>
  :root{--bg:#0f172a;--card:#1f2937;--rest:#374151;--accent:#3b82f6;--muted:#9ca3af;--text:#fff;--warn:#f87171}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 ui-sans-serif,system-ui}
  header{position:sticky;top:0;background:var(--bg);padding:18px 24px;border-bottom:1px solid var(--rest);display:flex;gap:16px;align-items:center;flex-wrap:wrap}
  h1{font-size:18px;margin:0 12px 0 0}
  .muted{color:var(--muted)}
  button{font:600 13px/1 ui-sans-serif;padding:8px 14px;border-radius:8px;border:1px solid var(--accent);background:transparent;color:#93c5fd;cursor:pointer}
  button.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
  button:disabled{opacity:.4;cursor:default}
  main{padding:16px 24px 120px;max-width:1180px;margin:0 auto}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--rest);vertical-align:top}
  th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
  td.songs{font-size:12px;line-height:1.45;max-width:600px}
  td.songs b{color:var(--text);margin-right:4px;font-variant-numeric:tabular-nums}
  td.orig{font-family:ui-monospace,monospace;white-space:nowrap;padding-top:9px}
  td:last-child{padding-top:7px}
  input{font:13px/1 ui-monospace,monospace;background:var(--rest);border:1px solid transparent;color:var(--text);padding:6px 8px;border-radius:6px;width:240px}
  input.changed{border-color:var(--accent)}
  input.del{text-decoration:line-through;color:var(--warn);opacity:.7}
  tr.merged td.orig::after{content:" → merge";color:#fbbf24;font-size:11px}
  .summary{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--rest);padding:14px 24px;display:flex;gap:18px;align-items:center;justify-content:space-between}
  code{background:var(--rest);padding:2px 6px;border-radius:4px}
</style></head><body>
<header>
  <h1>Tag reorganizer</h1>
  <span class="muted" id="sub"></span>
  <span style="flex:1"></span>
  <button onclick="normalizeSeparators()">Normalize separators → dots</button>
  <button onclick="reset()">Reset</button>
</header>
<main>
  <p class="muted">Edit a tag to <b>rename</b> it. Give two tags the <b>same</b> value to <b>merge</b> them. <b>Clear</b> a field to delete that tag everywhere. Then Apply.</p>
  <table><thead><tr><th>tag</th><th>songs</th><th>canonical</th></tr></thead><tbody id="rows"></tbody></table>
</main>
<datalist id="alltags"></datalist>
<div class="summary">
  <span id="preview" class="muted"></span>
  <span><button class="primary" id="applyBtn" onclick="applyChanges()">Apply changes</button></span>
</div>
<script>
let TAGS=[];
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
async function load(){
  const r=await fetch('/api/state'); const d=await r.json();
  TAGS=d.tags; document.getElementById('sub').textContent=d.tags.length+' tags across '+d.songCount+' songs';
  render();
}
function render(){
  const tb=document.getElementById('rows'); tb.innerHTML='';
  const dl=document.getElementById('alltags'); dl.innerHTML=TAGS.map(t=>'<option value="'+t.tag+'">').join('');
  for(const t of TAGS){
    const tr=document.createElement('tr');
    tr.innerHTML='<td class="orig">'+t.tag+'</td><td class="songs"><b>'+t.count+'</b> <span class="muted">'+(t.songs||[]).map(esc).join(', ')+'</span></td><td></td>';
    const inp=document.createElement('input'); inp.value=t.canonical??t.tag; inp.setAttribute('list','alltags');
    inp.dataset.orig=t.tag; inp.oninput=()=>{t.canonical=inp.value;update()};
    tr.children[2].appendChild(inp); tb.appendChild(tr); t._inp=inp; t._tr=tr;
  }
  update();
}
function update(){
  const counts={};
  for(const t of TAGS){const c=(t.canonical??t.tag).trim(); if(c)counts[c]=(counts[c]||0)+1;}
  let renamed=0,merged=0,deleted=0;
  for(const t of TAGS){
    const c=(t.canonical??t.tag).trim();
    t._inp.classList.toggle('changed', c!==t.tag && c!=='');
    t._inp.classList.toggle('del', c==='');
    const isMerge = c!=='' && counts[c]>1;
    t._tr.classList.toggle('merged', isMerge && c!==t.tag);
    if(c==='')deleted++; else if(c!==t.tag) renamed++;
  }
  const after=Object.keys(counts).length;
  document.getElementById('preview').innerHTML='Result: <b>'+after+'</b> unique tags &middot; '+renamed+' renamed/merged &middot; '+deleted+' deleted';
}
function normalizeSeparators(){
  for(const t of TAGS) t.canonical=t.tag.toLowerCase().replace(/[ _-]+/g,'.').replace(/\\.+/g,'.');
  render();
}
function reset(){ for(const t of TAGS) t.canonical=t.tag; render(); }
async function applyChanges(){
  const map={}; for(const t of TAGS){const c=(t.canonical??t.tag).trim(); if(c!==t.tag) map[t.tag]=c;}
  if(!Object.keys(map).length){alert('No changes.');return;}
  if(!confirm('Apply '+Object.keys(map).length+' tag change(s) to all songs?'))return;
  const btn=document.getElementById('applyBtn'); btn.disabled=true; btn.textContent='Applying...';
  const r=await fetch('/api/apply',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({map})});
  const d=await r.json();
  alert('Done. '+d.changed+' songs updated, '+d.uniqueAfter+' unique tags now.');
  await load(); btn.disabled=false; btn.textContent='Apply changes';
}
load();
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      return res.end(HTML);
    }
    if (req.method === 'GET' && req.url === '/api/state') {
      const list = await loadSongs();
      const m = {};
      for (const s of list) for (const t of s.tags) (m[t] = m[t] || []).push(s.title);
      const tags = Object.keys(m)
        .map((t) => ({ tag: t, count: m[t].length, songs: m[t].sort() }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ tags, songCount: list.length }));
    }
    if (req.method === 'POST' && req.url === '/api/apply') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          const { map } = JSON.parse(body || '{}');
          const result = await apply(map || {});
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (e) {
          res.statusCode = 500;
          res.end(String(e));
        }
      });
      return;
    }
    res.statusCode = 404;
    res.end('not found');
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e));
  }
});

server.listen(PORT, () => {
  console.log(`\n  Tag reorganizer running:  http://localhost:${PORT}\n  (edits src/content/songs — rebuild/commit when done; Ctrl-C to stop)\n`);
});
