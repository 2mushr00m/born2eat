// controllers/requests/reviewRequest.js
import { requireString, parseNumber, parseId, parseBoolean } from '../../common/check.js';
import { REVIEW_SEARCH_TARGET, REVIEW_SORT } from '../../common/constants.js';
import { toFilePath } from '../../middleware/upload.js';

/** @typedef {import('express').Request} Request */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

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

/** 목록 조회 filter (page/limit/sort)
 * @param {Request} req
 * @returns {review.ListFilter} */
function buildListFilter(req) {
  const query = req?.query || {};

  const page =
    parseNumber(query.page, 'page', {
      integer: true,
      positive: true,
      nullable: true,
      autoFix: true,
    }) ?? DEFAULT_PAGE;

  const limit =
    parseNumber(query.limit, 'limit', {
      integer: true,
      positive: true,
      nullable: true,
      autoFix: true,
      max: MAX_LIMIT,
    }) ?? DEFAULT_LIMIT;

  /** @type {review.ListFilter} */
  const filter = { page, limit, sort: REVIEW_SORT.RECENT };

  return filter;
}

/** 공개 목록 조회 filter
 * @param {Request} req
 * @returns {review.ListFilter} */
export function buildPublicListFilter(req) {
  const filter = buildListFilter(req);

  filter.sort = REVIEW_SORT.POPULAR;
  if (query.sort != null) {
    const s = String(query.sort).trim();
    if (Object.values(REVIEW_SORT).includes(s)) filter.sort = s;
  }

  const restaurantId = parseId(req.params?.restaurantId);
  filter.restaurantId = restaurantId;
  filter.isVisible = true;
  return filter;
}

/** 사용자 목록 조회 filter
 * @param {Request} req
 * @returns {review.ListFilter} */
export function buildMyListFilter(req) {
  const filter = buildListFilter(req);
  filter.userId = req.user?.userId ?? null;
  return filter;
}

/** 관리자 목록 조회 filter
 * @param {Request} req
 * @returns {review.ListFilter} */
export function buildAdminListFilter(req) {
  const filter = buildListFilter(req);
  const query = req?.query || {};

  if (query.sort != null) {
    const s = String(query.sort).trim();
    if (Object.values(REVIEW_SORT).includes(s)) filter.sort = s;
  }

  if (query.restaurantId != null) {
    const v = parseNumber(query.restaurantId, 'restaurantId', {
      integer: true,
      positive: true,
      nullable: true,
      autoFix: true,
    });
    if (v != null) filter.restaurantId = v;
  }

  if (query.userId != null) {
    const v = parseNumber(query.userId, 'userId', {
      integer: true,
      positive: true,
      nullable: true,
      autoFix: true,
    });
    if (v != null) filter.userId = v;
  }

  if (query.isVisible != null) {
    const v = parseBoolean(query.isVisible, 'isVisible', { nullable: true });
    if (v != null) filter.isVisible = v;
  }

  const q = query.q == null ? '' : String(query.q).trim();
  if (q) {
    filter.q = q;

    const st = query.searchTarget == null ? '' : String(query.searchTarget).trim();
    if (st && Object.values(REVIEW_SEARCH_TARGET).includes(st)) filter.searchTarget = st;
    else filter.searchTarget = REVIEW_SEARCH_TARGET.CONTENT;
  }

  return filter;
}

/** 생성 payload
 * @param {Request} req
 * @returns {review.CreatePayload} */
export function buildCreatePayload(req) {
  const body = req?.body ?? {};

  const rating = parseNumber(body.rating, '별점', {
    positive: true,
    nullable: false,
    autoFix: true,
    min: 1,
    max: 5,
  });

  /** @type {review.CreatePayload} */
  const payload = {
    rating,
    content: requireString(body.content, '리뷰 내용').trim(),
  };

  const tags = parseTags(body.tags);
  if (tags) payload.tags = tags;

  const files = Array.isArray(req.files) ? req.files : [];
  if (files.length) {
    const captions = body.captions == null ? [] : [].concat(body.captions);
    const photos = [];

    for (let i = 0; i < files.length; i++) {
      const filepath = toFilePath(files[i]);
      if (!filepath) continue;

      const cap = captions[i] != null ? String(captions[i]).trim() : '';
      photos.push({ filepath, caption: cap || undefined });
    }
    if (photos.length) payload.photos = photos;
  }

  return payload;
}

