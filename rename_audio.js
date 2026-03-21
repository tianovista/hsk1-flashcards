/**
 * rename_audio.js
 * ───────────────
 * Run:  node rename_audio.js
 * Open: http://localhost:3456
 *
 * Plays each clip_NNN.mp3 one by one.
 * Type a pinyin filename (without .mp3) and press Enter to rename it.
 * Renamed files stay in public/audio/split/.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const AUDIO_DIR = path.join(__dirname, 'public', 'audio', 'split');
const PORT = 3456;

// ── Helpers ──────────────────────────────────────────────────

function getClips() {
  return fs.readdirSync(AUDIO_DIR)
    .filter(f => f.endsWith('.mp3'))
    .sort();
}

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── Request handler ───────────────────────────────────────────

function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Serve audio files
  if (url.pathname.startsWith('/audio/')) {
    const filename = decodeURIComponent(url.pathname.replace('/audio/', ''));
    const filepath = path.join(AUDIO_DIR, filename);
    if (!fs.existsSync(filepath)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes' });
    fs.createReadStream(filepath).pipe(res);
    return;
  }

  // API: list clips
  if (url.pathname === '/api/clips') {
    jsonResponse(res, getClips());
    return;
  }

  // API: rename a clip
  if (url.pathname === '/api/rename' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { from, to } = JSON.parse(body);
        if (!from || !to) { jsonResponse(res, { error: 'Missing from/to' }, 400); return; }

        const toName  = to.endsWith('.mp3') ? to : to + '.mp3';
        const fromPath = path.join(AUDIO_DIR, from);
        const toPath   = path.join(AUDIO_DIR, toName);

        if (!fs.existsSync(fromPath)) { jsonResponse(res, { error: 'Source not found' }, 404); return; }
        if (fs.existsSync(toPath) && fromPath !== toPath) {
          jsonResponse(res, { error: `"${toName}" already exists` }, 409); return;
        }

        fs.renameSync(fromPath, toPath);
        console.log(`  renamed: ${from}  →  ${toName}`);
        jsonResponse(res, { ok: true, newName: toName });
      } catch (e) {
        jsonResponse(res, { error: e.message }, 500);
      }
    });
    return;
  }

  // API: skip (no rename, just move on)
  if (url.pathname === '/api/skip') {
    jsonResponse(res, { ok: true });
    return;
  }

  // Serve the HTML app
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  res.writeHead(404); res.end();
}

// ── HTML UI ───────────────────────────────────────────────────

const HTML = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HSK-1 Audio Renamer</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --cream: #faf6f0;
    --ink:   #2c2420;
    --ink-light: #5c524a;
    --ink-faint: #a89e95;
    --vermillion: #d94f3b;
    --gold: #c9933a;
    --jade: #4a8c6f;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--cream);
    color: var(--ink);
    min-height: 100vh;
    display: flex;
    gap: 0;
  }

  /* ── Left panel ── */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 1.5rem;
  }

  .progress-text {
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  .clip-name {
    font-size: 1.8rem;
    font-weight: 500;
    color: var(--ink);
    letter-spacing: 0.05em;
  }

  .progress-bar-wrap {
    width: 320px;
    height: 4px;
    background: rgba(44,36,32,0.08);
    border-radius: 100px;
    overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--vermillion), var(--gold));
    border-radius: 100px;
    transition: width 0.4s ease;
  }

  .player-card {
    background: white;
    border-radius: 16px;
    padding: 2rem 2.5rem;
    box-shadow: 0 8px 40px rgba(44,36,32,0.10);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    width: 360px;
    border: 1px solid rgba(44,36,32,0.06);
    position: relative;
  }
  .player-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--vermillion), var(--gold));
    border-radius: 16px 16px 0 0;
  }

  audio {
    width: 100%;
    outline: none;
  }

  .btn-row {
    display: flex;
    gap: 0.6rem;
    width: 100%;
  }

  .btn {
    flex: 1;
    padding: 0.65rem 1rem;
    border: none;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-replay {
    background: rgba(44,36,32,0.06);
    color: var(--ink-light);
  }
  .btn-replay:hover { background: rgba(44,36,32,0.12); }
  .btn-skip {
    background: rgba(44,36,32,0.06);
    color: var(--ink-light);
  }
  .btn-skip:hover { background: rgba(44,36,32,0.12); }

  .input-wrap {
    display: flex;
    width: 100%;
    gap: 0.5rem;
  }

  input[type="text"] {
    flex: 1;
    padding: 0.7rem 1rem;
    border: 1.5px solid rgba(44,36,32,0.15);
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem;
    color: var(--ink);
    background: var(--cream);
    outline: none;
    transition: border-color 0.15s;
  }
  input[type="text"]:focus { border-color: var(--vermillion); }
  input[type="text"].error  { border-color: var(--vermillion); background: rgba(217,79,59,0.05); }

  .btn-save {
    background: var(--ink);
    color: var(--cream);
    padding: 0.7rem 1.2rem;
    border-radius: 10px;
    font-size: 0.85rem;
    white-space: nowrap;
  }
  .btn-save:hover { background: var(--vermillion); }

  .hint {
    font-size: 0.72rem;
    color: var(--ink-faint);
    text-align: center;
  }

  .error-msg {
    font-size: 0.75rem;
    color: var(--vermillion);
    min-height: 1em;
    text-align: center;
  }

  .done-card {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .done-emoji { font-size: 3rem; }
  .done-title { font-size: 1.4rem; font-weight: 500; }
  .done-sub   { font-size: 0.85rem; color: var(--ink-light); }

  /* ── Right panel: done list ── */
  .sidebar {
    width: 260px;
    background: white;
    border-left: 1px solid rgba(44,36,32,0.08);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .sidebar-header {
    padding: 1rem 1.25rem 0.75rem;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--ink-faint);
    border-bottom: 1px solid rgba(44,36,32,0.08);
    font-weight: 500;
  }
  .done-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
  }
  .done-item {
    padding: 0.4rem 1.25rem;
    font-size: 0.8rem;
    color: var(--jade);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .done-item::before { content: '✓'; font-size: 0.7rem; }
  .skipped-item {
    color: var(--ink-faint);
  }
  .skipped-item::before { content: '–'; }
</style>
</head>
<body>

<div class="main">
  <div class="progress-text" id="progress-text">Loading…</div>
  <div class="clip-name" id="clip-name">—</div>
  <div class="progress-bar-wrap">
    <div class="progress-bar-fill" id="progress-bar" style="width:0%"></div>
  </div>

  <div class="player-card" id="player-card">
    <audio id="player" controls></audio>

    <div class="btn-row">
      <button class="btn btn-replay" onclick="replay()">↺ Replay</button>
      <button class="btn btn-skip"   onclick="skip()">Skip →</button>
    </div>

    <div class="input-wrap">
      <input id="pinyin-input" type="text" placeholder="e.g. wo3  or  ni3hao3" autocomplete="off" spellcheck="false" />
      <button class="btn btn-save" onclick="save()">Save</button>
    </div>

    <div class="error-msg" id="error-msg"></div>
    <div class="hint">Type the pinyin filename (without .mp3) and press Enter</div>
  </div>
</div>

<div class="sidebar">
  <div class="sidebar-header">Renamed</div>
  <div class="done-list" id="done-list"></div>
</div>

<script>
let clips = [];
let index = 0;

async function init() {
  const res = await fetch('/api/clips');
  clips = await res.json();
  if (clips.length === 0) {
    document.getElementById('player-card').innerHTML =
      '<div class="done-card"><div class="done-emoji">📂</div><div class="done-title">No clips found</div><div class="done-sub">Make sure public/audio/split/ has .mp3 files.</div></div>';
    return;
  }
  showClip();
}

function showClip() {
  if (index >= clips.length) {
    showDone();
    return;
  }
  const clip = clips[index];
  document.getElementById('progress-text').textContent =
    'Clip ' + (index + 1) + ' of ' + clips.length;
  document.getElementById('clip-name').textContent = clip;
  document.getElementById('progress-bar').style.width =
    (index / clips.length * 100) + '%';
  document.getElementById('error-msg').textContent = '';
  document.getElementById('pinyin-input').value = '';

  const player = document.getElementById('player');
  player.src = '/audio/' + encodeURIComponent(clip);
  player.load();
  player.play().catch(() => {});

  document.getElementById('pinyin-input').focus();
}

function replay() {
  const player = document.getElementById('player');
  player.currentTime = 0;
  player.play().catch(() => {});
}

async function save() {
  const input = document.getElementById('pinyin-input');
  const value = input.value.trim();
  if (!value) { shake(input); return; }

  const res = await fetch('/api/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: clips[index], to: value })
  });
  const data = await res.json();

  if (!data.ok) {
    document.getElementById('error-msg').textContent = data.error;
    shake(input);
    return;
  }

  addToSidebar(data.newName, false);
  clips[index] = data.newName;
  index++;
  showClip();
}

async function skip() {
  addToSidebar(clips[index], true);
  index++;
  showClip();
}

function addToSidebar(name, skipped) {
  const list = document.getElementById('done-list');
  const div = document.createElement('div');
  div.className = 'done-item' + (skipped ? ' skipped-item' : '');
  div.textContent = name;
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
}

function shake(el) {
  el.classList.add('error');
  el.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(0)' }
  ], { duration: 300 }).onfinish = () => el.classList.remove('error');
}

function showDone() {
  document.getElementById('progress-text').textContent = 'All done!';
  document.getElementById('clip-name').textContent = '';
  document.getElementById('progress-bar').style.width = '100%';
  document.getElementById('player-card').innerHTML = \`
    <div class="done-card">
      <div class="done-emoji">🎉</div>
      <div class="done-title">All clips renamed!</div>
      <div class="done-sub">Check public/audio/split/ for your renamed files.</div>
    </div>\`;
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') save();
});

init();
</script>
</body>
</html>`;

// ── Start server ──────────────────────────────────────────────

http.createServer(handleRequest).listen(PORT, () => {
  console.log('');
  console.log('  HSK-1 Audio Renamer');
  console.log('  ───────────────────────────────────────');
  console.log(`  Open in your browser: http://localhost:${PORT}`);
  console.log('  Press Ctrl+C to stop.');
  console.log('');
  console.log(`  Clips folder: ${AUDIO_DIR}`);
  console.log(`  Clips found:  ${getClips().length}`);
  console.log('');
});
