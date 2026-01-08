import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminRestListApi } from '../../api/admin';
import AdPagination from './components/AdPagination';
import { Eye, EyeOff } from 'lucide-react';

export default function AdRest() {
  const navigate = useNavigate();

  // ====== query state ======
  const [inputQ, setInputQ] = useState('');
  const [q, setQ] = useState(null);
  const [sort, setSort] = useState(null); // "recent" | "popular" | "recommend"
  const [isPublished, setIsPublished] = useState(null); // "true" | "false"
  const [dataStatus, setDataStatus] = useState(null); // "RAW" | "BASIC" | "VERIFIED"
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
          q: q || undefined,
          sort: sort || undefined,
          isPublished: isPublished ? isPublished : undefined, // "true" | "false"
          dataStatus: dataStatus || undefined,
          page,
          limit,
        };

        const { data } = await AdminRestListApi(params);
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
  }, [q, sort, isPublished, dataStatus, page, limit]);

  // ===== 핸들러 =====
  function onSearch() {
    setPage(1);
    setQ(inputQ.trim());
  }
  function onKeyDown(e) {
    if (e.key === 'Enter') onSearch();
  }
  function onResetAll() {
    setInputQ('');
    setQ('');
    setSort('recent');
    setIsPublished('');
    setDataStatus('');
    setPage(1);
    setLimit(10);
  }

  // ===== 표시 유틸 =====
  function calcRatingAvg(r) {
    const sum = Number(r?.ratingSum);
    const cnt = Number(r?.reviewCount);
    if (!Number.isFinite(sum) || !Number.isFinite(cnt) || cnt <= 0) return '-';
    const avg = sum / cnt;
    return Number.isFinite(avg) ? avg.toFixed(1) : '-';
  }

  return (
    <div className="adMain">
      <section className="adMain__wrap">

        {/* 타이틀/버튼 */}
        <article className="adMain__title">
          <h1><span>●</span> 식당 목록</h1>
          <Link to = "/admin/restaurant/new">
            <button type="button">→ 신규 식당 등록</button>
          </Link>
        </article>

        {/* 필터/검색 + 로딩/정렬 */}
        <article className='adMain__nav'>
          <div className='adMain__nav__search'>
            <div className='filter-box-admin'>
              <div>
                <p>공개여부</p>
                <select
                  value={isPublished}
                  onChange={(e) => {
                    setPage(1);
                    setIsPublished(e.target.value);
                  }}>
                  <option value="">전체</option>
                  <option value="true">공개</option>
                  <option value="false">비공개</option>
                </select>
              </div>
              
              <div>
                <p>데이터상태</p>
                <select
                  value={dataStatus}
                  onChange={(e) => {
                    setPage(1);
                    setDataStatus(e.target.value);
                  }}>
                  <option value="">전체</option>
                  <option value="RAW">RAW</option>
                  <option value="BASIC">BASIC</option>
                  <option value="VERIFIED">VERIFIED</option>
                </select>
              </div>
              
              <div>
                <p>페이지당</p>
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
            </div>

            <div className='search-box-admin'>
              <input
                value={inputQ}
                onChange={(e) => setInputQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="검색어 (이름, 주소, 대표메뉴, 분류)"
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
              {!loading && !errMsg && <p>현재 등록 식당 수: 총 {total}개</p>}
            </div>

            <div>
              <select
                value={sort}
                onChange={(e) => {
                  setPage(1);
                  setSort(e.target.value);
                }}>
                <option value="recent">최근등록순</option>
                <option value="popular">좋아요순</option>
                <option value="recommend">추천순</option>
              </select>
            </div>
          </div>
        </article>

        {/* 테이블 */}
        <article className='adMain__table'>
          <div>
            <table className='adMain__table__RestList'>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>가게명</th>
                  <th>가게주소</th>
                  <th>지역</th>
                  <th>평점</th>
                  <th>총 리뷰</th>
                  <th>찜 개수</th>
                  <th>공개</th>
                  <th>상태</th>
                </tr>
              </thead>

              <tbody>
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center' }}>
                      표시할 가게가 없습니다.
                    </td>
                  </tr>
                )}

                {items.map((r) => (
                  <tr key={r.restaurantId}>
                    <td>{r.restaurantId}</td>
                    <td onClick={() => navigate(`/admin/restaurant/${r.restaurantId}`)}>
                      {r.name || '-'}
                    </td>
                    <td onClick={() => navigate(`/admin/restaurant/${r.restaurantId}`)}>
                      {r.address || '-'}
                    </td>
                    <td>{r?.region?.depth1 || r?.region?.depth2 || '-'}</td>
                    <td>{calcRatingAvg(r)}</td>
                    <td>{Number(r.reviewCount) || 0}</td>
                    <td>{Number(r.likeCount) || 0}</td>
                    <td>{r.isPublished ? <Eye size={18} /> : <EyeOff size={18} color='#555' />}</td>
                    <td>
                      {r.dataStatus ? (
                        <div className={`chip ${
                          r.dataStatus === 'RAW' ? 'chip-raw' :
                          r.dataStatus === 'BASIC' ? 'chip-basic' :
                          r.dataStatus === 'VERIFIED' ? 'chip-verified' : ''
                        }`}>
                          {r.dataStatus}
                        </div>
                      ) : '-'}
                    </td>
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
