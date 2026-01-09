import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminUserListApi } from '../../api/admin';
import AdPagination from './components/AdPagination.js';

export default function AdMember() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState('recent');

  const [searchField, setSearchField] = useState('');
  const [inputQ, setInputQ] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;

    async function fetchList() {
      setLoading(true);
      setErrMsg('');
      try {
        const params = {
          page,
          limit,
          sort,
          searchField: searchField || undefined,
          q: q || undefined,
        };

        const { data } = await AdminUserListApi(params);
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
        setErrMsg('회원 목록을 불러오지 못했습니다.');
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
  }, [page, limit, sort, searchField, q]);

  const onSearch = () => {
    setPage(1);
    setQ(inputQ.trim());
  };

  const onResetAll = () => {
    setPage(1);
    setLimit(10);
    setSort('recent');
    setSearchField('');
    setInputQ('');
    setQ('');
  };

  return (
    <div className="adMain">
      <section className="adMain__wrap">

        {/* 타이틀 */}
        <article className="adMain__title">
          <h1><span>●</span> 회원 목록</h1>
        </article>

        {/* 필터/검색 + 로딩/정렬 */}
        <article className="adMain__nav">
          <div className="adMain__nav__search">
            <div className="filter-box-admin">
              <div>
                <p>검색범위</p>
                <select
                  value={searchField}
                  onChange={(e) => {
                    setPage(1);
                    setSearchField(e.target.value);
                  }}
                >
                  <option value="">전체</option>
                  <option value="nickname">닉네임</option>
                  <option value="email">아이디</option>
                  <option value="status">회원상태</option>
                </select>
              </div>

              <div>
                <p>페이지당</p>
                <select
                  value={limit}
                  onChange={(e) => {
                    setPage(1);
                    setLimit(Number(e.target.value));
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="search-box-admin">
              <input
                value={inputQ}
                onChange={(e) => setInputQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                placeholder="검색어를 입력해주세요."
              />
              <button type="button" onClick={onSearch}>검색</button>
              <button type="button" onClick={onResetAll}>초기화</button>
            </div>
          </div>

          <div className="adMain__nav__sort">
            <div>
              {loading && <p>Loading...</p>}
              {!loading && errMsg && <p>{errMsg}</p>}
              {!loading && !errMsg && <p>총 회원 수: {total}명</p>}
            </div>

            <div>
              <select
                value={sort}
                onChange={(e) => {
                  setPage(1);
                  setSort(e.target.value);
                }}
              >
                <option value="recent">최근가입순</option>
              </select>
            </div>
          </div>
        </article>

        {/* 테이블 */}
        <article className="adMain__table">
          <div>
            <table className="adMain__table__MemberList">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이름(닉네임)</th>
                  <th>아이디</th>
                  <th>연락처</th>
                  <th>가입일</th>
                  <th>회원상태</th>
                </tr>
              </thead>

              <tbody>
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center' }}>
                      표시할 회원이 없습니다.
                    </td>
                  </tr>
                )}

                {items.map((u) => (
                  <tr key={u.userId}>
                    <td>{u.userId}</td>
                    <td onClick={() => navigate(`/admin/member/${u.userId}`)}>
                      {u.nickname || '-'}
                    </td>
                    <td>{u.email || '-'}</td>
                    <td>-</td>
                    <td>{u.createdAt?.slice(0, 10) || '-'}</td>
                    <td>
                      {u.status ? (
                        <div
                          className={`chip ${
                            u.status === 'ACTIVE' ? 'chip-active' :
                            u.status === 'DELETED' ? 'chip-deleted' : ''
                          }`}
                        >
                          {u.status}
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
        <article className="adMain__pagenation">
          <AdPagination
            page={page}
            total={total}
            limit={limit}
            onChange={(p) => setPage(p)}
          />
        </article>

      </section>
    </div>
  );
}
