import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiImageUrl } from '../../api/upload';
import {
  AdminRestDetailApi,
  AdminRestUpdateApi,
  AdminRestCreatePhotosApi,
  // AdminRestDeletePhotoApi,
} from '../../api/admin';

const FD_KEYS = {
  files: 'photos',
  photoType: 'photoType',
  caption: 'caption',
};
const PHOTO_TYPE_LABEL = {
  MAIN: '대표사진',
  MENU_BOARD: '메뉴판',
  ETC: '기타',
};

export default function AdRestDetail() {
  const { restaurantId } = useParams();

  const [item, setItem] = useState(null);

  // 기본 정보 수정 토글 + 폼
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [form, setForm] = useState(toBaseForm(null));

  // 사진 업로드 폼
  const [uploadType, setUploadType] = useState('MAIN');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadFiles, setUploadFiles] = useState(null);

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
        const { data } = await AdminRestDetailApi(id);
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
    const { data } = await AdminRestDetailApi(id);
    const result = data?.result ?? null;
    setItem(result);
    setForm(toBaseForm(result));
  }

  async function onSaveBase() {
    const id = Number(restaurantId);
    const payload = buildUpdatePayload(form); // 검증/정리는 백엔드에서
    setLoading(true);
    setErrMsg('');
    try {
      await AdminRestUpdateApi(id, payload);
      await reload();
      setIsEditingBase(false);
    } catch (e) {
      setErrMsg('기본 정보 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }
  async function onUploadPhotos() {
    const id = Number(restaurantId);

    if (!uploadFiles || uploadFiles.length === 0) {
      alert('업로드할 파일을 선택해주세요.');
      return;
    }

    const fd = new FormData();
    fd.append(FD_KEYS.photoType, uploadType);
    if (String(uploadCaption || '').trim()) fd.append(FD_KEYS.caption, String(uploadCaption).trim());

    for (const f of uploadFiles) fd.append(FD_KEYS.files, f);

    setLoading(true);
    setErrMsg('');
    try {
      await AdminRestCreatePhotosApi(id, fd);
      await reload();

      setUploadCaption('');
      setUploadFiles(null);
      const input = document.getElementById('rest-photo-file-input');
      if (input) input.value = '';
    } catch (e) {
      setErrMsg('사진 업로드에 실패했습니다.');
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
                uploadType,
                setUploadType,
                uploadCaption,
                setUploadCaption,
                setUploadFiles,
                onUploadPhotos,
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

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2 style={{ margin: 0 }}>■ 기본 정보</h2>

        {!isEditingBase ? (
          <button type="button" onClick={() => setIsEditingBase(true)}>
            기본 정보 수정
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setIsEditingBase(false)}>
              취소
            </button>
            <button type="button" onClick={onSaveBase}>
              저장
            </button>
          </div>
        )}
      </div>

      {/* 기본정보 표 */}
      <div style={{ marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td>ID</td>
              <td>{item.restaurantId}</td>
              <td>공개</td>
              <td>{item.isPublished ? 'Y' : 'N'}</td>
            </tr>
            <tr>
              <td>가게명</td>
              <td>{item.name || '-'}</td>
              <td>상태</td>
              <td>{item.dataStatus || '-'}</td>
            </tr>
            <tr>
              <td>분류</td>
              <td>{item.foodCategory || '-'}</td>
              <td>대표메뉴</td>
              <td>{item.mainFood || '-'}</td>
            </tr>
            <tr>
              <td>전화</td>
              <td>{item.phone || '-'}</td>
              <td>카카오 placeId</td>
              <td>{item.kakaoPlaceId || '-'}</td>
            </tr>
            <tr>
              <td>주소</td>
              <td colSpan={3}>{item.address || '-'}</td>
            </tr>
            <tr>
              <td>지역</td>
              <td>{regionText}</td>
              <td>regionCode</td>
              <td>{item?.region?.code || '-'}</td>
            </tr>
            <tr>
              <td>좌표</td>
              <td colSpan={3}>
                {item.latitude != null && item.longitude != null ? `${item.latitude}, ${item.longitude}` : '-'}
              </td>
            </tr>
            <tr>
              <td>설명</td>
              <td colSpan={3}>{item.description || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 기본정보 수정 폼 (토글) */}
      {isEditingBase && (
        <div style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 8px 0' }}>■ 기본 정보 수정</h3>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td>가게명</td>
                <td colSpan={3}>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="가게명"
                    style={{ width: '100%' }}
                  />
                </td>
              </tr>

              <tr>
                <td>설명</td>
                <td colSpan={3}>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    placeholder="description"
                    style={{ width: '100%', minHeight: 90, resize: 'vertical' }}
                  />
                </td>
              </tr>

              <tr>
                <td>카카오 placeId</td>
                <td>
                  <input
                    value={form.kakaoPlaceId}
                    onChange={(e) => setForm((s) => ({ ...s, kakaoPlaceId: e.target.value }))}
                    placeholder="kakaoPlaceId"
                    style={{ width: '100%' }}
                  />
                </td>
                <td>regionCode</td>
                <td>
                  <input
                    value={form.regionCode}
                    onChange={(e) => setForm((s) => ({ ...s, regionCode: e.target.value }))}
                    placeholder="regionCode"
                    style={{ width: '100%' }}
                  />
                </td>
              </tr>

              <tr>
                <td>대표메뉴</td>
                <td>
                  <input
                    value={form.mainFood}
                    onChange={(e) => setForm((s) => ({ ...s, mainFood: e.target.value }))}
                    placeholder="mainFood"
                    style={{ width: '100%' }}
                  />
                </td>
                <td>전화</td>
                <td>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="phone"
                    style={{ width: '100%' }}
                  />
                </td>
              </tr>

              <tr>
                <td>주소</td>
                <td colSpan={3}>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                    placeholder="address"
                    style={{ width: '100%' }}
                  />
                </td>
              </tr>

              <tr>
                <td>위도</td>
                <td>
                  <input
                    value={form.latitude}
                    onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))}
                    placeholder="latitude"
                    style={{ width: '100%' }}
                  />
                </td>
                <td>경도</td>
                <td>
                  <input
                    value={form.longitude}
                    onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))}
                    placeholder="longitude"
                    style={{ width: '100%' }}
                  />
                </td>
              </tr>

              <tr>
                <td>공개</td>
                <td>
                  <select
                    value={form.isPublished}
                    onChange={(e) => setForm((s) => ({ ...s, isPublished: e.target.value }))}
                    style={{ width: '100%' }}>
                    <option value="">(서버 처리)</option>
                    <option value="true">공개</option>
                    <option value="false">비공개</option>
                  </select>
                </td>
                <td>상태</td>
                <td>
                  <select
                    value={form.dataStatus}
                    onChange={(e) => setForm((s) => ({ ...s, dataStatus: e.target.value }))}
                    style={{ width: '100%' }}>
                    <option value="">(서버 처리)</option>
                    <option value="RAW">RAW</option>
                    <option value="BASIC">BASIC</option>
                    <option value="VERIFIED">VERIFIED</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function renderPhotoSection({
  photos,
  uploadType,
  setUploadType,
  uploadCaption,
  setUploadCaption,
  setUploadFiles,
  onUploadPhotos,
}) {
  return (
    <div style={{ marginTop: 22 }}>
      <h2 style={{ margin: '0 0 8px 0' }}>■ 사진</h2>

      {/* 업로드 영역 */}
      <div style={{ border: '1px solid #ddd', padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>유형</span>
          <select value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
            <option value="MAIN">{PHOTO_TYPE_LABEL.MAIN}</option>
            <option value="MENU_BOARD">{PHOTO_TYPE_LABEL.MENU_BOARD}</option>
            <option value="ETC">{PHOTO_TYPE_LABEL.ETC}</option>
          </select>

          <input
            value={uploadCaption}
            onChange={(e) => setUploadCaption(e.target.value)}
            placeholder="caption (선택)"
            style={{ minWidth: 240 }}
          />

          <input id="rest-photo-file-input" type="file" multiple onChange={(e) => setUploadFiles(e.target.files)} />

          <button type="button" onClick={onUploadPhotos}>
            업로드
          </button>
        </div>
      </div>

      {/* 현재 사진 목록 */}
      <div style={{ marginTop: 12 }}>
        <PhotoGroup title="대표사진" items={photos.main} />
        <PhotoGroup title="메뉴판" items={photos.menuBoard} />
        <PhotoGroup title="기타" items={photos.etc} />
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

/** 검증/정리는 백엔드에서 하는 전제: "들어가는 모양"만 맞춰 payload 생성 */
function buildUpdatePayload(form) {
  return {
    name: form.name,
    description: form.description,
    kakaoPlaceId: form.kakaoPlaceId,
    regionCode: form.regionCode,
    mainFood: form.mainFood,
    phone: form.phone,
    address: form.address,
    longitude: form.longitude,
    latitude: form.latitude,
    isPublished: form.isPublished, // 'true' | 'false' | ''
    dataStatus: form.dataStatus, // 'RAW' | 'BASIC' | 'VERIFIED' | ''
  };
}

function PhotoGroup({ title, items }) {
  const list = Array.isArray(items) ? items : [];

  return (
    <div style={{ marginTop: 14 }}>
      <h3 style={{ margin: '0 0 8px 0' }}>
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
              <div key={`${p.filePath}-${idx}`} style={{ width: 180 }}>
                <div style={{ border: '1px solid #333', padding: 8, textAlign: 'center' }}>
                  <img src={url} alt={fileName} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                  <div style={{ marginTop: 6, fontSize: 12 }}>{p.caption || '-'}</div>
                </div>
                <div style={{ fontSize: 12, marginTop: 6, wordBreak: 'break-all' }}>{fileName}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
