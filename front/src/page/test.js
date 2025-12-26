// src/page/testPayload.jsx
import React, { useMemo, useState } from 'react';

// ---------- utils ----------
function fileMeta(f) {
  if (!f) return null;
  return { name: f.name, size: f.size, type: f.type, lastModified: f.lastModified };
}

function normalizeStringArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function parseTags(raw) {
  if (raw == null) return undefined;
  const arr = Array.isArray(raw) ? raw : [raw];
  const tags = [
    ...new Set(
      arr
        .flatMap((v) => String(v).split(','))
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  return tags.length ? tags : undefined;
}

// ---------- Create: JSON preview ----------
export function ReviewCreatePayloadForm() {
  const [restaurantId, setRestaurantId] = useState('1');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('생성 테스트 내용');
  const [tags, setTags] = useState('clean,spicy');

  // photos: [{ file: File, caption: string }]
  const [photos, setPhotos] = useState([]);
  const [payload, setPayload] = useState(null);

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setPhotos((prev) => [...prev, ...files.map((f) => ({ file: f, caption: '' }))]);
  }

  function buildJson() {
    const tagArr = parseTags(tags);

    // multer로 갈 때의 의미(인덱스 매칭):
    // files = photos[].file  (fieldname=photos)
    // captions = photos[].caption (fieldname=captions)
    const json = {
      endpoint: 'POST /reviews',
      query: { restaurantId: Number(restaurantId) || restaurantId },
      body: {
        rating: Number(rating),
        content: String(content ?? ''),
        tags: tagArr ?? [],
        captions: photos.map((p) => p.caption ?? ''),
      },
      files: {
        photos: photos.map((p) => fileMeta(p.file)),
      },
      note: 'files.photos[i] ↔ body.captions[i] 순서 매칭',
    };

    setPayload(json);
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <h2>Create Payload JSON</h2>

      <label>
        restaurantId
        <input value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} />
      </label>

      <label>
        rating
        <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} />
      </label>

      <label>
        content
        <textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
      </label>

      <label>
        tags (comma)
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="clean,spicy" />
      </label>

      <div style={{ border: '1px solid #444', padding: 12, display: 'grid', gap: 8 }}>
        <div>photos (multiple)</div>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {photos.map((p, idx) => (
          <div key={idx} style={{ border: '1px solid #333', padding: 10, display: 'grid', gap: 6 }}>
            <div>{p.file?.name}</div>
            <input
              value={p.caption}
              onChange={(e) => {
                setPhotos((prev) => prev.map((x, i) => (i === idx ? { ...x, caption: e.target.value } : x)));
              }}
              placeholder="caption (same order as file)"
            />
            <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}>
              remove
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={buildJson}>
        JSON 생성(전송 미리보기)
      </button>

      <pre style={{ textAlign: 'left' }}>{payload ? JSON.stringify(payload, null, 2) : ''}</pre>
    </div>
  );
}

// ---------- Update: JSON preview ----------
export function ReviewUpdatePayloadForm() {
  const [reviewId, setReviewId] = useState('1');
  const [rating, setRating] = useState(''); // 빈값이면 미전송(부분 수정)
  const [content, setContent] = useState('수정 테스트 내용');
  const [tags, setTags] = useState(''); // update 정책: 보내면 전체교체, 빈값이면 전체삭제 의도

  // existing photos from server: [{ id, path, caption }]
  // 여기서는 데모용 초기값
  const [existingPhotos, setExistingPhotos] = useState([
    { id: 101, path: '/uploads/a.jpg', caption: 'old A', deleted: false },
    { id: 102, path: '/uploads/b.jpg', caption: 'old B', deleted: false },
  ]);

  // upload ops for add/replace:
  // [{ targetId: number|null, file: File, caption: string }]
  const [uploadOps, setUploadOps] = useState([]);

  const [payload, setPayload] = useState(null);

  function queueReplace(targetId, file) {
    setUploadOps((prev) => [...prev, { targetId, file, caption: '' }]);
  }
  function queueAdd(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploadOps((prev) => [...prev, ...files.map((f) => ({ targetId: null, file: f, caption: '' }))]);
  }

  function buildExistingPhotoPatches() {
    // 서버로 보내는 body.photos(기존 사진 패치) 구성:
    // - 삭제: { id, path: null, caption: null }
    // - 캡션 수정/삭제: { id, caption: "..." } or { id, caption: null }
    const patches = [];

    for (const p of existingPhotos) {
      if (p.deleted) {
        patches.push({ id: p.id, path: null, caption: null });
        continue;
      }

      const cap = String(p.caption ?? '').trim();
      patches.push({ id: p.id, caption: cap === '' ? null : cap });
    }

    return patches;
  }

  function buildJson() {
    // update tags 정책 반영:
    // - body.tags를 보내면 전체 교체
    // - 빈값이면 전체 삭제 의도
    let tagsPayload;
    if (tags != null) {
      const parsed = parseTags(tags);
      tagsPayload = parsed ?? []; // 빈/공백이면 []
    }

    const body = {
      // 부분수정 지원: 값이 있으면 포함
      ...(rating !== '' ? { rating: Number(rating) } : {}),
      ...(content != null ? { content: String(content) } : {}),
      ...(tags != null ? { tags: tagsPayload } : {}),
      // 기존 사진 패치(실전에서는 JSON 문자열로 FormData에 넣고 서버에서 JSON.parse)
      photos: buildExistingPhotoPatches(),
      // 업로드 파일과 1:1 매칭되는 메타 배열들 (multer multipart에서)
      photoIds: uploadOps.map((op) => (op.targetId == null ? '' : String(op.targetId))),
      captions: uploadOps.map((op) => op.caption ?? ''),
    };

    const json = {
      endpoint: 'PATCH /reviews/:id',
      pathParams: { id: Number(reviewId) || reviewId },
      body,
      files: {
        photos: uploadOps.map((op) => fileMeta(op.file)),
      },
      note: [
        '기존 사진 수정/삭제는 body.photos(패치)로 반영',
        '업로드는 files.photos[i] ↔ body.photoIds[i] ↔ body.captions[i] 인덱스 매칭',
        'photoIds[i]가 있으면 교체(replace), 빈값이면 신규 추가(add)',
      ],
    };

    setPayload(json);
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <h2>Update Payload JSON</h2>

      <label>
        reviewId
        <input value={reviewId} onChange={(e) => setReviewId(e.target.value)} />
      </label>

      <label>
        rating (빈값이면 미전송)
        <input value={rating} onChange={(e) => setRating(e.target.value)} placeholder="e.g. 4" />
      </label>

      <label>
        content
        <textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
      </label>

      <label>
        tags (empty => clear all, null/undefined => do not touch)
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="clean,spicy or empty" />
      </label>

      <div style={{ border: '1px solid #444', padding: 12, display: 'grid', gap: 8 }}>
        <div>Existing Photos (server provided)</div>

        {existingPhotos.map((p) => (
          <div key={p.id} style={{ border: '1px solid #333', padding: 10, display: 'grid', gap: 6 }}>
            <div>
              photoId: <b>{p.id}</b> {p.deleted ? '(deleted)' : ''}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{p.path}</div>

            <label>
              caption (empty => delete caption)
              <input
                value={p.caption}
                disabled={p.deleted}
                onChange={(e) => {
                  const v = e.target.value;
                  setExistingPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, caption: v } : x)));
                }}
              />
            </label>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() =>
                  setExistingPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, deleted: !x.deleted } : x)))
                }>
                {p.deleted ? 'undo delete' : 'delete'}
              </button>

              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                replace image
                <input
                  type="file"
                  accept="image/*"
                  disabled={p.deleted}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    queueReplace(p.id, file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid #444', padding: 12, display: 'grid', gap: 8 }}>
        <div>Upload Queue (Add/Replace)</div>

        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          add new photos
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              queueAdd(e.target.files);
              e.target.value = '';
            }}
          />
        </label>

        {uploadOps.map((op, idx) => (
          <div key={idx} style={{ border: '1px solid #333', padding: 10, display: 'grid', gap: 6 }}>
            <div>
              {op.targetId == null ? 'ADD' : `REPLACE photoId=${op.targetId}`} — {op.file?.name}
            </div>
            <input
              value={op.caption}
              onChange={(e) => {
                const v = e.target.value;
                setUploadOps((prev) => prev.map((x, i) => (i === idx ? { ...x, caption: v } : x)));
              }}
              placeholder="caption for this upload"
            />
            <button type="button" onClick={() => setUploadOps((prev) => prev.filter((_, i) => i !== idx))}>
              remove from queue
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={buildJson}>
        JSON 생성(전송 미리보기)
      </button>

      <pre style={{ textAlign: 'left' }}>{payload ? JSON.stringify(payload, null, 2) : ''}</pre>
    </div>
  );
}
