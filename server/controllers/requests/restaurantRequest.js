// controllers/requests/restaurantRequest.js
import { requireString, parseNumber, parseBoolean, parseId } from '../../common/check.js';
import {
  RESTAURANT_DATA_STATUS,
  RESTAURANT_SORT,
  RESTAURANT_PHOTO_SOURCE,
  RESTAURANT_PHOTO_TYPE,
} from '../../common/constants.js';
import { AppError, ERR } from '../../common/error.js';
import { toFilePath } from '../../middleware/upload.js';

/** @typedef {import('express').Request} Request */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const MY_LIKES_DEFAULT_PAGE = 1;
const MY_LIKES_DEFAULT_LIMIT = 5;
const MY_LIKES_MAX_LIMIT = 50;

/** 내부 헬퍼: tags → tagList */
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
 * @param {{ mode?: 'PUBLIC' | 'ADMIN' }} [opt]
 * @returns {restaurant.ListFilter}
 */
function buildListFilter(req, opt) {
  const query = req.query || {};
  const mode = opt?.mode ?? 'PUBLIC';

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

  /** @type {restaurant.ListFilter} */
  const filter = { page, limit, sort: RESTAURANT_SORT.RECENT };

  if (query.sort != null) {
    const s = String(query.sort).trim();
    if (Object.values(RESTAURANT_SORT).includes(s)) filter.sort = s;
  }

  if (mode === 'ADMIN') {
    const s = query.sort == null ? '' : String(query.sort).trim();
    if (s && Object.values(RESTAURANT_SORT).includes(s)) filter.sort = s;
    else if (RESTAURANT_SORT.RECENT) filter.sort = RESTAURANT_SORT.RECENT;
  } else {
    filter.sort = RESTAURANT_SORT.RECOMMEND;
  }

  for (const k of ['food', 'region', 'q']) {
    const s = query?.[k] == null ? '' : String(query[k]).trim();
    if (s) filter[k] = s;
  }

  const tags = parseTags(query.tags);
  if (tags) filter.tags = tags;

  // admin 전용 필터
  if (mode === 'ADMIN') {
    if (query.isPublished != null) {
      const v = parseBoolean(query.isPublished, 'isPublished', { nullable: true });
      if (v != null) filter.isPublished = v;
    }

    if (query.dataStatus != null) {
      const s = String(query.dataStatus).trim();
      if (Object.values(RESTAURANT_DATA_STATUS).includes(s)) filter.dataStatus = s;
    }
  }

  return filter;
}

/** 공개 목록 조회 filter
 * @param {Request} req
 * @returns {restaurant.ListFilter} */
export function buildPublicListFilter(req) {
  return buildListFilter(req, { mode: 'PUBLIC' });
}

/** 관리자 목록 조회 filter
 * @param {Request} req
 * @returns {restaurant.ListFilter} */
export function buildAdminListFilter(req) {
  return buildListFilter(req, { mode: 'ADMIN' });
}

/** 내가 좋아요한 목록 조회 filter
 * @param {Request} req
 * @returns {{limit: number, page: number}}
 */
export function buildMyLikesFilter(req) {
  const query = req?.query ?? {};

  const page =
    parseNumber(query.page, 'page', {
      integer: true,
      positive: true,
      nullable: true,
      autoFix: true,
    }) ?? MY_LIKES_DEFAULT_PAGE;

  const limit =
    parseNumber(query.limit, 'limit', {
      integer: true,
      positive: true,
      nullable: true,
      autoFix: true,
      max: MY_LIKES_MAX_LIMIT,
    }) ?? MY_LIKES_DEFAULT_LIMIT;

  return { page, limit };
}

/** 생성 payload
 * @param {Request} req
 * @returns {restaurant.CreatePayload} */
export function buildCreatePayload(req) {
  const body = req?.body ?? {};

  /** @type {restaurant.CreatePayload} */
  const payload = {
    name: requireString(body.name, '가게명').trim(),
  };

  for (const k of ['kakaoPlaceId', 'description', 'regionCode', 'foodTagCode', 'mainFood', 'phone', 'address']) {
    const s = body?.[k] == null ? '' : String(body[k]).trim();
    if (s) payload[k] = s;
  }

  const longitude = parseNumber(body.longitude, 'longitude', { nullable: true });
  if (longitude != null) payload.longitude = longitude;

  const latitude = parseNumber(body.latitude, 'latitude', { nullable: true });
  if (latitude != null) payload.latitude = latitude;

  const isPublished = parseBoolean(body.isPublished, 'isPublished', { nullable: true });
  if (isPublished != null) payload.isPublished = isPublished;

  if (body.dataStatus != null) {
    const s = String(body.dataStatus).trim();
    if (Object.values(RESTAURANT_DATA_STATUS).includes(s)) payload.dataStatus = s;
  }

  return payload;
}

