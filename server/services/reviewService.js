// services/reviewService.js
import db from '../repository/db.js';
import { AppError, ERR } from '../common/error.js';

/** ~
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function readReviewList(userId) {
  const conn = await db.getConnection();
  try {
  } catch (err) {
  } finally {
    conn.release();
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
