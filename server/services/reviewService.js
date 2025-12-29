// services/reviewService.js
import db from '../repository/db.js';
import { AppError, ERR } from '../common/error.js';
import { REVIEW_SEARCH_TARGET, REVIEW_SORT } from '../common/constants.js';

/** tags attach (type='tag'만)
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {review.Item[]} items
 * @param {number[]} reviewIds
 * @returns {Promise<void>}
 */
async function attachReviewTags(conn, items, reviewIds) {
  for (const it of items) if (!Array.isArray(it.tags)) it.tags = [];

  const placeholders = reviewIds.map((_, i) => `:r${i}`).join(', ');
  const p = {};
  reviewIds.forEach((id, i) => (p[`r${i}`] = id));

  const [rows] = await conn.execute(
    `
    SELECT
      rt.review_id AS reviewId,
      t.tag_id     AS id,
      t.code       AS code,
      t.name       AS name
    FROM review_tag rt
    JOIN tag t ON t.tag_id = rt.tag_id
    WHERE rt.review_id IN (${placeholders})
      AND t.type = 'tag'
    ORDER BY rt.review_id ASC, t.tag_id ASC
    `,
    p,
  );

  const byReviewId = new Map();
  for (const it of items) byReviewId.set(Number(it.reviewId), it);

  for (const r of rows || []) {
    const it = byReviewId.get(Number(r.reviewId));
    if (!it) continue;
    it.tags.push({
      id: Number(r.id),
      code: r.code,
      name: r.name,
    });
  }
}

/** photos attach
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {review.Item[]} items
 * @param {number[]} reviewIds
 * @returns {Promise<void>}
 */
async function attachReviewPhotos(conn, items, reviewIds) {
  for (const it of items) if (!Array.isArray(it.photos)) it.photos = [];

  const placeholders = reviewIds.map((_, i) => `:r${i}`).join(', ');
  const p = {};
  reviewIds.forEach((id, i) => (p[`r${i}`] = id));

  const [rows] = await conn.execute(
    `
    SELECT
      rp.photo_id AS id,
      rp.review_id       AS reviewId,
      rp.file_path      AS path,
      rp.caption         AS caption
    FROM review_photo rp
    WHERE rp.review_id IN (${placeholders})
    ORDER BY rp.review_id ASC, rp.photo_id ASC
    `,
    p,
  );

  const byReviewId = new Map();
  for (const it of items) byReviewId.set(Number(it.reviewId), it);

  for (const r of rows || []) {
    const it = byReviewId.get(Number(r.reviewId));
    if (!it) continue;
    it.photos.push({
      id: Number(r.id),
      path: r.path,
      caption: r.caption ?? null,
    });
  }
}

/** viewerLiked attach
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {review.Item[]} items
 * @param {number[]} reviewIds
 * @param {number|null|undefined} viewerId
 * @returns {Promise<void>}
 */
async function attachViewerLiked(conn, items, reviewIds, viewerId) {
  // viewerId 없으면 전부 false로만 초기화하고 종료
  for (const it of items) it.viewerLiked = false;
  if (viewerId == null) return;

  const placeholders = reviewIds.map((_, i) => `:r${i}`).join(', ');
  const p = { viewerId };
  reviewIds.forEach((id, i) => (p[`r${i}`] = id));

  const [rows] = await conn.execute(
    `
    SELECT rl.review_id AS reviewId
    FROM review_like rl
    WHERE rl.user_id = :viewerId
      AND rl.review_id IN (${placeholders})
    `,
    p,
  );

  const likedSet = new Set((rows || []).map((x) => Number(x.reviewId)));

  for (const it of items) {
    if (likedSet.has(Number(it.reviewId))) it.viewerLiked = true;
  }
}

/** 리뷰 작성
 * @param {number} userId
 * @param {number} restaurantId
 * @param {review.CreatePayload} payload
 * @returns {Promise<number>}
 */