/** 수정 payload
 * @param {Request} req
 * @returns {restaurant.UpdatePayload} */
export function buildUpdatePayload(req) {
  const body = req?.body ?? {};

  /** @type {restaurant.UpdatePayload} */
  const payload = {};

  if ('name' in body) payload.name = requireString(body.name, '가게명').trim();

  for (const k of ['kakaoPlaceId', 'description', 'regionCode', 'foodTagCode', 'mainFood', 'phone', 'address']) {
    if (k in body) {
      const v = body[k];
      payload[k] = v == null ? null : String(v).trim();
    }
  }

  for (const k of ['longitude', 'latitude']) if (k in body) payload[k] = parseNumber(body[k], k, { nullable: true });

  if ('isPublished' in body) {
    const v = parseBoolean(body.isPublished, 'isPublished', { nullable: true });
    if (v !== null) payload.isPublished = v;
  }

  if ('dataStatus' in body && body.dataStatus != null) {
    const s = String(body.dataStatus).trim();
    if (Object.values(RESTAURANT_DATA_STATUS).includes(s)) payload.dataStatus = s;
  }

  return payload;
}

/** 사진 생성 payload
 * @param {Request} req
 * @returns {restaurant.CreatePhotosPayload} */
export function buildCreatePhotosPayload(req) {
  const body = req?.body ?? {};
  const files = Array.isArray(req.files) ? req.files : [];

  // 0) 파일 필수
  if (files.length === 0) {
    throw new AppError(ERR.VALIDATION, {
      message: '업로드할 사진이 없습니다.',
      data: { keys: ['photos'] },
    });
  }

  // 1) meta JSON 파싱 (필수)
  const metaRaw = body.meta == null ? '' : String(body.meta).trim();
  if (!metaRaw) {
    throw new AppError(ERR.VALIDATION, {
      message: 'meta가 필요합니다.',
      data: { keys: ['meta'] },
    });
  }

  let metaArr = null;
  try {
    metaArr = JSON.parse(metaRaw);
  } catch (e) {
    throw new AppError(ERR.VALIDATION, {
      message: 'meta(JSON) 파싱에 실패했습니다.',
      data: { keys: ['meta'] },
    });
  }

  if (!Array.isArray(metaArr)) {
    throw new AppError(ERR.VALIDATION, {
      message: 'meta는 JSON 배열 문자열이어야 합니다.',
      data: { keys: ['meta'] },
    });
  }

  // 2) 인덱스 매칭 검증
  if (metaArr.length !== files.length) {
    throw new AppError(ERR.VALIDATION, {
      message: 'meta 길이와 photos 파일 개수가 일치해야 합니다.',
      data: { keys: ['meta', 'photos'], extra: { metaLen: metaArr.length, filesLen: files.length } },
    });
  }

  // 3) 공통 sourceType/sourceUserId (요청값 기반: 이전 합의 유지)
  const rawSourceType = body.sourceType == null ? '' : String(body.sourceType).trim();
  const sourceType = Object.values(RESTAURANT_PHOTO_SOURCE).includes(rawSourceType)
    ? rawSourceType
    : RESTAURANT_PHOTO_SOURCE.USER;

  const sourceUserId = parseNumber(body.sourceUserId, 'sourceUserId', {
    integer: true,
    nullable: true,
    autoFix: true,
    min: 1,
  });

  // 4) files + meta → photos
  const photos = [];

  for (let i = 0; i < files.length; i += 1) {
    const f = files[i];
    const m = metaArr[i] ?? {};

    const filePath = toFilePath(f);
    if (!filePath) {
      throw new AppError(ERR.VALIDATION, {
        message: '업로드 파일 처리에 실패했습니다.',
        data: { keys: ['photos'], extra: { index: i } },
      });
    }

    const rawPhotoType = m?.photoType == null ? '' : String(m.photoType).trim();
    const photoType = Object.values(RESTAURANT_PHOTO_TYPE).includes(rawPhotoType)
      ? rawPhotoType
      : RESTAURANT_PHOTO_TYPE.ETC;

    const sortOrder = parseNumber(m.sortOrder, 'sortOrder', {
      integer: true,
      nullable: true,
      autoFix: true,
      min: 0,
      max: 127,
    });

    const captionRaw = m?.caption == null ? '' : String(m.caption).trim();
    const caption = captionRaw ? captionRaw : null;

    photos.push({
      photoType,
      sortOrder,
      filePath,
      caption,
    });
  }

  return {
    sourceType,
    sourceUserId: sourceType === RESTAURANT_PHOTO_SOURCE.USER ? sourceUserId : (sourceUserId ?? null),
    photos,
  };
}
