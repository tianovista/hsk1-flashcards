import { useState, useEffect, useMemo } from 'react';
import { vocabulary } from './data/vocabulary';
import CategoryFilter from './components/CategoryFilter';
import Flashcard from './components/Flashcard';
import ProgressStats from './components/ProgressStats';

// ── Load saved progress from the browser's local storage ──
function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem('hsk1-stats'));
    if (saved) {
      return {
        learned: new Set(saved.learned),
        reviewed: saved.reviewed,
        correct: saved.correct,
      };
    }
  } catch (_) {}
  return { learned: new Set(), reviewed: 0, correct: 0 };
}

function saveStats(stats) {
  localStorage.setItem(
    'hsk1-stats',
    JSON.stringify({
      learned: [...stats.learned],
      reviewed: stats.reviewed,
      correct: stats.correct,
    })
  );
}

// ── Simple Fisher-Yates shuffle ──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  const [category, setCategory] = useState('All');
  const [stats, setStats] = useState(loadStats);
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);

  // Filter and shuffle deck whenever category changes
  const filtered = useMemo(
    () =>
      category === 'All'
        ? vocabulary
        : vocabulary.filter((w) => w.category === category),
    [category]
  );

  useEffect(() => {
    setDeck(shuffle(filtered));
    setIndex(0);
  }, [filtered]);

  const currentWord = deck[index];

  function handleRate(rating) {
    setStats((prev) => {
      const next = {
        learned: new Set(prev.learned),
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (rating !== 'again' ? 1 : 0),
      };

      if (rating === 'again') {
        // Put card back near the end so it shows up again soon
        setDeck((d) => {
          const newDeck = [...d];
          const [card] = newDeck.splice(index, 1);
          const earliest = Math.min(index + 3, newDeck.length);
          const insertAt = earliest + Math.floor(Math.random() * (newDeck.length - earliest + 1));
          newDeck.splice(insertAt, 0, card);
          return newDeck;
        });
      } else {
        // Good or Easy — mark as learned
        next.learned.add(currentWord.id);
        setIndex((i) => (i + 1 < deck.length ? i + 1 : 0));
      }

      saveStats(next);
      return next;
    });
  }

  function handleReset() {
    if (!window.confirm('Reset all progress?')) return;
    const fresh = { learned: new Set(), reviewed: 0, correct: 0 };
    setStats(fresh);
    saveStats(fresh);
    setDeck(shuffle(filtered));
    setIndex(0);
  }

  if (!currentWord) return <div className="loading">Loading cards…</div>;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-zh">汉语</span>
          <span className="title-en">HSK 1 Flash Cards</span>
        </h1>
      </header>

      <ProgressStats
        stats={stats}
        total={filtered.length}
        onReset={handleReset}
      />

      <CategoryFilter selected={category} onSelect={setCategory} />

      <main className="card-area">
        <Flashcard
          word={currentWord}
          onRate={handleRate}
          cardKey={currentWord.id}
        />

        <div className="card-counter">🩷</div>
      </main>
    </div>
  );
}
