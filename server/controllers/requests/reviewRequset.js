// controllers/requests/reviewRequest.js
import { requireString, parseNumber, parseBoolean } from '../../common/check.js';

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

/** 목록 조회 filter
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
  const filter = { page, limit };
  return filter;
}

/** 공개 목록 조회 filter
 * @param {Request} req
 * @returns {review.ListFilter} */
export function buildPublicListFilter(req) {
  const filter = buildListFilter(req);
  const restaurantId = parseId(req.params?.id);
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
    if (v != null) filter.userId = v;
  }

  const q = query.q == null ? '' : String(query.q).trim();
  if (q) filter.q = q;

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

  // req.files 기준으로 filepath 생성 + captions 메타 매칭
  // 프론트 권장:
  // - files: File[] (fieldname=photos)
  // - body.captions: string[] (fieldname=captions)  // photos와 같은 순서
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

  if (body.rating != null) {
    const rating = parseNumber(body.rating, '별점', {
      positive: true,
      nullable: true,
      autoFix: true,
      min: 1,
      max: 5,
    });
    if (rating != null) payload.rating = rating;
  }

  if (body.content != null) {
    const content = String(body.content).trim();
    if (content) payload.content = content;
  }

  if (body.tags != null) {
    payload.tags = parseTags(body.tags) ?? [];
  }

  // 기존의 수정 및 삭제는 number과 caption을 포함한 json
  if (body.photos != null) {
    const arr = Array.isArray(body.photos) ? body.photos : [body.photos];
    const photos = [];
    for (const p of arr) {
      if (!p) continue;
      const id = parseNumber(p.id, 'photos.id', {
        integer: true,
        positive: true,
        nullable: true,
        autoFix: true,
      });
      if (id == null) continue;

      const path = p.path === null ? null : p.path == null ? null : String(p.path).trim();
      const caption = p.caption === null ? null : p.caption == null ? null : String(p.caption).trim();

      photos.push({
        id,
        path: path === '' ? null : path,
        caption: caption === '' ? null : caption,
      });
    }
    payload.photos = photos;
  }

  return payload;
}
