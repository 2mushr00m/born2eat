import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminReviewDetailApi, AdminReviewHideApi, AdminReviewShowApi } from '../../api/admin';
import { apiImageUrl } from '../../api/upload';
import { Eye, EyeOff } from 'lucide-react';

export default function AdReviewDetail() {
  const navigate = useNavigate();
  const { reviewId } = useParams();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [toggleBusy, setToggleBusy] = useState(false);

  // ---- fetch ----
  async function fetchDetail(id) {
    const { data } = await AdminReviewDetailApi(id);
    return data?.result ?? null;
  }

  useEffect(() => {
    let alive = true;

    async function run() {
      const id = Number(reviewId);
      if (!Number.isFinite(id) || id <= 0) {
        setErrMsg('잘못된 리뷰 ID 입니다.');
        setItem(null);
        return;
      }

      setLoading(true);
      setErrMsg('');
      try {
        const it = await fetchDetail(id);
        if (!alive) return;
        setItem(it);
      } catch {
        if (!alive) return;
        setErrMsg('리뷰 상세를 불러오지 못했습니다.');
        setItem(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [reviewId]);

  // ---- helpers ----
  function fmtDate(isoOrDateStr) {
    if (!isoOrDateStr) return '-';
    const d = new Date(isoOrDateStr);
    if (Number.isNaN(d.getTime())) return String(isoOrDateStr);
    return d.toLocaleString(); // createdAt이 ISO라면 시간까지 표기
  }

  function safeNum(v, fallback = '-') {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function fmtRating(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '-';
    // 평점이 소수로 올 수도 있어서 1자리로 표시(원하면 변경)
    return Math.round(n * 10) / 10;
  }

  // ---- schema: tags: [{id,code,name}] ----
  const tagText = useMemo(() => {
    const tags = item?.tags;
    if (!Array.isArray(tags) || tags.length === 0) return '-';
    return tags
      .map((t) => t?.name ?? t?.code ?? String(t?.id ?? ''))
      .filter(Boolean)
      .join(', ');
  }, [item]);

  // ---- schema: photos: [{id,path,caption}] ----
  const photos = useMemo(() => {
    const arr = item?.photos;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((p) => ({
        id: p?.id ?? null,
        path: p?.path ?? '',
        caption: p?.caption ?? '',
      }))
      .filter((p) => Boolean(p.path));
  }, [item]);

  const isVisible = Boolean(item?.isVisible);

  // ---- toggle ----
  async function onToggleVisible() {
    const id = Number(reviewId);
    if (!Number.isFinite(id) || id <= 0) return;
    if (toggleBusy) return;

    setToggleBusy(true);
    setErrMsg('');
    try {
      if (isVisible) await AdminReviewHideApi(id);
      else await AdminReviewShowApi(id);

      // 서버 truth로 재조회
      const it = await fetchDetail(id);
      setItem(it);
    } catch {
      setErrMsg('노출여부 변경에 실패했습니다.');
    } finally {
      setToggleBusy(false);
    }
  }

  return (
    <div className="adMain">
      <section className="adMain__wrap">
        <article className='adMain__title'>
          <h1><span>●</span> 리뷰 상세정보</h1>
        </article>
        <article>
          {loading && <p>Loading...</p>}
          {!loading && errMsg && <p>{errMsg}</p>}
          {!loading && !errMsg && !item && <p>데이터가 없습니다.</p>}

          {!loading && !errMsg && item && (
            <div style={{ marginTop: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td>가게이름</td>
                    <td>
                      {item.restaurantId ? (
                        <span
                          onClick={() => navigate(`/admin/restaurant/${item.restaurantId}`)}
                          style={{ cursor: 'pointer' }}
                          title="가게 상세로 이동">
                          {item.restaurantName || '-'}
                        </span>
                      ) : (
                        item.restaurantName || '-'
                      )}
                    </td>

                    <td>작성자</td>
                    <td>
                      {item.userId ? (
                        <span
                          onClick={() => navigate(`/admin/member/${item.userId}`)}
                          style={{ cursor: 'pointer' }}
                          title="회원 상세로 이동">
                          {item.userNickname || '-'}
                        </span>
                      ) : (
                        item.userNickname || '-'
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>태그</td>
                    <td colSpan={3}>{tagText}</td>
                  </tr>

                  <tr>
                    <td>평점</td>
                    <td>{fmtRating(item.rating)}</td>
                    <td>좋아요수</td>
                    <td>{safeNum(item.likeCount, 0)}</td>
                  </tr>

                  <tr>
                    <td>첨부파일</td>
                    <td colSpan={3}>
                      {photos.length === 0 ? (
                        '-'
                      ) : (
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {photos.map((p, idx) => {
                            const url = apiImageUrl(p.path);
                            const fileName = String(p.path).split('/').pop() || `file-${idx + 1}`;
                            return (
                              <div key={`${p.id ?? 'p'}-${idx}`} style={{ width: 150 }}>
                                <img
                                  src={url}
                                  alt={p.caption || fileName}
                                  style={{
                                    width: '100%',
                                    height: 110,
                                    objectFit: 'cover',
                                    border: '1px solid #333',
                                  }}
                                />
                                {p.caption ? (
                                  <div style={{ fontSize: 12, marginTop: 4, whiteSpace: 'pre-wrap' }}>{p.caption}</div>
                                ) : null}
                                <div style={{ marginTop: 6 }}>
                                  <a href={url} download>
                                    다운로드
                                  </a>
                                </div>
                                <div style={{ fontSize: 12, marginTop: 6, wordBreak: 'break-all' }}>{fileName}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>내용</td>
                    <td colSpan={3}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{item.content || '-'}</div>
                    </td>
                  </tr>

                  <tr>
                    <td>작성일</td>
                    <td>{fmtDate(item.createdAt)}</td>
                    <td>수정일</td>
                    <td>{fmtDate(item.updatedAt)}</td>
                  </tr>

                  <tr>
                    <td>노출여부</td>
                    <td colSpan={3}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span>{isVisible ? '노출(Y)' : '숨김(N)'}</span>

                        <button
                          type="button"
                          onClick={onToggleVisible}
                          disabled={toggleBusy}
                          aria-pressed={!isVisible}
                          aria-label={isVisible ? '리뷰 숨기기' : '리뷰 보이기'}
                          title={isVisible ? '숨기기' : '보이기'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            cursor: toggleBusy ? 'not-allowed' : 'pointer',
                          }}>
                          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                          <span>{toggleBusy ? '처리중…' : isVisible ? '숨기기' : '보이기'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <button type="button" onClick={() => navigate(-1)}>
            뒤로가기
          </button>
        </article>
      </section>
    </div>
  );
}
