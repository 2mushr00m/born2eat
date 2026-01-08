import React, { useMemo } from 'react';

/**
 * @param {{
 *  page: number;
 *  total: number;
 *  limit: number;
 *  onChange: (page:number)=>void;
 *  size?: number; // 페이지 버튼 개수
 * }} props
 */
export default function AdPagination({ page, total, limit, onChange, size = 5 }) {
  const totalPages = useMemo(() => {
    const t = Number(total) || 0;
    const l = Number(limit) || 1;
    return Math.max(1, Math.ceil(t / l));
  }, [total, limit]);

  const pageButtons = useMemo(() => {
    const cur = Math.min(Math.max(1, page), totalPages);
    const start = Math.max(1, cur - Math.floor(size / 2));
    const end = Math.min(totalPages, start + size - 1);
    const realStart = Math.max(1, end - size + 1);

    const arr = [];
    for (let p = realStart; p <= end; p++) arr.push(p);
    return arr;
  }, [page, totalPages, size]);

  if (totalPages <= 1) return null;

  return (
    <div className='pagenation-btn'>
      <button
        className='pagenation-btn__prev'
        type="button"
        onClick={() => onChange(page - 1)} disabled={page <= 1}>
        &lt;
      </button>

      {pageButtons.map((p) => (
        <button
          className={`pagenation-btn__number ${p === page ? 'pagenation-btn__number-active' : ''}`}
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}>
          {p}
        </button>
      ))}

      <button
        className='pagenation-btn__next'
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}>
        &gt;
      </button>
    </div>
  );
}
