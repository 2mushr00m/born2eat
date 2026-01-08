import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiImageUrl } from '../../api/upload';
import { getRest, patchRestBase, postRestPhotos, deleteRestPhotos } from '../../api/admin';
import { X } from 'lucide-react';

const PHOTO_TYPE_LABEL = {
  MAIN: '대표사진',
  MENU_BOARD: '메뉴판',
  ETC: '기타',
};
const SOURCE_TYPE_LABEL = {
  USER: '회원 제보',
  ADMIN: '관리자',
  CRAWLER: '수집/크롤링',
};

export default function AdRestDetail() {
  const { restaurantId } = useParams();

  const [item, setItem] = useState(null);

  // 기본 정보 수정 토글 + 폼
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [form, setForm] = useState(toBaseForm(null));

  // 사진 업로드 폼
  const [upload, setUpload] = useState({
    sourceType: 'ADMIN',
    sourceUserId: '',
    items: [], // { file, previewUrl, photoType, caption, sortOrder }
  });

  // 공통 상태
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // ===== 데이터 로드 =====
  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErrMsg('');
      try {
        const id = Number(restaurantId);
        const { data } = await getRest(id);
        if (!alive) return;

        const result = data?.result ?? null;
        setItem(result);
        setForm(toBaseForm(result));
        setIsEditingBase(false);
      } catch (e) {
        if (!alive) return;
        setItem(null);
        setForm(toBaseForm(null));
        setIsEditingBase(false);
        setErrMsg('상세 정보를 불러오지 못했습니다.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [restaurantId]);

  const photos = useMemo(() => {
    const p = item?.photos ?? {};
    return {
      main: Array.isArray(p.main) ? p.main : [],
      menuBoard: Array.isArray(p.menuBoard) ? p.menuBoard : [],
      etc: Array.isArray(p.etc) ? p.etc : [],
    };
  }, [item]);

  async function reload() {
    const id = Number(restaurantId);
    const { data } = await getRest(id);
    const result = data?.result ?? null;
    setItem(result);
    setForm(toBaseForm(result));
  }

  // 기본정보 수정
  async function onSaveBase() {
    const id = Number(restaurantId);
    setLoading(true);
    setErrMsg('');
    try {
      await patchRestBase(id, form);
      await reload();
      setIsEditingBase(false);
    } catch (e) {
      setErrMsg('기본 정보 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  // 사진 수정
  function onPickUploadFiles(e) {
    const files = Array.from(e?.target?.files || []);
    if (!files.length) return;

    setUpload((s) => {
      const nextItems = files.map((f) => ({
        file: f,
        previewUrl: URL.createObjectURL(f),
        photoType: 'ETC',
        caption: '',
        sortOrder: '',
      }));
      return { ...s, items: [...s.items, ...nextItems] };
    });

    // 같은 파일 재선택 가능하게
    e.target.value = '';
  }
  function onRemoveUploadItem(idx) {
    setUpload((s) => {
      const it = s.items[idx];
      if (it?.previewUrl) {
        try {
          URL.revokeObjectURL(it.previewUrl);
        } catch {}
      }
      const next = s.items.filter((_, i) => i !== idx);
      return { ...s, items: next };
    });
  }
  function onChangeUploadItem(idx, patch) {
    setUpload((s) => {
      const next = s.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      return { ...s, items: next };
    });
  }
  function clearUploadAll() {
    setUpload((s) => {
      for (const it of s.items) {
        if (it?.previewUrl) {
          try {
            URL.revokeObjectURL(it.previewUrl);
          } catch {}
        }
      }
      return { ...s, items: [] };
    });
  }
  async function onUploadPhotos() {
    const items = upload.items || [];
    if (!items.length) {
      alert('업로드할 파일을 선택해주세요.');
      return;
    }

    const fd = new FormData();

    // 1) files
    for (const it of items) {
      if (it?.file) fd.append('photos', it.file);
    }

    // 2) meta(JSON) — 파일 순서와 동일하게 구성
    const meta = items.map((it) => {
      const captionRaw = String(it?.caption || '').trim();
      const caption = captionRaw ? captionRaw : null;

      const soRaw = String(it?.sortOrder ?? '').trim();
      let sortOrder = null;
      if (soRaw !== '') {
        const n = Number(soRaw);
        sortOrder = Number.isFinite(n) ? n : null;
      }

      const photoType = it?.photoType || 'ETC';

      return { photoType, caption, sortOrder };
    });
    fd.append('meta', JSON.stringify(meta));

    // 3) source (묶음 단위)
    if (upload.sourceType) fd.append('sourceType', String(upload.sourceType));
    if (String(upload.sourceUserId || '').trim()) fd.append('sourceUserId', String(upload.sourceUserId).trim());

    setLoading(true);
    setErrMsg('');
    try {
      await postRestPhotos(restaurantId, fd);
      await reload();

      // 업로드 폼 초기화
      clearUploadAll();
      setUpload((s) => ({ ...s, sourceType: 'ADMIN', sourceUserId: '' }));
    } catch (e) {
      setErrMsg('사진 업로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }
  async function onDeletePhoto(photoId) {
    const rid = Number(restaurantId);
    const pid = Number(photoId);
    if (!rid || !pid) return;

    const ok = window.confirm('이 사진을 삭제할까요?');
    if (!ok) return;

    setLoading(true);
    setErrMsg('');
    try {
      await deleteRestPhotos(rid, pid);
      await reload();
    } catch (e) {
      setErrMsg('사진 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adMain">
      <section className="adMain__wrap">
        <article className="adMain__title">
          <h1>
            <span>●</span> 식당 상세정보
          </h1>
        </article>

        <article>
          {loading && <p>Loading...</p>}
          {!loading && errMsg && <p>{errMsg}</p>}
          {!loading && !errMsg && !item && <p>데이터가 없습니다.</p>}

          {!loading && !errMsg && item && (
            <>
              {renderBaseSection({ item, form, setForm, isEditingBase, setIsEditingBase, onSaveBase })}
              {renderPhotoSection({
                photos,
                upload,
                setUpload,
                onPickUploadFiles,
                onChangeUploadItem,
                onRemoveUploadItem,
                clearUploadAll,
                onUploadPhotos,
                onDeletePhoto,
              })}
              {renderTagSection()}
              {renderBroadcastSection()}
            </>
          )}
        </article>
      </section>
    </div>
  );
}

/* ===========================
 * 섹션 렌더 함수들
 * =========================== */
function renderBaseSection({ item, form, setForm, isEditingBase, setIsEditingBase, onSaveBase }) {
  const regionText = (item?.region?.depth1 || '') + (item?.region?.depth2 ? ` ${item.region.depth2}` : '') || '-';

  const tdLabelStyle = { width: 120 };
  const inputStyle = { width: '90%' };

  function startEdit() {
    setForm(toBaseForm(item));
    setIsEditingBase(true);
  }
  function cancelEdit() {
    setForm(toBaseForm(item));
    setIsEditingBase(false);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2 style={{ margin: 0 }}>■ 기본 정보</h2>

        {!isEditingBase ? (
          <button type="button" onClick={startEdit}>
            기본 정보 수정
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={cancelEdit}>
              취소
            </button>
            <button type="button" onClick={onSaveBase}>
              저장
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={tdLabelStyle}>ID</td>
              <td>{item.restaurantId}</td>

              <td style={tdLabelStyle}>공개</td>
              <td>
                {!isEditingBase ? (
                  item.isPublished ? (
                    'Y'
                  ) : (
                    'N'
                  )
                ) : (
                  <select
                    value={form.isPublished}
                    onChange={(e) => setForm((s) => ({ ...s, isPublished: e.target.value }))}
                    style={inputStyle}>
                    <option value="">미변경</option>
                    <option value="true">공개</option>
                    <option value="false">비공개</option>
                  </select>
                )}
              </td>
            </tr>

            <tr>
              <td style={tdLabelStyle}>가게명</td>
              <td>
                {!isEditingBase ? (
                  item.name || '-'
                ) : (
                  <input
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="가게명"
                    style={inputStyle}
                  />
                )}
              </td>

              <td style={tdLabelStyle}>상태</td>
              <td>
                {!isEditingBase ? (
                  item.dataStatus || '-'
                ) : (
                  <select
                    value={form.dataStatus}
                    onChange={(e) => setForm((s) => ({ ...s, dataStatus: e.target.value }))}
                    style={inputStyle}>
                    <option value="">미변경</option>
                    <option value="RAW">RAW</option>
                    <option value="BASIC">BASIC</option>
                    <option value="VERIFIED">VERIFIED</option>
                  </select>
                )}
              </td>
            </tr>

            <tr>
              <td style={tdLabelStyle}>분류</td>
              <td>{item.foodCategory || '-'}</td>

              <td style={tdLabelStyle}>대표메뉴</td>
              <td>
                {!isEditingBase ? (
                  item.mainFood || '-'
                ) : (
                  <input
                    value={form.mainFood}
                    onChange={(e) => setForm((s) => ({ ...s, mainFood: e.target.value }))}
                    placeholder="대표 음식"
                    style={inputStyle}
                  />
                )}
              </td>
            </tr>

            <tr>
              <td style={tdLabelStyle}>전화</td>
              <td>
                {!isEditingBase ? (
                  item.phone || '-'
                ) : (
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="전화번호"
                    style={inputStyle}
                  />
                )}
              </td>

              <td style={tdLabelStyle}>카카오맵 Id</td>
              <td>
                {!isEditingBase ? (
                  item.kakaoPlaceId || '-'
                ) : (
                  <input
                    value={form.kakaoPlaceId}
                    onChange={(e) => setForm((s) => ({ ...s, kakaoPlaceId: e.target.value }))}
                    placeholder="kakaoPlaceId"
                    style={inputStyle}
                  />
                )}
              </td>
            </tr>

            <tr>
              <td style={tdLabelStyle}>주소</td>
              <td colSpan={3}>
                {!isEditingBase ? (
                  item.address || '-'
                ) : (
                  <input
                    value={form.address}
                    onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                    placeholder="주소"
                    style={inputStyle}
                  />
                )}
              </td>
            </tr>

            <tr>
              <td style={tdLabelStyle}>지역</td>
              <td>{regionText}</td>

              <td style={tdLabelStyle}>법정동코드</td>
              <td>
                {!isEditingBase ? (
                  item?.region?.code || '-'
                ) : (
                  <input
                    value={form.regionCode}
                    onChange={(e) => setForm((s) => ({ ...s, regionCode: e.target.value }))}
                    placeholder="regionCode"
                    style={inputStyle}
                  />
                )}
              </td>
            </tr>

            {/* ✅ 위도/경도 분리 표기 */}
            <tr>
              <td style={tdLabelStyle}>위도 (latitude)</td>
              <td>
                {!isEditingBase ? (
                  item.latitude != null ? (
                    String(item.latitude)
                  ) : (
                    '-'
                  )
                ) : (
                  <input
                    value={form.latitude}
                    onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))}
                    placeholder="예: 37.5665"
                    style={inputStyle}
                  />
                )}
              </td>

              <td style={tdLabelStyle}>경도 (longitude)</td>
              <td>
                {!isEditingBase ? (
                  item.longitude != null ? (
                    String(item.longitude)
                  ) : (
                    '-'
                  )
                ) : (
                  <input
                    value={form.longitude}
                    onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))}
                    placeholder="예: 126.9780"
                    style={inputStyle}
                  />
                )}
              </td>
            </tr>

            <tr>
              <td style={tdLabelStyle}>설명</td>
              <td colSpan={3}>
                {!isEditingBase ? (
                  item.description || '-'
                ) : (
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    placeholder="설명"
                    style={{ width: '100%', minHeight: 90, resize: 'vertical' }}
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
function renderPhotoSection({
  photos,
  upload,
  setUpload,
  onPickUploadFiles,
  onChangeUploadItem,
  onRemoveUploadItem,
  clearUploadAll,
  onUploadPhotos,
  onDeletePhoto,
}) {
  const items = upload?.items || [];

  return (
    <div style={{ marginTop: 22 }}>
      <h2 style={{ margin: '0 0 8px 0' }}>■ 사진</h2>

      {/* 업로드 영역 */}
      <div style={{ border: '1px solid #ddd', padding: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>출처</span>
          <select value={upload.sourceType} onChange={(e) => setUpload((s) => ({ ...s, sourceType: e.target.value }))}>
            <option value="ADMIN">{SOURCE_TYPE_LABEL.ADMIN}</option>
            <option value="USER">{SOURCE_TYPE_LABEL.USER}</option>
          </select>

          {upload.sourceType === 'USER' && (
            <input
              value={upload.sourceUserId}
              onChange={(e) => setUpload((s) => ({ ...s, sourceUserId: e.target.value }))}
              placeholder="제보자 ID (선택)"
              style={{ width: 180 }}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, margin: 12 }}>
          <input type="file" multiple accept="image/*" onChange={onPickUploadFiles} />
          <button type="button" onClick={onUploadPhotos} disabled={!items.length}>
            업로드
          </button>

          <button type="button" onClick={clearUploadAll} disabled={!items.length}>
            선택 초기화
          </button>
        </div>

        {/* 미리보기 + 파일별 메타 */}
        {items.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {items.map((it, idx) => {
              const name = it?.file?.name || `file-${idx + 1}`;
              const url = it?.previewUrl || '';
              return (
                <div key={`${name}-${idx}`} style={{ width: 200, border: '1px solid #eee', padding: 10 }}>
                  <div style={{ border: '1px solid #333', padding: 6, textAlign: 'center' }}>
                    {url ? (
                      <img src={url} alt={name} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        (no preview)
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 8, fontSize: 12, wordBreak: 'break-all' }}>{name}</div>

                  <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                    <select
                      value={it.photoType}
                      onChange={(e) => onChangeUploadItem(idx, { photoType: e.target.value })}>
                      <option value="MAIN">{PHOTO_TYPE_LABEL.MAIN}</option>
                      <option value="MENU_BOARD">{PHOTO_TYPE_LABEL.MENU_BOARD}</option>
                      <option value="ETC">{PHOTO_TYPE_LABEL.ETC}</option>
                    </select>

                    <input
                      value={it.caption}
                      onChange={(e) => onChangeUploadItem(idx, { caption: e.target.value })}
                      placeholder="캡션 (선택)"
                    />

                    <input
                      value={it.sortOrder}
                      onChange={(e) => onChangeUploadItem(idx, { sortOrder: e.target.value })}
                      placeholder="노출 순서 (선택)"
                    />

                    <button type="button" onClick={() => onRemoveUploadItem(idx)}>
                      제거
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 현재 사진 목록 */}
      <div style={{ marginTop: 12 }}>
        <PhotoGroup title="대표사진" items={photos.main} onDelete={onDeletePhoto} />
        <PhotoGroup title="메뉴판" items={photos.menuBoard} onDelete={onDeletePhoto} />
        <PhotoGroup title="기타" items={photos.etc} onDelete={onDeletePhoto} />
      </div>
    </div>
  );
}
function renderTagSection() {
  return (
    <div style={{ marginTop: 22 }}>
      <h2 style={{ margin: '0 0 8px 0' }}>■ 태그</h2>
      <div style={{ border: '1px dashed #bbb', padding: 12 }}>
        <div style={{ marginBottom: 8 }}>태그 수정 영역 (TODO)</div>
        <div>현재 태그 목록 (TODO)</div>
      </div>
    </div>
  );
}
function renderBroadcastSection() {
  return (
    <div style={{ marginTop: 22 }}>
      <h2 style={{ margin: '0 0 8px 0' }}>■ 방송</h2>
      <div style={{ border: '1px dashed #bbb', padding: 12 }}>
        <div style={{ marginBottom: 8 }}>방송 수정 영역 (TODO)</div>
        <div>해당 음식점 방송 정보 (TODO)</div>
      </div>
    </div>
  );
}

/* ===========================
 * 작은 유틸
 * =========================== */

function toBaseForm(it) {
  const regionCode = it?.region?.code ?? '';
  return {
    name: it?.name ?? '',
    description: it?.description ?? '',
    kakaoPlaceId: it?.kakaoPlaceId ?? '',
    regionCode: regionCode ?? '',
    mainFood: it?.mainFood ?? '',
    phone: it?.phone ?? '',
    address: it?.address ?? '',
    longitude: it?.longitude != null ? String(it.longitude) : '',
    latitude: it?.latitude != null ? String(it.latitude) : '',
    isPublished: '', // 서버에서 처리할 수 있게 기본은 빈 값
    dataStatus: '', // 서버에서 처리할 수 있게 기본은 빈 값
  };
}
function PhotoGroup({ title, items, onDelete }) {
  const list = Array.isArray(items) ? items : [];

  return (
    <div style={{ marginTop: 14 }}>
      <h3>
        {title} ({list.length})
      </h3>

      {list.length === 0 ? (
        <div style={{ fontSize: 13, color: '#666' }}>-</div>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {list.map((p, idx) => {
            const url = apiImageUrl(p.filePath);
            const fileName =
              String(p.filePath || '')
                .split('/')
                .pop() || `photo-${idx + 1}`;

            return (
              <div key={`${p.photoId ?? p.filePath}-${idx}`} style={{ width: 180 }}>
                <div style={{ padding: 8, textAlign: 'center', position: 'relative' }}>
                  <X
                    size={18}
                    onClick={() => onDelete?.(p.photoId)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: 8,
                      cursor: 'pointer',
                      opacity: 0.7,
                      transition: 'opacity 120ms ease, transform 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scale(1.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.7';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />

                  <img src={url} alt={fileName} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                  <div style={{ fontSize: 12 }}>{p.caption || '-'}</div>
                </div>
                <div style={{ fontSize: 12, wordBreak: 'break-all' }}>{fileName}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
