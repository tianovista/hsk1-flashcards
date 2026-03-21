export default function ProgressStats({ stats, total, onReset }) {
  const accuracy =
    stats.reviewed > 0
      ? Math.round((stats.correct / stats.reviewed) * 100)
      : 0;

  const learned = stats.learned.size;
  const pct = total > 0 ? Math.round((learned / total) * 100) : 0;

  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-num">{learned}/{total}</span>
        <span className="stat-label">Learned</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="stat">
        <span className="stat-num">{accuracy}%</span>
        <span className="stat-label">Accuracy</span>
      </div>
      <button className="reset-btn" onClick={onReset} title="Reset progress">↺</button>
    </div>
  );
}