export async function createReview(userId, restaurantId, payload) {
  const { content, rating, photos, tags } = payload ?? {};
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) 음식점 존재/상태 확인 + 집계 업데이트를 위한 잠금
    const [rRows] = await conn.execute(
      `
      SELECT restaurant_id AS restaurantId, is_published AS isPublished
      FROM restaurant
      WHERE restaurant_id = :restaurantId
      LIMIT 1
      FOR UPDATE
      `,
      { restaurantId },
    );

    const r = rRows?.[0];
    if (!r)
      throw new AppError(ERR.NOT_FOUND, {
        message: '해당 음식점이 존재하지 않습니다.',
        data: { restaurantId },
      });
    if (!r.isPublished)
      throw new AppError(ERR.FORBIDDEN, {
        message: '비공개 음식점에는 리뷰를 작성할 수 없습니다.',
        data: { restaurantId },
      });

    // 2) review 생성
    const [res] = await conn.execute(
      `
      INSERT INTO review (restaurant_id, user_id, rating, content)
      VALUES (:restaurantId, :userId, :rating, :content)
      `,
      { restaurantId, userId, rating, content },
    );

    const reviewId = Number(res?.insertId || 0);
    if (!reviewId)
      throw new AppError(ERR.DB, {
        message: '리뷰 생성에 실패했습니다.',
        data: { restaurantId, userId },
      });

    // 3) restaurant 집계(증분)
    await conn.execute(
      `
      UPDATE restaurant
      SET
        rating_sum = rating_sum + :rating,
        review_count = review_count + 1
      WHERE restaurant_id = :restaurantId
      `,
      { restaurantId, rating },
    );

    // 4) 태그 연결 (tags: tagCode[])
    if (tags?.length) {
      const placeholders = tags.map((_, i) => `:c${i}`).join(', ');
      const codeParams = {};
      tags.forEach((c, i) => (codeParams[`c${i}`] = c));

      const [tagRows] = await conn.execute(
        `
        SELECT tag_id AS tagId
        FROM tag
        WHERE code IN (${placeholders})
          AND type = 'tag'
        `,
        codeParams,
      );

      const tagIds = (tagRows || []).map((x) => Number(x.tagId)).filter(Boolean);
      for (const tagId of tagIds) {
        await conn.execute(
          `
          INSERT IGNORE INTO review_tag (review_id, tag_id)
          VALUES (:reviewId, :tagId)
          `,
          { reviewId, tagId },
        );
      }
    }

    // 5) 사진 저장 (photos)
    if (photos?.length) {
      for (const p of photos) {
        await conn.execute(
          `
          INSERT INTO review_photo (review_id, file_path, caption)
          VALUES (:reviewId, :photoPath, :caption)
          `,
          { reviewId, photoPath: p.filepath, caption: p.caption ?? null },
        );
      }
    }

    await conn.commit();
    return reviewId;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '리뷰 작성 중 오류가 발생했습니다.',
      data: { userId, restaurantId, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 리뷰 목록 조회
 * @param {review.ListFilter} filter
 * @param {{
 *   mode?: 'PUBLIC'|'ME'|'ADMIN',
 *   viewerId?: number | null,
 *   include?: { detail?: boolean, viewerLiked?: boolean }
 * }} [opt]
 * @returns {Promise<{review.List}>}
 */
export async function readReviewList(filter, opt) {
  const { mode = 'PUBLIC', viewerId, include } = opt || {};
  const {
    page,
    limit,
    restaurantId,
    userId,
    isVisible,
    q,
    sort,
    searchTarget = REVIEW_SEARCH_TARGET.CONTENT,
  } = filter ?? {};

  const conn = await db.getConnection();
  try {
    const params = {};
    const where = [];
    const join = ['JOIN user u ON u.user_id = r.user_id'];

    if (restaurantId != null) {
      where.push('r.restaurant_id = :restaurantId');
      params.restaurantId = restaurantId;
    }
    if (userId != null) {
      where.push('r.user_id = :userId');
      params.userId = userId;
    }

    if (mode !== 'ADMIN') {
      where.push('r.is_visible = 1');
    } else if (isVisible != null) {
      where.push('r.is_visible = :isVisible');
      params.isVisible = isVisible ? 1 : 0;
    }

    if (q) {
      const like = `%${q}%`;
      if (searchTarget === REVIEW_SEARCH_TARGET.CONTENT) {
        where.push('r.content LIKE :qContent');
        params.qContent = like;
      } else if (searchTarget === REVIEW_SEARCH_TARGET.RESTAURANT) {
        join.push('JOIN restaurant res ON res.restaurant_id = r.restaurant_id');
        where.push('res.name LIKE :qResName');
        params.qResName = like;
      } else if (searchTarget === REVIEW_SEARCH_TARGET.USER) {
        where.push('u.nickname LIKE :qUser');
        params.qUser = like;
      }
    }

    const joinSql = join.length ? join.join('\n') : '';
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 1) total
    const [countRows] = await conn.execute(
      `
      SELECT COUNT(*) AS cnt
      FROM review r
      ${joinSql}
      ${whereSql}
      `,
      params,
    );
    const total = Number(countRows?.[0]?.cnt || 0);

    // 2) items (base)
    const offset = (page - 1) * limit;
    const ORDER_BY = {
      [REVIEW_SORT.RECENT]: 'ORDER BY r.created_at DESC',
      [REVIEW_SORT.LIKE]: 'ORDER BY likeCount DESC, r.created_at DESC',
      [REVIEW_SORT.RATING]: 'ORDER BY r.rating DESC, r.created_at DESC',
    };
    const orderBySql = ORDER_BY[sort] ?? ORDER_BY[REVIEW_SORT.RECENT];

    const [rows] = await conn.execute(
      `
      SELECT
        r.review_id       AS reviewId,
        r.restaurant_id   AS restaurantId,
        r.user_id         AS userId,
        u.nickname        AS userNickname,

        r.rating          AS rating,
        r.content         AS content,
        (r.is_visible = 1) AS isVisible,

        r.created_at      AS createdAt,
        r.updated_at      AS updatedAt,

        (
          SELECT COUNT(*)
          FROM review_like rl
          WHERE rl.review_id = r.review_id
        ) AS likeCount
      FROM review r
      ${joinSql}
      ${whereSql}
      ${orderBySql}
      LIMIT ${limit} OFFSET ${offset}
      `,
      params,
    );

    const items = (rows || []).map((r) => ({
      ...r,
      isVisible: Boolean(r.isVisible),
      rating: Number(r.rating),
    }));
    if (!items.length) return { total, page, limit, items };

    const reviewIds = items.map((it) => it.reviewId);

    // 3) detail attach (tags/photos)
    if (!!include?.detail) {
      await attachReviewTags(conn, items, reviewIds);
      await attachReviewPhotos(conn, items, reviewIds);
    }

    // 4) viewerLiked attach
    if (!!include?.viewerLiked) {
      await attachViewerLiked(conn, items, reviewIds, viewerId);
    }

    return { total, page, limit, items };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '리뷰 목록 조회 중 오류가 발생했습니다.',
      data: { extra: { filter, opt }, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** ~
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function updateReview(userId) {
  const conn = await db.getConnection();
  try {
  } catch (err) {
  } finally {
    conn.release();
  }
}

/** ~
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function deleteReview(userId) {
  const conn = await db.getConnection();
  try {
  } catch (err) {
  } finally {
    conn.release();
  }
}

/** ~
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function hideReview(userId) {
  const conn = await db.getConnection();
  try {
  } catch (err) {
  } finally {
    conn.release();
  }
}
