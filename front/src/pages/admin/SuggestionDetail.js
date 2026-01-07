import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminInquiryDetailApi, AdminInquiryAnswerApi } from '../../api/admin';
import { apiImageUrl } from '../../api/upload';

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

export default function AdSuggDetail() {
  const navigate = useNavigate();
  const { inquiryId } = useParams();

  const [item, setItem] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [originalAnswer, setOriginalAnswer] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    let alive = true;

    async function fetchDetail() {
      setLoading(true);
      setErrMsg('');
      try {
        const { data } = await AdminInquiryDetailApi(Number(inquiryId));
        if (!alive) return;

        const it = data?.result ?? null;
        setItem(it);

        const ans = it?.answer ?? '';
        setAnswerText(ans);
        setOriginalAnswer(ans);

        const st = it?.status;
        setIsEditing(st === 'PENDING');
      } catch {
        if (!alive) return;
        setErrMsg('상세 정보를 불러오지 못했습니다.');
        setItem(null);
        setAnswerText('');
        setOriginalAnswer('');
        setIsEditing(false);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchDetail();
    return () => {
      alive = false;
    };
  }, [inquiryId]);

  const typeText = useMemo(() => {
    const code = item?.type;
    return code ? TYPE_LABEL[code] || code : '-';
  }, [item?.type]);

  const statusText = useMemo(() => {
    const code = item?.status;
    return code ? STATUS_LABEL[code] || code : '-';
  }, [item?.status]);

  function fmtDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString();
  }

  function fmtTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  }

  const isAnswered = item?.status === 'ANSWERED';

  function onClickEdit() {
    setIsEditing(true);
  }
  function onCancelEdit() {
    setAnswerText(originalAnswer);
    setIsEditing(false);
  }

  async function onSaveAnswer() {
    const id = Number(inquiryId);
    if (!Number.isFinite(id) || id <= 0) return;

    const answer = String(answerText ?? '').trim();
    if (!answer) {
      alert('답변 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    setErrMsg('');

    try {
      // 1) 저장
      await AdminInquiryAnswerApi(id, { answer });

      // 2) 성공 시 목록으로 이동
      navigate('/admin/suggestion');
    } catch (e) {
      setErrMsg('답변 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main">
      <section className="main__wrap">
        <article>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <h1>■ 문의 상세</h1>
          </div>

          {loading && <p>Loading...</p>}
          {!loading && errMsg && <p>{errMsg}</p>}
          {!loading && !errMsg && !item && <p>데이터가 없습니다.</p>}

          {!loading && !errMsg && item && (
            <>
              {/* ===== 문의상세 표 ===== */}
              <div style={{ marginTop: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td>문의제목</td>
                      <td colSpan={3}>{item.title || '-'}</td>
                    </tr>

                    <tr>
                      <td>작성자</td>
                      <td>
                        {item.userId != null ? (
                          <span
                            onClick={() => navigate(`/admin/member/${item.userId}`)}
                            style={{ cursor: 'pointer' }}
                            title="유저 상세 보기">
                            {item.userNickname || '-'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>작성일</td>
                      <td>{fmtDate(item.createdAt)}</td>
                    </tr>

                    <tr>
                      <td>문의분류</td>
                      <td>{typeText}</td>
                      <td>상태</td>
                      <td>{statusText}</td>
                    </tr>

                    <tr>
                      <td>문의내용</td>
                      <td colSpan={3}>{item.content || '-'}</td>
                    </tr>

                    <tr>
                      <td>첨부파일</td>
                      <td colSpan={3}>
                        {(Array.isArray(item.imagePaths) ? item.imagePaths : []).length === 0 ? (
                          '-'
                        ) : (
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {item.imagePaths.map((p, idx) => {
                              const url = apiImageUrl(p);
                              const fileName = String(p).split('/').pop() || `file-${idx + 1}`;
                              return (
                                <div key={`${p}-${idx}`} style={{ width: 150 }}>
                                  <div style={{ border: '1px solid #333', padding: 8, textAlign: 'center' }}>
                                    <img
                                      src={url}
                                      alt={fileName}
                                      style={{ width: '100%', height: 110, objectFit: 'cover' }}
                                    />
                                    <div style={{ marginTop: 6 }}>
                                      <a href={url} download>
                                        다운로드
                                      </a>
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 12, marginTop: 6, wordBreak: 'break-all' }}>{fileName}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ===== 문의답변 ===== */}
              <div style={{ marginTop: 18 }}>
                <h2 style={{ margin: '0 0 8px 0' }}>■ 문의답변</h2>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td>답변자</td>
                      <td>{item.answeredByUserId != null ? `${item.answeredByUserNickname || '-'}` : '-'}</td>
                    </tr>

                    <tr>
                      <td>답변시각</td>
                      <td>{fmtTime(item.answeredAt)}</td>
                    </tr>

                    <tr>
                      <td>답변내용</td>
                      <td>
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="답변 내용을 입력하세요"
                          readOnly={isAnswered && !isEditing}
                          style={{
                            width: '100%',
                            minHeight: 140,
                            resize: 'vertical',
                            background: isAnswered && !isEditing ? '#f7f7f7' : undefined,
                          }}
                        />
                        {isAnswered && !isEditing && (
                          <div style={{ marginTop: 6, fontSize: 12 }}>
                            답변 완료 상태입니다. 수정하려면 “답변 수정”을 눌러주세요.
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* ===== 버튼 영역 ===== */}
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" onClick={() => navigate(-1)}>
                    뒤로가기
                  </button>

                  {/* PENDING: 바로 저장 */}
                  {!isAnswered && (
                    <button type="button" onClick={onSaveAnswer}>
                      답변 저장
                    </button>
                  )}

                  {/* ANSWERED: 기본은 수정 버튼, 편집중이면 저장/취소 */}
                  {isAnswered && !isEditing && (
                    <button type="button" onClick={onClickEdit}>
                      답변 수정
                    </button>
                  )}

                  {isAnswered && isEditing && (
                    <>
                      <button type="button" onClick={onCancelEdit}>
                        취소
                      </button>
                      <button type="button" onClick={onSaveAnswer}>
                        수정 저장
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
