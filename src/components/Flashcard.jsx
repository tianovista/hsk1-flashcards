import { useState, useEffect } from 'react';
import { playAudio, playExampleAudio } from '../audio';

const AFFIRMATIONS = [
  "Keep going, you've got this!",
  "Progress over perfection!",
  "You're doing amazing!",
  "Small steps, big results!",
  "You make this look easy!",
  "Consistency is your superpower!",
  "Your brain is growing right now!",
  "你很棒！",
  "加油！",
  "很好！",
  "坚持！",
  "你真厉害！",
  "你进步了！",
  "加油！You've got this!",
  "你很棒！Keep shining!",
  "Every day, 越来越好！",
  "你做到了！One more!",
  "Progress! 你进步了！",
  "坚持！Consistency wins!",
  "你真厉害！Look at you go!",
  "Keep going！你很棒！",
  "一步一步！Step by step!",
];

export default function Flashcard({ word, onRate, cardKey }) {
  const [flipped, setFlipped] = useState(false);
  const [affirmation, setAffirmation] = useState('');

  // Reset to front face whenever the word changes
  useEffect(() => {
    setFlipped(false);
  }, [cardKey]);

  // Pick a new affirmation each time the card flips to the back
  useEffect(() => {
    if (flipped) {
      setAffirmation(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
    }
  }, [flipped]);

  function handleAudio(e) {
    e.stopPropagation();
    playAudio(word);
  }

  function handleExampleAudio(e) {
    e.stopPropagation();
    playExampleAudio(word);
  }

  return (
    <div className="card-scene" onClick={() => setFlipped((f) => !f)}>
      <div className={`card ${flipped ? 'flipped' : ''}`}>

        {/* ── FRONT ── category + hanzi + pinyin + audio */}
        <div className="card-face card-front">
          <div className="card-content">
            <div className="front-category">{word.category}</div>
            <div className="hanzi">{word.hanzi}</div>
            <button className="audio-btn" onClick={handleAudio} title="Play pronunciation">
              🔊
            </button>
            <div className="card-hint">tap to reveal →</div>
          </div>
        </div>

        {/* ── BACK ── english + example sentence + rating */}
        <div className="card-face card-back">
          <div className="back-content">
            <div className="back-pinyin">{word.pinyin}</div>
            <div className="back-hanzi">{word.hanzi}</div>
            <div className="english">{word.english}</div>

            <div className="back-example">
              <div className="back-example-header">
                <div className="back-example-label">Example</div>
                <button className="example-audio-btn" onClick={handleExampleAudio} title="Play example sentence">🔊</button>
              </div>
              <div className="example-zh">{word.example}</div>
              <div className="example-pinyin">{word.examplePinyin.toLowerCase()}</div>
              <div className="example-en">{word.exampleTranslation}</div>
            </div>

            {/* Rating buttons — only visible on the back */}
            <div className="rating-buttons" onClick={(e) => e.stopPropagation()}>
              <button className="rate-btn again" onClick={() => onRate('again')}>Again</button>
              <button className="rate-btn good"  onClick={() => onRate('good')}>Good</button>
              <button className="rate-btn easy"  onClick={() => onRate('easy')}>Easy</button>
            </div>

            <div className="back-hint">{affirmation}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
