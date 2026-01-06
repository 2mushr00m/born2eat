export default function KeywordSelector({ list, selected, onSelect }) {
  return (
    <div className="keyword-box">
      <button
        type="button"
        className={`keyword-box__item ${!selected ? "is-active" : ""}`}
        onClick={() => onSelect(null)}
      >
        전체
      </button>

      {list.map((value) => (
        <button
          key={value}
          type="button"
          className={`keyword-box__item ${selected === value ? "is-active" : ""}`}
          onClick={() => onSelect(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
