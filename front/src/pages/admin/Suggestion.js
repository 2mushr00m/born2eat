import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminInquiryListApi } from '../../api/admin';
import AdPagination from './components/AdPagination';

const STATUS_LABEL = {
  PENDING: '미답변',
  ANSWERED: '답변 완료',
};

const TYPE_LABEL = {
  GENERAL: '기본',
  BUG: '버그',
  RESTAURANT: '음식점',
  ACCOUNT: '계정',
  OTHER: '기타',
};

export default function AdSugg() {
  const navigate = useNavigate();

  // ====== query state ======
  const [inputQ, setInputQ] = useState('');
  const [q, setQ] = useState(null);

  const [searchTarget, setSearchTarget] = useState('ALL'); // "ALL" | "TITLE" | "CONTENT"
  const [status, setStatus] = useState(null); // "PENDING" | "ANSWERED"
  const [type, setType] = useState(null); // "GENERAL" | "BUG" | "RESTAURANT" | "ACCOUNT" | "OTHER"

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // ===== 데이터 =====
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // ===== API 호출 =====
  useEffect(() => {
    let alive = true;

    async function fetchList() {
      setLoading(true);
      setErrMsg('');
      try {
        const params = {
          page,
          limit,
          q: q || undefined,
          searchTarget: searchTarget || undefined, // ALL | TITLE | CONTENT
          status: status || undefined, // PENDING | ANSWERED
          type: type || undefined, // GENERAL | BUG | RESTAURANT | ACCOUNT | OTHER
        };

        const { data } = await AdminInquiryListApi(params);
        if (!alive) return;

        const result = data?.result ?? {};
        setItems(Array.isArray(result.items) ? result.items : []);
        setTotal(Number(result.total) || 0);

        const serverPage = Number(result.page);
        const serverLimit = Number(result.limit);
        if (Number.isFinite(serverPage) && serverPage > 0) setPage(serverPage);
        if (Number.isFinite(serverLimit) && serverLimit > 0) setLimit(serverLimit);
      } catch (e) {
        if (!alive) return;
        setErrMsg('목록을 불러오지 못했습니다.');
        setItems([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchList();
    return () => {
      alive = false;
    };
  }, [q, searchTarget, status, type, page, limit]);

  // ===== 핸들러 =====
  function onSearch() {
    setPage(1);
    setQ(inputQ.trim() || null);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') onSearch();
  }

  function onResetAll() {
    setInputQ('');
    setQ(null);
    setSearchTarget('ALL');
    setStatus(null);
    setType(null);
    setPage(1);
    setLimit(10);
  }

  // ===== 표시 유틸 =====
  function fmtTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  }

  function statusLabel(code) {
    if (!code) return '-';
    return STATUS_LABEL[code] || code;
  }

  function typeLabel(code) {
    if (!code) return '-';
    return TYPE_LABEL[code] || code;
  }

  return (
    <div className="adMain">
      <section className="adMain__wrap">

        {/* 타이틀 */}
        <article className='adMain__title'>
          <div>
            <h1><span>●</span> 문의 목록</h1>
          </div>
        </article>

        {/* 필터/검색 + 로딩 */}
        <article className='adMain__nav'>
          <div className='adMain__nav__search'>
            <div className='filter-box-admin'>
              <span>검색범위</span>
              <select
                value={searchTarget}
                onChange={(e) => {
                  setPage(1);
                  setSearchTarget(e.target.value);
                }}>
                <option value="ALL">제목+내용</option>
                <option value="TITLE">제목</option>
                <option value="CONTENT">내용</option>
              </select>

              <span>상태</span>
              <select
                value={status || ''}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value || null);
                }}>
                <option value="">전체</option>
                <option value="PENDING">미답변</option>
                <option value="ANSWERED">답변 완료</option>
              </select>

              <span>유형</span>
              <select
                value={type || ''}
                onChange={(e) => {
                  setPage(1);
                  setType(e.target.value || null);
                }}>
                <option value="">전체</option>
                <option value="GENERAL">기본</option>
                <option value="BUG">버그</option>
                <option value="RESTAURANT">음식점</option>
                <option value="ACCOUNT">계정</option>
                <option value="OTHER">기타</option>
              </select>

              <span>페이지당</span>
              <select
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(Number(e.target.value));
                }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className='search-box-admin'>
              <input
                value={inputQ}
                onChange={(e) => setInputQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="검색어(q) - 제목/내용"
              />
              <button type="button" onClick={onSearch}>
                검색
              </button>
              <button type="button" onClick={onResetAll}>
                초기화
              </button>
            </div>
          </div>
          <div className='adMain__nav__sort'>
            {loading && <p>Loading...</p>}
            {!loading && errMsg && <p>{errMsg}</p>}
            {!loading && !errMsg && <p>총 {total}개</p>}
          </div>
        </article>

        {/* 테이블 */}
        <article className='adMain__table'>
          <div>
            <table className='adMain__table__SuggList'>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>제목</th>
                  <th>분류</th>
                  <th>작성자</th>
                  <th>작성일</th>
                  <th>답변여부</th>
                  <th>답변일</th>
                </tr>
              </thead>

              <tbody>
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center' }}>
                      표시할 문의가 없습니다.
                    </td>
                  </tr>
                )}

                {items.map((it) => {
                  return (
                    <tr key={it.inquiryId}>
                      <td>{it.inquiryId}</td>
                      <td title={it.title || ''} onClick={() => navigate(`/admin/suggestion/${it.inquiryId}`)}>
                        {it.title}
                      </td>
                      <td>{typeLabel(it.type)}</td>
                      <td
                        className={it.userId == null ? 'notMember' : ''}
                        onClick={it.userId != null ? () => navigate(`/admin/member/${it.userId}`) : undefined}>
                        {it.userId != null
                          ? (it.userNickname || '-')
                          : <span>{it.userNickname || '비회원'}</span>}
                      </td>
                      <td>{fmtTime(it.createdAt)}</td>
                      <td>
                        {it.status != null ? (
                          <div className={`chip ${it.status === 'ANSWERED' ? 'chip-answered' : 'chip-pending'}`}>
                            {statusLabel(it.status)}
                          </div>
                        ) : '-'}
                      </td>
                      <td>{fmtTime(it.answeredAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        {/* 페이지네이션 */}
        <article className='adMain__pagenation'>
          <AdPagination page={page} total={total} limit={limit} onChange={(p) => setPage(p)} />
        </article>

      </section>
    </div>
  );
}
