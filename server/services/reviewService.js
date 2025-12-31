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
      [REVIEW_SORT.POPULAR]: 'ORDER BY likeCount DESC, r.created_at DESC',
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

/** 리뷰 수정
 * @param {number} reviewId
 * @param {number} userId
 * @param {review.UpdatePayload} payload
 * @returns {Promise<void>}
 */
export async function updateReview(reviewId, userId, payload) {
  const { rating, content, tags, photosPatch, photosUpload } = payload ?? {};
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1) 리뷰 존재/본인 여부 확인 + 락
    const [rows] = await conn.execute(
      `
      SELECT
        r.review_id     AS reviewId,
        r.restaurant_id AS restaurantId,
        r.user_id       AS userId,
        r.rating        AS rating,
        r.is_visible    AS isVisible
      FROM review r
      WHERE r.review_id = :reviewId
      LIMIT 1
      FOR UPDATE
      `,
      { reviewId },
    );

    const cur = rows?.[0];
    if (!cur)
      throw new AppError(ERR.NOT_FOUND, {
        message: '해당 리뷰가 존재하지 않습니다.',
        data: { targetId: reviewId },
      });

    if (Number(cur.userId) !== Number(userId))
      throw new AppError(ERR.FORBIDDEN, {
        message: '본인 리뷰만 수정할 수 있습니다.',
        data: { targetId: reviewId, extra: { userId } },
      });

    const restaurantId = Number(cur.restaurantId);
    const wasVisible = Number(cur.isVisible) === 1;
    const oldRating = Number(cur.rating) || 1;

    // 2) 같은 photoId를 삭제(patch.delete)와 업로드 교체(upload.id)
    const deleteIds = new Set(
      (Array.isArray(photosPatch) ? photosPatch : [])
        .filter((p) => p?.delete === true && Number(p?.id) > 0)
        .map((p) => Number(p.id)),
    );
    for (const u of Array.isArray(photosUpload) ? photosUpload : []) {
      const pid = u?.id;
      if (pid == null) continue;
      const n = Number(pid);
      if (n > 0 && deleteIds.has(n))
        throw new AppError(ERR.BAD_REQUEST, {
          message: '삭제와 업로드 교체가 동시에 요청된 사진이 있습니다.',
          data: { keys: ['photosPatch', 'photosUpload'], extra: { photoId: n } },
        });
    }

    // 3) review 업데이트(부분 업데이트)
    const sets = [];
    const p = { reviewId };

    if (rating != null) {
      sets.push('rating = :rating');
      p.rating = rating;
    }
    if (content != null) {
      sets.push('content = :content');
      p.content = content;
    }

    if (sets.length) {
      await conn.execute(
        `
        UPDATE review
        SET ${sets.join(', ')}
        WHERE review_id = :reviewId
        `,
        p,
      );
    }

    // 4) restaurant 집계 delta 업데이트 (visible 리뷰만)
    if (wasVisible && rating != null) {
      const newRating = Number(rating) || 0;
      const delta = newRating - oldRating;

      if (delta !== 0) {
        await conn.execute(
          `
          UPDATE restaurant
          SET rating_sum = rating_sum + :delta
          WHERE restaurant_id = :restaurantId
          `,
          { restaurantId, delta },
        );
      }
    }

    // 5) tags 교체
    if (tags != null) {
      await conn.execute(`DELETE FROM review_tag WHERE review_id = :reviewId`, { reviewId });

      if (Array.isArray(tags) && tags.length) {
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
    }

    // 6) photosPatch 적용 (삭제 / 캡션 변경)
    if (photosPatch != null) {
      const arr = Array.isArray(photosPatch) ? photosPatch : [];

      for (const patch of arr) {
        const photoId = Number(patch?.id || 0);
        if (!photoId) continue;

        if (patch.delete === true) {
          const [res] = await conn.execute(
            `
            DELETE FROM review_photo
            WHERE photo_id = :photoId AND review_id = :reviewId
            `,
            { photoId, reviewId },
          );

          // 존재하지 않는 photo_id를 삭제 요청한 경우
          if (Number(res?.affectedRows || 0) === 0)
            throw new AppError(ERR.NOT_FOUND, {
              message: '삭제할 사진이 존재하지 않습니다.',
              data: { targetId: photoId, extra: { reviewId } },
            });

          continue;
        }

        // caption 키가 "전달된 경우"에만 업데이트 (undefined=변경 없음)
        if (Object.prototype.hasOwnProperty.call(patch, 'caption')) {
          const [res] = await conn.execute(
            `
            UPDATE review_photo
            SET caption = :caption
            WHERE photo_id = :photoId AND review_id = :reviewId
            `,
            { photoId, reviewId, caption: patch.caption ?? null },
          );

          if (Number(res?.affectedRows || 0) === 0)
            throw new AppError(ERR.NOT_FOUND, {
              message: '수정할 사진이 존재하지 않습니다.',
              data: { targetId: photoId, extra: { reviewId } },
            });
        }
      }
    }

    // 7) photosUpload 적용 (신규 추가 / 기존 교체)
    if (photosUpload != null) {
      const arr = Array.isArray(photosUpload) ? photosUpload : [];

      for (const u of arr) {
        const filepath = u?.filepath;
        if (!filepath) continue;
        const caption = u.caption ?? null;

        // 신규 추가
        if (u.id == null) {
          await conn.execute(
            `
            INSERT INTO review_photo (review_id, file_path, caption)
            VALUES (:reviewId, :filePath, :caption)
            `,
            { reviewId, filePath: filepath, caption },
          );
          continue;
        }

        // 기존 교체
        const photoId = Number(u.id || 0);
        if (!photoId) {
          await conn.execute(
            `
            INSERT INTO review_photo (review_id, file_path, caption)
            VALUES (:reviewId, :filePath, :caption)
            `,
            { reviewId, filePath: filepath, caption },
          );
          continue;
        }

        const [res] = await conn.execute(
          `
          UPDATE review_photo
          SET file_path = :filePath,
              caption   = :caption
          WHERE photo_id = :photoId AND review_id = :reviewId
          `,
          { photoId, reviewId, filePath: filepath, caption },
        );

        if (Number(res?.affectedRows || 0) === 0)
          throw new AppError(ERR.NOT_FOUND, {
            message: '교체할 사진이 존재하지 않습니다.',
            data: { targetId: photoId, extra: { reviewId } },
          });
      }
    }

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}

    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '리뷰 수정 중 오류가 발생했습니다.',
      data: { targetId: reviewId, extra: { userId, payload }, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 리뷰 삭제
 * @param {number} reviewId
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function deleteReview(reviewId, userId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) 리뷰 존재 + 본인 여부 확인 (락)
    const [rows] = await conn.execute(
      `
      SELECT
        r.review_id      AS reviewId,
        r.restaurant_id  AS restaurantId,
        r.user_id        AS userId,
        r.rating         AS rating,
        r.is_visible     AS isVisible
      FROM review r
      WHERE r.review_id = :reviewId
      LIMIT 1
      FOR UPDATE
      `,
      { reviewId },
    );

    const it = rows?.[0];
    if (!it)
      throw new AppError(ERR.NOT_FOUND, {
        message: '해당 리뷰가 존재하지 않습니다.',
        data: { targetId: reviewId },
      });

    if (Number(it.userId) !== Number(userId))
      throw new AppError(ERR.FORBIDDEN, {
        message: '본인 리뷰만 삭제할 수 있습니다.',
        data: { targetId: reviewId, extra: { userId } },
      });

    const restaurantId = Number(it.restaurantId);
    const rating = Number(it.rating) || 0;
    const wasVisible = Number(it.isVisible) === 1;

    await conn.execute(`DELETE FROM review WHERE review_id = :reviewId`, { reviewId });

    // restaurant 집계(visible였던 리뷰만)
    if (wasVisible) {
      await conn.execute(
        `
        UPDATE restaurant
        SET
          rating_sum  = rating_sum - :rating,
          review_count = review_count - 1
        WHERE restaurant_id = :restaurantId
        `,
        { restaurantId, rating },
      );
    }

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}

    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '리뷰 삭제 중 오류가 발생했습니다.',
      data: { targetId: reviewId, extra: { userId }, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 리뷰 숨김
 * @param {number} reviewId
 * @param {{ actorId?: number | null }} [opt]
 * @returns {Promise<void>}
 */
export async function hideReview(reviewId, opt) {
  const { actorId = null } = opt || {};
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) 리뷰 조회 + 락
    const [rows] = await conn.execute(
      `
      SELECT
        r.review_id     AS reviewId,
        r.restaurant_id AS restaurantId,
        r.rating        AS rating,
        r.is_visible    AS isVisible
      FROM review r
      WHERE r.review_id = :reviewId
      LIMIT 1
      FOR UPDATE
      `,
      { reviewId },
    );

    const it = rows?.[0];
    if (!it)
      throw new AppError(ERR.NOT_FOUND, {
        message: '해당 리뷰가 존재하지 않습니다.',
        data: { targetId: reviewId, extra: { actorId } },
      });

    const restaurantId = Number(it.restaurantId);
    const rating = Number(it.rating) || 0;
    const wasVisible = Number(it.isVisible) === 1;

    // 이미 숨김이면 그대로 종료 (집계도 건드리지 않음)
    if (!wasVisible) {
      await conn.commit();
      return;
    }

    // 2) review 숨김 처리 (is_visible=0)
    const [uRes] = await conn.execute(
      `
      UPDATE review
      SET is_visible = 0
      WHERE review_id = :reviewId
        AND is_visible = 1
      `,
      { reviewId },
    );

    if (!uRes?.affectedRows)
      throw new AppError(ERR.DB, {
        message: '리뷰 숨김 처리에 실패했습니다.',
        data: { targetId: reviewId, extra: { actorId } },
      });

    // 3) restaurant 집계(증분 감소)
    await conn.execute(
      `
      UPDATE restaurant
      SET
        rating_sum = rating_sum - :rating,
        review_count = review_count - 1
      WHERE restaurant_id = :restaurantId
      `,
      { restaurantId, rating },
    );

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}

    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '리뷰 숨김 처리 중 오류가 발생했습니다.',
      data: { targetId: reviewId, extra: { actorId }, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 리뷰 보이기
 * @param {number} reviewId
 * @param {{ actorId?: number | null }} [opt]
 * @returns {Promise<void>}
 */
export async function showReview(reviewId, opt) {
  const { actorId = null } = opt || {};
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) 리뷰 조회 + 락
    const [rows] = await conn.execute(
      `
      SELECT
        r.review_id     AS reviewId,
        r.restaurant_id AS restaurantId,
        r.rating        AS rating,
        r.is_visible    AS isVisible
      FROM review r
      WHERE r.review_id = :reviewId
      LIMIT 1
      FOR UPDATE
      `,
      { reviewId },
    );

    const it = rows?.[0];
    if (!it)
      throw new AppError(ERR.NOT_FOUND, {
        message: '해당 리뷰가 존재하지 않습니다.',
        data: { targetId: reviewId, extra: { actorId } },
      });

    const restaurantId = Number(it.restaurantId);
    const rating = Number(it.rating) || 0;
    const wasVisible = Number(it.isVisible) === 1;

    // 이미 보이기면 그대로 종료 (집계도 건드리지 않음)
    if (wasVisible) {
      await conn.commit();
      return;
    }

    // 2) review 보이기 처리 (is_visible=1)
    const [uRes] = await conn.execute(
      `
      UPDATE review
      SET is_visible = 1
      WHERE review_id = :reviewId
        AND is_visible = 0
      `,
      { reviewId },
    );

    if (!uRes?.affectedRows)
      throw new AppError(ERR.DB, {
        message: '리뷰 보이기 처리에 실패했습니다.',
        data: { targetId: reviewId, extra: { actorId } },
      });

    // 3) restaurant 집계(증분 증가)
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

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}

    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '리뷰 보이기 처리 중 오류가 발생했습니다.',
      data: { targetId: reviewId, extra: { actorId }, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 리뷰 좋아요
 * @param {number} reviewId
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function likeReview(reviewId, userId) {
  if (userId == null) throw new AppError(ERR.UNAUTHORIZED, { message: '로그인이 필요합니다.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) 리뷰 존재/노출 확인 (숨김 리뷰는 노출 방지 차원에서 NOT_FOUND)
    const [rows] = await conn.execute(
      `
      SELECT r.review_id AS reviewId, r.is_visible AS isVisible
      FROM review r
      WHERE r.review_id = ?
      LIMIT 1
      `,
      [reviewId],
    );

    const it = rows?.[0];
    if (!it || Number(it.isVisible) !== 1)
      throw new AppError(ERR.NOT_FOUND, {
        message: '해당 리뷰를 찾을 수 없습니다.',
        data: { targetId: reviewId },
      });

    // 2) 좋아요
    await conn.execute(
      `
      INSERT IGNORE INTO review_like (user_id, review_id)
      VALUES (?, ?)
      `,
      [userId, reviewId],
    );

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    if (err instanceof AppError) throw err;

    throw new AppError(ERR.DB, {
      message: '리뷰 좋아요 처리 중 오류가 발생했습니다.',
      data: { keys: ['reviewId', 'userId'], targetId: reviewId, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 리뷰 좋아요 취소
 * @param {number} reviewId
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function unlikeReview(reviewId, userId) {
  if (userId == null) throw new AppError(ERR.UNAUTHORIZED, { message: '로그인이 필요합니다.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 존재 확인: 삭제된 리뷰면 404
    const [rows] = await conn.execute(
      `
      SELECT r.review_id AS reviewId
      FROM review r
      WHERE r.review_id = ?
      LIMIT 1
      `,
      [reviewId],
    );

    if (!rows?.[0])
      throw new AppError(ERR.NOT_FOUND, {
        message: '해당 리뷰를 찾을 수 없습니다.',
        data: { targetId: reviewId },
      });

    await conn.execute(
      `
      DELETE FROM review_like
      WHERE user_id = ?
        AND review_id = ?
      `,
      [userId, reviewId],
    );

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    if (err instanceof AppError) throw err;

    throw new AppError(ERR.DB, {
      message: '리뷰 좋아요 취소 처리 중 오류가 발생했습니다.',
      data: { keys: ['reviewId', 'userId'], targetId: reviewId, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}
