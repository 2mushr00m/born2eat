import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminReviewListApi } from '../../api/admin';
import AdPagination from './components/AdPagination';
import { Eye, EyeOff } from 'lucide-react';

export default function AdReview() {
  const navigate = useNavigate();

  // ====== query state ======
  const [inputQ, setInputQ] = useState('');
  const [q, setQ] = useState(null);

  const [searchTarget, setSearchTarget] = useState('USER'); // "USER" | "RESTAURANT" | "CONTENT"(서버 규칙에 맞게)
  const [sort, setSort] = useState(null); // "recent" | "popular" | "rating"
  const [isVisible, setIsVisible] = useState(null); // "true" | "false"

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

          // 검색
          q: q || undefined,
          searchTarget: searchTarget || undefined,

          // 정렬
          sort: sort || undefined,

          // 필터
          isVisible: isVisible ? isVisible : undefined, // "true" | "false"
        };

        const { data } = await AdminReviewListApi(params);
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
  }, [q, searchTarget, sort, isVisible, page, limit]);

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

    setSearchTarget('USER');
    setSort(null);
    setIsVisible(null);

    setPage(1);
    setLimit(10);
  }

  function fmtTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  }

  return (
    <div className="adMain">
      <section className="adMain__wrap">

        {/* 타이틀 */}
        <article>
          <div className='adMain__title'>
            <h1><span>●</span> 리뷰 목록</h1>
          </div>
        </article>

        {/* 필터/검색 + 로딩/정렬 */}
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
                <option value="USER">유저</option>
                <option value="RESTAURANT">가게</option>
                <option value="CONTENT">내용</option>
              </select>
            
              <span>공개여부</span>
              <select
                value={isVisible || ''}
                onChange={(e) => {
                  setPage(1);
                  setIsVisible(e.target.value || null); // "true" | "false" | null
                }}>
                <option value="">전체</option>
                <option value="true">공개</option>
                <option value="false">비공개</option>
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
                placeholder="검색어(q)"
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
            <div>
              {loading && <p>Loading...</p>}
              {!loading && errMsg && <p>{errMsg}</p>}
              {!loading && !errMsg && <p>총 {total}개</p>}
            </div>

            <div>
              <select
                value={sort || ''}
                onChange={(e) => {
                  setPage(1);
                  setSort(e.target.value || null);
                }}>
                <option value="recent">최신순</option>
                <option value="popular">좋아요순</option>
                <option value="rating">별점순</option>
              </select>
            </div>
          </div>
        </article>

        {/* 테이블 */}
        <article className='adMain__table'>
          <div>
            <table className='adMain__table__ReviewList'>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>가게명</th>
                  <th>작성자명</th>
                  <th>리뷰 내용</th>
                  <th>별점</th>
                  <th>공감수</th>
                  <th>작성일</th>
                  <th>공개여부</th>
                </tr>
              </thead>

              <tbody>
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center' }}>
                      표시할 리뷰가 없습니다.
                    </td>
                  </tr>
                )}

                {items.map((r) => (
                  <tr key={r.reviewId}>
                    <td>{r.reviewId}</td>
                    <td onClick={() => navigate(`/admin/restaurant/${r.restaurantId}`)}>
                      {r.restaurantName || '-'}
                    </td>
                    <td style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/member/${r.userId}`)}>
                      {r.userNickname || '-'}
                    </td>
                    <td onClick={() => navigate(`/admin/review/${r.reviewId}`)}>
                      {r.content}
                    </td>
                    <td>{r.rating ?? '-'}</td>
                    <td>{r.likeCount ?? 0}</td>
                    <td>{fmtTime(r.createdAt)}</td>
                    <td>{r.isVisible ? <Eye size={18} /> : <EyeOff size={18} color='#555' />}</td>
                  </tr>
                ))}
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
