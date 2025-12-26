// services/restaurantService.js
import db from '../repository/db.js';
import logger from '../common/logger.js';
import { AppError, ERR } from '../common/error.js';
import { BROADCAST_OTT, RESTAURANT_PHOTO_SOURCE, RESTAURANT_PHOTO_TYPE } from '../common/constants.js';

/** 평균평점 기반 정렬 (리뷰수 적을 때의 왜곡 완화)
 * - score = (v/(v+m))*R + (m/(v+m))*C  (Bayesian average)
 * - v: review_count, R: avg, C: 전역 평균(일단 상수), m: 최소 신뢰 리뷰수(상수)
 */
const RATING_PRIOR_C = 3.5; // 평균
const RATING_PRIOR_M = 3; // 최소 신뢰 리뷰수(상수)

/** 내부 헬퍼: foodTagCode → path prefix
 * @param {string} foodCode
 * @returns {Promise<string|null>}
 */
async function resolveFoodPath(foodCode) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(
      `
      SELECT path FROM tag
      WHERE type = 'food' AND code = :code
      LIMIT 1
      `,
      { code: foodCode },
    );
    if (!rows?.length) {
      logger.debug({
        code: 'FOOD_FILTER',
        message: 'food 태그를 찾지 못해 food 필터를 무시합니다.',
        data: { keys: ['foodCode'], extra: { foodCode } },
      });
      return null;
    }

    return `${rows[0].path}%`;
  } catch (err) {
    logger.warn({
      code: 'FOOD_FILTER',
      message: 'food 태그 경로 조회 중 예외 발생, food 필터를 무시합니다.',
      data: { keys: ['foodCode'], dbCode: err?.code, extra: { foodCode } },
      cause: err,
    });
    return null;
  } finally {
    conn.release();
  }
}

/** 내부 헬퍼: regionCode -> region prefix
 * @param {string} regionCode
 * @returns {Promise<string|null>}
 */
async function resolveRegionPrefix(regionCode) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(
      `
      SELECT depth FROM region
      WHERE region_code=:code
      LIMIT 1
      `,
      { code: regionCode },
    );

    if (!rows?.length) {
      logger.debug({
        code: 'REGION_FILTER',
        message: 'regionCode를 찾지 못해 region 필터를 무시합니다.',
        data: { keys: ['regionCode'], extra: { regionCode } },
      });
      return null;
    }

    const depth = Number(rows[0].depth);
    const len = depth === 1 ? 2 : depth === 2 ? 5 : depth === 3 ? 8 : 10;

    return `${String(regionCode).slice(0, len)}%`;
  } catch (err) {
    logger.warn({
      code: 'REGION_FILTER',
      message: 'region depth 조회 중 예외 발생, region 필터를 무시합니다.',
      data: { keys: ['regionCode'], dbCode: err?.code, extra: { regionCode } },
      cause: err,
    });
    return null;
  } finally {
    conn.release();
  }
}

/** 내부 헬퍼: foodTagCode → tagId
 * @param {string|null} foodCode
 * @returns {Promise<number|null>}
 */