/** 수정 payload
 * @param {Request} req
 * @returns {review.UpdatePayload} */
export function buildUpdatePayload(req) {
  const body = req?.body ?? {};

  /** @type {review.UpdatePayload} */
  const payload = {};

  // 1) rating
  if (body.rating != null) {
    const rating = parseNumber(body.rating, '별점', {
      positive: true,
      autoFix: true,
      min: 1,
      max: 5,
    });
    if (rating != null) payload.rating = rating;
  }

  // 2) content
  if (body.content != null) {
    const content = requireString(body.content, '리뷰 내용');
    if (content) payload.content = content;
  }

  // 3) tags (들어오면 교체 취급)
  if (body.tags != null) {
    payload.tags = parseTags(body.tags) ?? [];
  }

  const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
  const parseMaybeJson = (v) => {
    if (v == null) return undefined;
    if (typeof v !== 'string') return v;
    const s = v.trim();
    if (!s) return undefined;
    try {
      return JSON.parse(s);
    } catch {
      return v; // JSON이 아니면 원문 유지
      // 에러 던져버릴까. photosPatch가 Json 양식 아니라고.
    }
  };

  // 4) photosPatch: 기존 사진 수정/삭제 (json)
  if (body.photosPatch != null) {
    const raw = parseMaybeJson(body.photosPatch);
    const arr = asArray(raw);

    const patches = [];
    for (const p of arr) {
      if (!p) continue;

      const id = parseNumber(p.id, '수정 사진 PK', {
        integer: true,
        positive: true,
        nullable: true,
        autoFix: true,
      });
      if (id == null) continue;

      const del = p.delete === true;

      // caption: undefined(미전달)=변경 없음 / null=캡션 제거 / string=설정
      let caption = undefined;
      if (Object.prototype.hasOwnProperty.call(p, 'caption')) {
        if (p.caption === null) caption = null;
        else if (p.caption == null) caption = undefined;
        else {
          const s = String(p.caption).trim();
          caption = s === '' ? '' : s; // 빈문자 허용 여부는 서비스에서 결정 가능
        }
      }

      /** @type {{ id: number, delete?: true, caption?: (string|null) }} */
      const item = { id };
      if (del) item.delete = true;
      if (!del && Object.prototype.hasOwnProperty.call(p, 'caption')) item.caption = caption;

      patches.push(item);
    }
    if (patches.length) payload.photosPatch = patches;
    else payload.photosPatch = [];
  }

  // 5) photosUpload: 새 파일 업로드 (multipart files)
  // body.ids / body.captions 를 req.files(photos)와 "인덱스 매칭"
  const files = Array.isArray(req.files) ? req.files : [];
  if (files.length) {
    const idsRaw = body.ids;
    const captionsRaw = body.captions;

    const ids = asArray(parseMaybeJson(idsRaw));
    const captions = asArray(parseMaybeJson(captionsRaw));

    const uploads = [];
    for (let i = 0; i < files.length; i++) {
      const filepath = toFilePath(files[i]);
      if (!filepath) continue;

      // id: number | null | undefined
      let id = undefined;
      if (ids[i] === null) id = null;
      else if (ids[i] != null) {
        const v = parseNumber(ids[i], '교체 사진 PK', {
          integer: true,
          positive: true,
          nullable: true,
          autoFix: true,
        });
        if (v != null) id = v;
        else if (ids[i] === '' || String(ids[i]).trim() === '') id = null;
      }

      const item = { filepath };
      if (id !== undefined) item.id = id;

      if (i < captions.length && Object.prototype.hasOwnProperty.call(captions, i)) {
        const raw = captions[i];

        if (raw === null) {
          item.caption = null;
        } else if (raw == null) {
          // undefined: 키 없음(변경 없음) → 아무 것도 안 넣음
        } else {
          item.caption = String(raw);
        }
      }
      uploads.push(item);
    }

    if (uploads.length) payload.photosUpload = uploads;
  }

  return payload;
}
