import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../../api/api';
import { apiImageUrl } from '../../../api/upload';
import KeywordSelector from './HomeKeywords';
import './ReviewForm.scss';
import { ImagePlus, X } from 'lucide-react';

const MAX_PHOTOS = 5;

/** ReviewForm (create/edit 겸용)
 * @param {{
 *  mode?: 'create'|'edit';
 *  restaurantId?: string|number;   // create에 필요
 *  initialTags: {code: string, name: string}[]
 *  initialValue?: {
 *    reviewId: number;
 *    restaurantId: number
 *    rating: number;
 *    content: string;
 *    tags: Array<{id: number|string, code: string, name: string}>;
 *    photos: Array<{ id: number|string, path: string, caption?: string }>;
 *  };
 *  onClose?: () => void;
 *  onSaved?: () => void;
 * }} props
 */
export default function ReviewForm({ mode = 'create', restaurantId, initialValue, initialTags, onClose, onSaved }) {
  const isEdit = mode === 'edit';

  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');

  // 태그
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  // 사진(기존)
  const existingPhotos = useMemo(() => {
    const arr = Array.isArray(initialValue?.photos) ? initialValue.photos : [];
    return arr
      .map((p) => ({
        id: p?.id ?? p?.photoId,
        path: p?.path ?? p?.filePath,
        caption: p?.caption ?? '',
      }))
      .filter((p) => p.id != null);
  }, [initialValue?.photos]);

  const [deleteMap, setDeleteMap] = useState({});
  const [captionMap, setCaptionMap] = useState({});

  // 사진(신규)
  const [newFiles, setNewFiles] = useState([]);
  const [newCaptions, setNewCaptions] = useState([]);

  function toast(message) {
    Swal.fire({
      text: message,
      confirmButtonText: '확인',
      scrollbarPadding: false,
      customClass: { popup: 'custom-popup', confirmButton: 'custom-button' },
    });
  }
  function extractErrorMessage(err) {
    const msg = err?.response?.data?.message || err?.response?.data?.error?.message || err?.message;
    return typeof msg === 'string' ? msg : null;
  }

  useEffect(() => {
    setRating(Number(initialValue?.rating ?? 5));
    setContent(initialValue?.content ?? '');
    setSelectedTags(Array.isArray(initialValue?.tags) ? initialValue.tags.map((t) => t.code) : []);

    // 기존 사진 캡션 기본값
    const base = {};
    for (const p of existingPhotos) base[p.id] = p.caption || '';
    setCaptionMap(base);

    setDeleteMap({});
    setNewFiles([]);
    setNewCaptions([]);
  }, [isEdit, restaurantId, initialValue?.rating, initialValue?.content, initialValue?.tags, existingPhotos]);

  useEffect(() => {
    setAllTags(initialTags);
  }, [initialTags]);

  // 신규 파일 프리뷰 URL
  const newPreviewUrls = useMemo(() => newFiles.map((f) => URL.createObjectURL(f)), [newFiles]);
  useEffect(() => {
    return () => {
      for (const u of newPreviewUrls) URL.revokeObjectURL(u);
    };
  }, [newPreviewUrls]);

  // ===== 신규 사진 핸들러 =====
  function onPickNewFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const aliveExistingCount = isEdit ? existingPhotos.filter((p) => !deleteMap[p.id]).length : 0;
    const currentCount = aliveExistingCount + newFiles.length;
    const remain = MAX_PHOTOS - currentCount;

    if (remain <= 0) {
      toast(`사진은 최대 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.`);
      e.target.value = '';
      return;
    }

    const accepted = files.slice(0, remain);
    if (accepted.length < files.length) toast(`사진은 최대 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.`);

    setNewFiles((prev) => [...prev, ...accepted]);
    setNewCaptions((prev) => [...prev, ...accepted.map(() => '')]);

    // 동일 파일 재선택 가능하도록
    e.target.value = '';
  }

  function removeNewFile(idx) {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewCaptions((prev) => prev.filter((_, i) => i !== idx));
  }

  // ===== FormData 빌더 =====
  function buildCreateFormData() {
    const fd = new FormData();

    fd.append('rating', String(rating));
    fd.append('content', content);

    if (selectedTags.length > 0) fd.append('tags', selectedTags.join(','));

    // 생성: photos[] + captions[] (인덱스 매칭)
    newFiles.forEach((file, idx) => {
      fd.append('photos', file);
      fd.append('captions', newCaptions[idx] ?? '');
    });

    return fd;
  }
  function buildEditFormData() {
    const fd = new FormData();

    fd.append('rating', String(rating));
    fd.append('content', content);

    fd.append('tags', selectedTags.join(','));

    // 기존 사진: 삭제/캡션 변경만 patch로
    const patch = [];
    for (const p of existingPhotos) {
      const id = p.id;
      const del = !!deleteMap[id];
      if (del) {
        patch.push({ id, delete: true });
        continue;
      }

      const nextCaption = captionMap[id] ?? '';
      const changedCaption = String(nextCaption) !== String(p.caption ?? '');
      if (changedCaption) patch.push({ id, caption: nextCaption });
    }

    if (patch.length > 0) fd.append('photosPatch', JSON.stringify(patch));

    // 신규 사진 추가: photos[] + photoIds[]='' + captions[]
    newFiles.forEach((file, idx) => {
      fd.append('photos', file);
      fd.append('photoIds', ''); // 현재 미구현
      // 서버가 "기존 교체 vs 신규" 구분할 때 사용
      fd.append('captions', newCaptions[idx] ?? '');
    });

    return fd;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[ReviewForm submit]', {
      mode,
      isEdit,
      restaurantId,
      reviewId: initialValue?.reviewId,
      contentLen: content?.length,
    });

    if (!isEdit && !content.trim()) {
      toast('리뷰 내용을 입력해 주세요.');
      return;
    }
    if (!isEdit && !restaurantId) {
      toast('음식점 ID 정보가 없습니다.');
      return;
    }

    try {
      if (!isEdit) {
        const fd = buildCreateFormData();
        await api.post(`/restaurants/${restaurantId}/reviews`, fd);
        onSaved?.();
        toast('리뷰가 등록되었습니다.');
      } else {
        const fd = buildEditFormData();
        await api.patch(`/reviews/${initialValue.reviewId}`, fd);
        onSaved?.();
        toast('리뷰가 수정되었습니다.');
      }
    } catch (err) {
      toast(
        extractErrorMessage(err) ||
          (isEdit ? '리뷰 수정 중 오류가 발생했습니다.' : '리뷰 등록 중 오류가 발생했습니다.'),
      );
    }
  };

  function toggleDeleteExisting(id) {
    setDeleteMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function updateExistingCaption(id, v) {
    setCaptionMap((prev) => ({ ...prev, [id]: v }));
  }
  function updateNewCaption(idx, v) {
    setNewCaptions((prev) => prev.map((x, i) => (i === idx ? v : x)));
  }

  return (
    <div className="ReviewForm">
      <form className="ReviewForm__contents" onSubmit={handleSubmit}>
        <h3>{isEdit ? '✏️ 리뷰 수정' : '😋 맛있는 식사를 하셨나요?'}</h3>

        <div className="rating-box">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="star" onClick={() => setRating(n)} style={{ cursor: 'pointer', fontSize: 24 }}>
              {n <= rating ? '★' : '☆'}
            </span>
          ))}
          <p>{rating}점</p>
        </div>

        <textarea
          value={content}
          rows="4"
          onChange={(e) => setContent(e.target.value)}
          placeholder="어떤 점이 마음에 드셨나요?"
        />

        {/* 태그 */}
        <KeywordSelector mode="multi" list={allTags} selected={selectedTags} onSelect={setSelectedTags} />

        {/* 사진 */}
        <div>
          <p>{isEdit ? '사진 편집' : '사진 첨부'}</p>

          <div className="slider-wrapper">
            <ul className="slider-list">
              {/* 1) 편집 모드: 기존 사진 (삭제/캡션만) */}
              {isEdit &&
                existingPhotos.map((p) => {
                  const id = p.id;
                  const isDel = !!deleteMap[id];
                  const displaySrc = p.path ? apiImageUrl(p.path) : null;

                  return (
                    <li key={`photo-${id}`} className="slider-item">
                      <article className="card">
                        <div
                          className="card-body"
                          style={{ display: 'flex', flexDirection: 'column', opacity: isDel ? 0.5 : 1 }}>
                          {displaySrc ? (
                            <img src={displaySrc} alt={p.caption || '기존 사진'} />
                          ) : (
                            <div style={{ height: 160, background: '#f2f2f2' }} />
                          )}

                          <div>
                            <label>캡션</label>
                            <input
                              disabled={isDel}
                              value={captionMap[id] ?? ''}
                              onChange={(e) => updateExistingCaption(id, e.target.value)}
                              style={{ width: '100%' }}
                            />
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => toggleDeleteExisting(id)}
                              style={{ backgroundColor: 'white' }}>
                              {isDel ? '삭제 취소' : '삭제'}
                            </button>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}

              {/* 2) 공통: 신규 첨부 사진 */}
              {newFiles.map((f, idx) => (
                <li className="slider-item" key={`new-${f.name}-${idx}`}>
                  <article className="card">
                    <div
                      className="card-body"
                      style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => removeNewFile(idx)}
                        aria-label="첨부 사진 삭제"
                        style={{
                          position: 'absolute',
                          right: 6,
                          top: 6,
                          width: 28,
                          height: 28,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255,255,255,0.85)',
                          border: '1px solid #ddd',
                          borderRadius: 999,
                          cursor: 'pointer',
                        }}>
                        <X size={16} />
                      </button>

                      <img src={newPreviewUrls[idx]} alt="첨부 사진" />

                      <input
                        placeholder="캡션 (선택)"
                        value={newCaptions[idx] ?? ''}
                        onChange={(e) => updateNewCaption(idx, e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </article>
                </li>
              ))}

              {/* 3) 공통: 새 사진 추가 */}
              <li className="slider-item">
                <label className="card" role="button">
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column' }}>
                    <p>새 사진 추가</p>
                    <ImagePlus size={64} />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onPickNewFiles}
                      style={{ display: 'none' }}
                    />
                  </div>
                </label>
              </li>
            </ul>
          </div>
        </div>

        <div className="btn-box">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
