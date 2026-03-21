import { categories } from '../data/vocabulary';

export default function CategoryFilter({ selected, onSelect }) {
  return (
    <div className="category-scroll-wrapper">
      <div className="category-filter">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`cat-btn ${selected === cat ? 'active' : ''}`}
            onClick={() => onSelect(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
