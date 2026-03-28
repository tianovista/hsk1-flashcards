import { useState, useRef } from 'react';
import { vocabulary } from '../data/vocabulary';

// ── Inline record button used in the studio ───────────────────
function RecordBtn({ wordId, type, hasExisting, onSaved }) {
  const [state, setState] = useState('idle'); // idle | recording | done | saving | saved | error
  const recorderRef = useRef(null);
  const chunksRef   = useRef([]);
  const blobRef     = useRef(null);

  async function start(e) {
    e.stopPropagation();
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = ev => chunksRef.current.push(ev.data);
      recorder.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        setState('done');
      };
      recorderRef.current = recorder;
      recorder.start();
      setState('recording');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }

  function stop(e) {
    e.stopPropagation();
    recorderRef.current?.stop();
  }

  function preview(e) {
    e.stopPropagation();
    new Audio(URL.createObjectURL(blobRef.current)).play();
  }

  async function save(e) {
    e.stopPropagation();
    setState('saving');
    await fetch(`/__save-audio?id=${wordId}&type=${type}`, {
      method: 'POST',
      body: blobRef.current,
      headers: { 'Content-Type': 'audio/webm' },
    });
    setState('saved');
    onSaved?.();
  }

  function redo(e) {
    e.stopPropagation();
    blobRef.current = null;
    setState('idle');
  }

  if (state === 'saved') return <span className="studio-badge studio-badge--done">✓ saved</span>;
  if (state === 'saving') return <span className="studio-badge">saving…</span>;
  if (state === 'error') return <span className="studio-badge studio-badge--err">mic denied</span>;

  if (state === 'idle') return (
    <button className="studio-rec-btn" onClick={start} title="Record">
      {hasExisting ? '🔄 re-record' : '🎙 record'}
    </button>
  );

  if (state === 'recording') return (
    <button className="studio-rec-btn studio-rec-btn--active" onClick={stop} title="Stop recording">
      ⏹ stop
    </button>
  );

  // done — preview / save / redo
  return (
    <span className="studio-rec-controls">
      <button className="studio-rec-btn" onClick={preview} title="Preview">▶ preview</button>
      <button className="studio-rec-btn studio-rec-btn--save" onClick={save} title="Save">💾 save</button>
      <button className="studio-rec-btn" onClick={redo} title="Re-record">↩ redo</button>
    </span>
  );
}

// ── Group vocabulary by category ─────────────────────────────
function groupByCategory(words) {
  const map = new Map();
  for (const w of words) {
    if (!map.has(w.category)) map.set(w.category, []);
    map.get(w.category).push(w);
  }
  return map;
}

// ── Main Studio component ─────────────────────────────────────
export default function RecordingStudio({ onClose }) {
  const [filter, setFilter] = useState('missing');
  // Track words saved this session so status updates without a page reload
  const [sessionSaved, setSessionSaved] = useState({}); // { [id]: { word, example } }

  function markSaved(id, type) {
    setSessionSaved(prev => ({
      ...prev,
      [id]: { ...prev[id], [type]: true },
    }));
  }

  function hasWord(w)    { return !!(w.audioFile    || sessionSaved[w.id]?.word); }
  function hasExample(w) { return !!(w.exampleAudioFile || sessionSaved[w.id]?.example); }

  const filtered = vocabulary.filter(w => {
    if (filter === 'all')             return true;
    if (filter === 'missing-word')    return !hasWord(w);
    if (filter === 'missing-example') return !hasExample(w);
    return !hasWord(w) || !hasExample(w); // 'missing' = missing either
  });

  const groups    = groupByCategory(filtered);
  const doneWord  = vocabulary.filter(hasWord).length;
  const doneEx    = vocabulary.filter(hasExample).length;
  const total     = vocabulary.length;

  return (
    <div className="studio-overlay">
      <div className="studio-panel">

        {/* ── Header ── */}
        <div className="studio-header">
          <div>
            <h2 className="studio-title">Recording Studio</h2>
            <p className="studio-subtitle">
              Words: <strong>{doneWord}/{total}</strong> &nbsp;·&nbsp;
              Examples: <strong>{doneEx}/{total}</strong>
            </p>
          </div>
          <button className="studio-close" onClick={onClose}>✕ back to cards</button>
        </div>

        {/* ── Filter tabs ── */}
        <div className="studio-filters">
          {[
            ['missing',         'Missing any'],
            ['missing-word',    'Missing word'],
            ['missing-example', 'Missing example'],
            ['all',             'All words'],
          ].map(([val, label]) => (
            <button
              key={val}
              className={`studio-filter-btn${filter === val ? ' active' : ''}`}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Word list ── */}
        <div className="studio-list">
          {filtered.length === 0 && (
            <div className="studio-empty">All done! 🎉</div>
          )}
          {[...groups.entries()].map(([category, words]) => (
            <div key={category} className="studio-group">
              <div className="studio-group-header">{category}</div>
              {words.map(w => (
                <div key={w.id} className="studio-row">
                  {/* Word info */}
                  <div className="studio-word-info">
                    <span className="studio-hanzi">{w.hanzi}</span>
                    <span className="studio-pinyin">{w.pinyin}</span>
                    <span className="studio-english">{w.english}</span>
                  </div>

                  {/* Word audio */}
                  <div className="studio-audio-col">
                    <div className="studio-col-label">Word</div>
                    {hasWord(w)
                      ? <span className="studio-badge studio-badge--done">✓ recorded</span>
                      : null}
                    <RecordBtn
                      wordId={w.id}
                      type="word"
                      hasExisting={hasWord(w)}
                      onSaved={() => markSaved(w.id, 'word')}
                    />
                  </div>

                  {/* Example audio */}
                  <div className="studio-audio-col">
                    <div className="studio-col-label">Example</div>
                    <div className="studio-example-text">{w.example}</div>
                    {hasExample(w)
                      ? <span className="studio-badge studio-badge--done">✓ recorded</span>
                      : null}
                    <RecordBtn
                      wordId={w.id}
                      type="example"
                      hasExisting={hasExample(w)}
                      onSaved={() => markSaved(w.id, 'example')}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
