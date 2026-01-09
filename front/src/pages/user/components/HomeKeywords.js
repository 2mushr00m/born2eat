import { useState, useMemo } from 'react';

/**
 * @param {{
 *  mode?: 'tree' | 'multi';
 *  list: any[];
 *  selected: any;
 *  onSelect: (v: any) => void;
 * }} props
 */
export default function KeywordSelector({ mode, list, selected, onSelect }) {
  const isTree = mode === 'tree';
  const isMulti = mode === 'multi';

  const [stack, setStack] = useState([]);
  const currentNode = stack.length > 0 ? stack[stack.length - 1] : null;
  const isTop = !currentNode;

  // 현재 레벨 목록
  const viewList = useMemo(() => {
    if (isTop) return list;
    const children = Array.isArray(currentNode?.children) ? currentNode.children : [];
    return children;
  }, [list, isTop, currentNode]);

  if (isMulti) {
    const toggle = (code) => {
      if (!code) return;
      const has = selected.includes(code);
      const next = has ? selected.filter((x) => x !== code) : [...selected, code];
      onSelect(next);
    };

    return (
      <div className="keyword-box">
        {list.map((it) => (
          <button
            key={it.code}
            type="button"
            className={`keyword-box__item ${selected.includes(it.code) ? 'is-active' : ''}`}
            onClick={() => toggle(it.code)}>
            {it.name}
          </button>
        ))}
      </div>
    );
  }

  if (isTree) {
    const topLabel = isTop ? '전체' : currentNode?.name || '전체';
    const topActive = isTop && !selected;

    const handleTopClick = () => {
      if (isTop) {
        onSelect(null);
        return;
      }
      setStack((prev) => {
        const next = prev.slice(0, -1);
        const nextCurrent = next.length > 0 ? next[next.length - 1] : null;
        onSelect(nextCurrent ? nextCurrent.code : null);
        return next;
      });
    };

    const handleClickNode = (node) => {
      if (!node?.code) return;

      const children = Array.isArray(node.children) ? node.children : [];

      // 재클릭
      if (selected === node.code) {
        const parent = currentNode;
        onSelect(parent ? parent.code : null);
        return;
      }

      onSelect(node.code);
      if (children.length > 0) setStack((prev) => [...prev, node]);
    };

    return (
      <div className="keyword-box">
        <button
          type="button"
          className={`keyword-box__item ${topActive || !isTop ? 'is-active' : ''}`}
          onClick={handleTopClick}>
          {topLabel}
        </button>

        {viewList.map((it) => (
          <button
            key={it.code}
            type="button"
            className={`keyword-box__item ${selected === it.code ? 'is-active' : ''}`}
            onClick={() => handleClickNode(it)}>
            {it.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="keyword-box">
      <button
        type="button"
        className={`keyword-box__item ${!selected ? 'is-active' : ''}`}
        onClick={() => onSelect(null)}>
        전체
      </button>
      {list.map((it) => (
        <button
          key={it.code}
          type="button"
          className={`keyword-box__item ${selected === it.code ? 'is-active' : ''}`}
          onClick={() => onSelect(it.code)}>
          {it.name}
        </button>
      ))}
    </div>
  );
}