async function resolveFoodTagId(foodCode) {
  if (!foodCode) return null;
  const conn = await db.getConnection();

  try {
    const [rows] = await conn.execute(
      `
      SELECT tag_id AS tagId FROM tag
      WHERE type = 'food' AND code = :code
      LIMIT 1
      `,
      { code: foodCode },
    );

    return rows?.[0]?.tagId != null ? Number(rows[0].tagId) : null;
  } catch (err) {
    throw new AppError(ERR.DB, {
      message: 'food 태그 ID 조회 중 오류가 발생했습니다.',
      data: { keys: ['foodTagCode'], dbCode: err?.code, extra: { foodTagCode: foodCode } },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 음식점 목록 조회
 * @param {restaurant.ListFilter} filter
 * @param {{ mode?: 'PUBLIC' | 'ADMIN' }} [opt]
 * @returns {Promise<restaurant.List>}
 */
export async function readRestaurantList(filter, opt = {}) {
  const { food, tags, region, q, page, limit } = filter;
  const { mode = 'PUBLIC' } = opt;
  const isAdmin = mode === 'ADMIN';
  const offset = (page - 1) * limit;

  const foodPathPrefix = food ? await resolveFoodPath(food) : null;
  const regionPrefix = region ? await resolveRegionPrefix(region) : null;

  const conn = await db.getConnection();
  try {
    const params = {};
    const where = ['1=1'];
    const join = [];
    const having = [];

    if (!isAdmin) where.push('r.is_published = 1');

    join.push(`LEFT JOIN tag tf ON tf.tag_id = r.food_tag_id`);
    join.push(`LEFT JOIN region rg2 ON rg2.region_code = r.region_code`);
    join.push(`LEFT JOIN region rg1 ON rg1.region_code = rg2.parent_code`);
    join.push(`
      LEFT JOIN (
        SELECT restaurant_id, COUNT(*) AS like_count
        FROM restaurant_like
        GROUP BY restaurant_id
      ) rl ON rl.restaurant_id = r.restaurant_id
    `);

    if (foodPathPrefix) {
      where.push(`tf.type = 'food' AND tf.path LIKE :foodPathPrefix`);
      params.foodPathPrefix = foodPathPrefix;
    }

    if (regionPrefix) {
      where.push(`r.region_code LIKE :regionPrefix`);
      params.regionPrefix = regionPrefix;
    }

    if (q) {
      // 이름, 주소, 대표메뉴, 분류
      where.push(`
        (r.name LIKE :q
        OR r.address LIKE :q
        OR r.main_food LIKE :q
        OR tf.name LIKE :q)`);
      params.q = `%${q}%`;
    }

    const useTagFilter = Array.isArray(tags) && tags.length > 0;
    if (useTagFilter) {
      const inList = tags.map((_, i) => `:tag_${i}`).join(', ');
      tags.forEach((code, i) => (params[`tag_${i}`] = code));

      join.push(`JOIN restaurant_tag rt_f ON rt_f.restaurant_id = r.restaurant_id`);
      join.push(`
        JOIN tag t_f ON t_f.tag_id = rt_f.tag_id
        AND t_f.type = 'tag'
        AND t_f.code IN (${inList})
      `);

      having.push(`COUNT(DISTINCT t_f.code) = :tagCount`);
      params.tagCount = tags.length;
    }

    // 1) total
    const [countRows] = await conn.execute(
      `
      SELECT COUNT(DISTINCT r.restaurant_id) AS total
      FROM restaurant r
      ${join.join('\n')}
      WHERE ${where.join(' AND ')}
      ${useTagFilter ? 'GROUP BY r.restaurant_id' : ''}
      ${having.length ? `HAVING ${having.join(' AND ')}` : ''}
    `,
      params,
    );

    const total = countRows?.length ? countRows.length : 0;
    if (total === 0) return { items: [], page, limit, total: 0 };

    // 2) items
    const [rows] = await conn.execute(
      `
      SELECT
        r.restaurant_id AS restaurantId,
        r.name,
        r.kakao_place_id AS kakaoPlaceId,
        r.main_food AS mainFood,
        r.address,
        r.longitude,
        r.latitude,
        r.rating_sum AS ratingSum,
        r.review_count AS reviewCount,
        COALESCE(rl.like_count, 0) AS likeCount,
        tf.name AS foodCategory,
        r.region_code AS regionCode,
        COALESCE(rg1.name, rg2.name) AS regionDepth1,
        CASE WHEN rg1.name IS NOT NULL THEN rg2.name ELSE NULL END AS regionDepth2,
        CASE
          WHEN r.review_count <= 0 THEN 0
          ELSE
          (r.review_count / (r.review_count + ${RATING_PRIOR_M})) * (r.rating_sum / r.review_count)
          + (${RATING_PRIOR_M} / (r.review_count + ${RATING_PRIOR_M})) * ${RATING_PRIOR_C}
        END AS score
      FROM restaurant r
      ${join.join('\n')}
      WHERE ${where.join(' AND ')}
      ${useTagFilter ? 'GROUP BY r.restaurant_id' : ''}
      ${having.length ? `HAVING ${having.join(' AND ')}` : ''}
      ORDER BY
        score DESC,
        reviewCount DESC,
        likeCount DESC,
        restaurantId DESC
      LIMIT :limit OFFSET :offset
      `,
      { ...params, limit, offset },
    );

    /** @type {restaurant.Item[]} */
    const items = rows.map((row) => ({
      restaurantId: row.restaurantId,
      name: row.name,
      kakaoPlaceId: row.kakaoPlaceId ?? null,

      foodCategory: row.foodCategory ?? null,
      mainFood: row.mainFood ?? null,
      mainPhoto: null, // 2에서 진행
      address: row.address ?? null,

      longitude: row.longitude != null ? Number(row.longitude) : null,
      latitude: row.latitude != null ? Number(row.latitude) : null,

      ratingSum: row.ratingSum != null ? Number(row.ratingSum) : 0,
      reviewCount: row.reviewCount != null ? Number(row.reviewCount) : 0,
      likeCount: row.likeCount != null ? Number(row.likeCount) : 0,

      tags: [], // 3에서 진행
      region: {
        code: row.regionCode ?? null,
        depth1: row.regionDepth1 ?? null,
        depth2: row.regionDepth2 ?? null,
      },
    }));

    // 3) 대표사진
    const ids = items.map((it) => it.restaurantId);
    const idPlaceholders = ids.map((_, i) => `:id_${i}`).join(', ');
    const idParams = ids.reduce((acc, id, i) => ((acc[`id_${i}`] = id), acc), {});

    const [photoRows] = await conn.execute(
      `
      SELECT restaurant_id AS restaurantId, file_path AS filePath
      FROM (
        SELECT
        restaurant_id,
        file_path,
        ROW_NUMBER() OVER (
          PARTITION BY restaurant_id
          ORDER BY sort_order ASC, created_at DESC
        ) rn
        FROM restaurant_photo
        WHERE photo_type='MAIN'
        AND restaurant_id IN (${idPlaceholders})
      ) x
      WHERE rn = 1
      `,
      idParams,
    );

    const mainPhotoById = new Map(photoRows.map((r) => [r.restaurantId, r.filePath]));
    for (const it of items) it.mainPhoto = mainPhotoById.get(it.restaurantId) ?? null;

    // 4) tags
    const [tagRows] = await conn.execute(
      `
      SELECT rt.restaurant_id AS restaurantId, t.name
        FROM restaurant_tag rt
        JOIN tag t ON t.tag_id = rt.tag_id
      WHERE rt.restaurant_id IN (${idPlaceholders})
        AND t.type='tag'
      `,
      idParams,
    );

    const tagsById = new Map();
    for (const r of tagRows) {
      const arr = tagsById.get(r.restaurantId) ?? [];
      arr.push(r.name);
      tagsById.set(r.restaurantId, arr);
    }
    for (const it of items) it.tags = tagsById.get(it.restaurantId) ?? [];

    return { items, page, limit, total };
  } catch (err) {
    throw new AppError(ERR.DB, {
      message: '음식점 목록 조회 중 오류가 발생했습니다.',
      data: { keys: ['filter', 'mode'], dbCode: err?.code, extra: { mode } },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 음식점 상세 조회
 * @param {number} restaurantId
 * @param {{ mode?: 'PUBLIC' | 'ADMIN' }} [opt]
 * @returns {Promise<restaurant.Detail>}
 */
export async function readRestaurant(restaurantId, opt = {}) {
  const { mode = 'PUBLIC' } = opt;
  const isAdmin = mode === 'ADMIN';
  const conn = await db.getConnection();

  try {
    // 1) 기본
    const [rows] = await conn.execute(
      `
      SELECT
        r.restaurant_id AS restaurantId,
        r.name,
        r.kakao_place_id AS kakaoPlaceId,
        r.main_food AS mainFood,
        r.phone,
        r.address,
        r.longitude,
        r.latitude,
        r.rating_sum AS ratingSum,
        r.review_count AS reviewCount,
        r.is_published AS isPublishedInt,
        r.region_code AS regionCode,
        tf.name AS foodCategory,
        COALESCE(rl.like_count, 0) AS likeCount,
        COALESCE(rg1.name, rg2.name) AS regionDepth1,
        CASE WHEN rg1.name IS NOT NULL THEN rg2.name ELSE NULL END AS regionDepth2
      FROM restaurant r
      LEFT JOIN tag tf ON tf.tag_id = r.food_tag_id
      LEFT JOIN region rg2 ON rg2.region_code = r.region_code
      LEFT JOIN region rg1 ON rg1.region_code = rg2.parent_code
      LEFT JOIN (
        SELECT restaurant_id, COUNT(*) AS like_count
        FROM restaurant_like
        GROUP BY restaurant_id
      ) rl ON rl.restaurant_id = r.restaurant_id
      WHERE r.restaurant_id = :restaurantId
      LIMIT 1
      `,
      { restaurantId },
    );

    const row = rows?.[0];
    if (!row || (!isAdmin && row.isPublishedInt !== 1))
      throw new AppError(ERR.NOT_FOUND, { message: '해당 음식점을 찾을 수 없습니다.' });

    /** @type {restaurant.Detail} */
    const detail = {
      restaurantId: row.restaurantId,
      name: row.name,
      kakaoPlaceId: row.kakaoPlaceId ?? null,

      foodCategory: row.foodCategory ?? null,
      mainFood: row.mainFood ?? null,
      phone: row.phone ?? null,
      address: row.address ?? null,

      longitude: row.longitude != null ? Number(row.longitude) : null,
      latitude: row.latitude != null ? Number(row.latitude) : null,

      ratingSum: row.ratingSum != null ? Number(row.ratingSum) : 0,
      reviewCount: row.reviewCount != null ? Number(row.reviewCount) : 0,
      likeCount: row.likeCount != null ? Number(row.likeCount) : 0,

      region: {
        code: row.regionCode ?? null,
        depth1: row.regionDepth1 ?? null,
        depth2: row.regionDepth2 ?? null,
      },

      tags: [], // 2에서 채움
      photos: { main: [], menuBoard: [], etc: [] }, // 3에서 채움
      broadcasts: [], // 4에서 채움
    };

    // 2) 태그 목록
    const [tagRows] = await conn.execute(
      `
      SELECT t.name
      FROM restaurant_tag rt
      JOIN tag t ON t.tag_id = rt.tag_id
      WHERE rt.restaurant_id = :restaurantId
        AND t.type = 'tag'
      ORDER BY t.click_count DESC, t.usage_count DESC
      `,
      { restaurantId },
    );
    detail.tags = (tagRows ?? []).map((r) => r.name);

    // 3) 사진 그룹
    const [photoRows] = await conn.execute(
      `
      SELECT
        p.photo_type AS photoType,
        p.file_path AS filePath,
        p.caption,
        p.created_at AS createdAt,
        p.source_type AS sourceType,
        u.nickname AS sourceUserNickname
      FROM restaurant_photo p
      LEFT JOIN user u ON u.user_id = p.source_user_id
      WHERE p.restaurant_id = :restaurantId
      ORDER BY
        p.photo_type ASC,
        p.sort_order ASC,
        p.created_at DESC
      `,
      { restaurantId },
    );

    for (const p of photoRows ?? []) {
      const photo = {
        filePath: p.filePath,
        caption: p.caption ?? null,
        createdAt: p.createdAt,
        sourceType: p.sourceType,
        sourceUserNickname: p.sourceType === RESTAURANT_PHOTO_SOURCE.USER ? (p.sourceUserNickname ?? null) : null,
      };

      if (p.photoType === RESTAURANT_PHOTO_TYPE.MAIN) detail.photos.main.push(photo);
      else if (p.photoType === RESTAURANT_PHOTO_TYPE.MENU_BOARD) detail.photos.menuBoard.push(photo);
      else detail.photos.etc.push(photo);
    }

    // 4) 방송 정보 + ott/youtube
    const [brRows] = await conn.execute(
      `
      SELECT
        br.broadcast_id AS broadcastId,
        b.name AS broadcastName,
        br.episode_no AS episodeNo,
        be.aired_at AS airedAt
      FROM broadcast_restaurant br
      JOIN broadcast b ON b.broadcast_id = br.broadcast_id
      LEFT JOIN broadcast_episode be
        ON be.broadcast_id = br.broadcast_id
      AND be.episode_no = br.episode_no
      WHERE br.restaurant_id = :restaurantId
      ORDER BY be.aired_at DESC, br.episode_no DESC
      `,
      { restaurantId },
    );

    if (brRows?.length) {
      const broadcastIds = Array.from(new Set(brRows.map((r) => r.broadcastId)));
      const bidParams = broadcastIds.reduce((acc, bid, i) => ((acc[`bid_${i}`] = bid), acc), {});
      const bidIn = broadcastIds.map((_, i) => `:bid_${i}`).join(', ');

      // 4-1) OTT: broadcastId 기준으로 모으기
      const [ottRows] = await conn.execute(
        `
        SELECT broadcast_id AS broadcastId, platform, ott_url AS ottUrl
        FROM broadcast_ott
        WHERE broadcast_id IN (${bidIn})
        `,
        bidParams,
      );

      const ottByBid = new Map();
      for (const bid of broadcastIds) ottByBid.set(bid, { NETFLIX: null, TVING: null, WAVVE: null, etc: null });

      for (const o of ottRows ?? []) {
        const ott = ottByBid.get(o.broadcastId);
        if (!ott) continue;

        if (o.platform === BROADCAST_OTT.NETFLIX) ott.NETFLIX = o.ottUrl;
        else if (o.platform === BROADCAST_OTT.TVING) ott.TVING = o.ottUrl;
        else if (o.platform === BROADCAST_OTT.WAVVE) ott.WAVVE = o.ottUrl;
        else ott.etc = o.ottUrl;
      }

      // 4-2) YouTube: (broadcastId, episodeNo) 기준으로 모으기
      const [ytRows] = await conn.execute(
        `
        SELECT broadcast_id AS broadcastId, episode_no AS episodeNo, youtube_url AS youtubeUrl
        FROM broadcast_youtube
        WHERE broadcast_id IN (${bidIn})
        `,
        bidParams,
      );

      const ytByKey = new Map(); // key = `${broadcastId}:${episodeNo}` -> string[]
      for (const y of ytRows ?? []) {
        const key = `${y.broadcastId}:${y.episodeNo}`;
        const arr = ytByKey.get(key) ?? [];
        arr.push(y.youtubeUrl);
        ytByKey.set(key, arr);
      }

      // 4-3) Broadcast[]로 매핑
      detail.broadcasts = brRows.map((br) => ({
        name: br.broadcastName ?? null,
        episodeNo: br.episodeNo ?? null,
        airedAt: br.airedAt ?? null,
        ott: ottByBid.get(br.broadcastId) ?? { NETFLIX: null, TVING: null, WAVVE: null, etc: null },
        youtube: ytByKey.get(`${br.broadcastId}:${br.episodeNo}`) ?? [],
      }));
    }

    return detail;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '음식점 상세 조회 중 오류가 발생했습니다.',
      data: { targetId: restaurantId, keys: ['restaurantId', 'mode'], dbCode: err?.code, extra: { mode } },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 음식점 생성
 * @param {restaurant.CreatePayload} payload
 * @returns {Promise<number>}
 */
export async function createRestaurant(payload) {
  const conn = await db.getConnection();
  try {
    const foodTagId = await resolveFoodTagId(payload.foodTagCode);
    const params = {
      ...payload,
      foodTagId,
      isPublished: payload.isPublished ? 1 : 0,
    };

    const [result] = await conn.execute(
      `
      INSERT INTO restaurant (
        name, kakao_place_id, region_code, food_tag_id,
        main_food, phone, address, longitude, latitude,
        is_published, data_status
      )
      VALUES (
        :name, :kakaoPlaceId, :regionCode, :foodTagId,
        :mainFood, :phone, :address, :longitude, :latitude,
        :isPublished, :dataStatus
      )
      `,
      params,
    );

    return Number(result.insertId);
  } catch (err) {
    throw new AppError(ERR.DB, {
      message: '음식점 생성 중 오류가 발생했습니다.',
      data: { keys: ['payload'], dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 음식점 수정
 * @param {number} restaurantId
 * @param {restaurant.UpdatePayload} payload
 * @returns {Promise<void>}
 */
export async function updateRestaurant(restaurantId, payload) {
  const set = [];
  const patch = { ...payload, restaurantId };

  if ('name' in payload) set.push('name = :name');
  if ('kakaoPlaceId' in payload) set.push('kakao_place_id = :kakaoPlaceId');
  if ('regionCode' in payload) set.push('region_code = :regionCode');
  if ('foodTagCode' in payload) {
    patch.foodTagId = await resolveFoodTagId(payload.foodTagCode);
    set.push('food_tag_id = :foodTagId');
  }
  if ('mainFood' in payload) set.push('main_food = :mainFood');
  if ('phone' in payload) set.push('phone = :phone');
  if ('address' in payload) set.push('address = :address');
  if ('longitude' in payload) set.push('longitude = :longitude');
  if ('latitude' in payload) set.push('latitude = :latitude');
  if ('isPublished' in payload) {
    patch.isPublished = payload.isPublished ? 1 : 0;
    set.push('is_published = :isPublished');
  }
  if ('dataStatus' in payload) set.push('data_status = :dataStatus');
  if (!set.length) return;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `
      UPDATE restaurant
        SET ${set.join(', ')}
      WHERE restaurant_id = :restaurantId
      `,
      patch,
    );

    if (!result.affectedRows)
      throw new AppError(ERR.NOT_FOUND, {
        message: '음식점이 존재하지 않습니다.',
        data: { targetId: restaurantId },
      });

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    if (err instanceof AppError) throw err;

    throw new AppError(ERR.DB, {
      message: '음식점 수정 중 오류가 발생했습니다.',
      data: { targetId: restaurantId, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 음식점 삭제
 * @param {number} restaurantId
 * @returns {Promise<void>}
 */
export async function deleteRestaurant(restaurantId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(`DELETE FROM restaurant WHERE restaurant_id = :restaurantId`, { restaurantId });

    if (result.affectedRows === 0)
      throw new AppError(ERR.NOT_FOUND, {
        data: { targetId: restaurantId },
      });

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    if (err instanceof AppError) throw err;

    throw new AppError(ERR.DB, {
      message: '음식점 삭제 중 오류가 발생했습니다.',
      data: { targetId: restaurantId, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}
