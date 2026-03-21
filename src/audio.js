// ============================================================
// AUDIO MODULE
// ============================================================
// Words with `audioFile` defined play your MP3 recording.
// Words without `audioFile` fall back to browser voice (zh-CN).
//
// To add audio for more categories later:
//   1. Record your MP3s and drop them in /public/audio/my_audio_clips/
//   2. Add  audioFile: 'my_audio_clips/filename.mp3'  to the word
//      in vocabulary.js — that's it!
//
// Same rule for example sentences: add `exampleAudioFile` to the
// word entry and it will automatically play your recording.
// ============================================================

function speak(text, rate = 0.85) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = 'zh-CN';
  utterance.rate  = rate;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export function playAudio(word) {
  if (word.audioFile) {
    const audio = new Audio(`/audio/${word.audioFile}`);
    audio.play().catch(() => speak(word.hanzi));
  } else {
    speak(word.hanzi);
  }
}

export function playExampleAudio(word) {
  if (word.exampleAudioFile) {
    const audio = new Audio(`/audio/${word.exampleAudioFile}`);
    audio.play().catch(() => speak(word.example, 0.8));
  } else {
    speak(word.example, 0.8);
  }
}
