// services/inquiryService.js
import db from '../repository/db.js';
import { AppError, ERR } from '../common/error.js';
import { INQUIRY_STATUS } from '../common/constants.js';

/** @typedef {import('express').Request} Request */

const MAX_IMAGES = 3;

/** 문의 생성
 * @param {number | null} userId
 * @param {inquiry.CreatePayload} payload
 * @returns {Promise<number>}
 */
export async function createInquiry(userId, payload) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) inquiry insert
    const insertParam = {
      userId,
      type: payload.type,
      title: payload.title,
      content: payload.content,
    };
    const [result] = await conn.execute(
      `
            INSERT INTO inquiry (user_id, type, title, content)
            VALUES (:userId, :type, :title, :content)
        `,
      insertParam,
    );
    const inquiryId = Number(result.insertId);

    // 2) images insert (optional)
    const imagePaths = Array.isArray(payload?.imagePaths) ? payload.imagePaths : [];
    if (imagePaths.length) {
      if (imagePaths.length > MAX_IMAGES)
        throw new AppError(ERR.BAD_REQUEST, {
          message: '이미지는 최대 3장까지 첨부할 수 있습니다.',
          data: { keys: ['imagePaths'], extra: { count: imagePaths.length, max: MAX_IMAGES } },
        });

      const values = imagePaths.map((_, i) => `(:inquiryId, :p${i})`).join(', ');
      const params = { inquiryId };
      imagePaths.forEach((p, i) => {
        params[`p${i}`] = p;
      });

      await conn.execute(
        `
        INSERT INTO inquiry_image (inquiry_id, file_path)
        VALUES ${values}
        `,
        params,
      );
    }

    await conn.commit();
    return inquiryId;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '문의 생성 중 오류가 발생했습니다.',
      data: {
        keys: ['type', 'title', 'content', 'imagePaths'],
        dbCode: err?.code,
        extra: { userId, type: payload?.type, imageCount: payload?.imagePaths?.length ?? 0 },
      },
      cause: err,
    });
  } finally {
    conn.release?.();
  }
}

/** 문의 목록 조회
 * @param {inquiry.ListFilter} filter
 * @param {{ mode?: 'ME' | 'ADMIN' }} opt
 * @returns {Promise<inquiry.List | inquiry.AdminList>}
 */
export async function readInquiryList(filter, opt) {
  const { limit, page, q, status, type, userId } = filter;
  const { mode = 'ME' } = opt || {};
  const isAdmin = mode === 'ADMIN';

  if (!isAdmin && userId == null)
    throw new AppError(ERR.FORBIDDEN, {
      message: '본인 문의만 조회할 수 있습니다.',
      data: { keys: ['userId'], extra: { mode } },
    });

  const conn = await db.getConnection();
  try {
    const where = [];
    const params = {};

    if (userId != null) {
      where.push('i.user_id = :userId');
      params.userId = userId;
    }

    if (status != null) {
      where.push('i.status = :status');
      params.status = status;
    }

    if (type != null) {
      where.push('i.type = :type');
      params.type = type;
    }

    if (q) {
      where.push('i.title LIKE :q');
      params.q = `%${q}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 1) total
    const [countRows] = await conn.execute(
      `
      SELECT COUNT(*) AS cnt
      FROM inquiry i
      ${whereSql}
      `,
      params,
    );
    const total = Number(countRows?.[0]?.cnt || 0);

    // 2) items
    const offset = (page - 1) * limit;
    const selectAdminCols = isAdmin
      ? `,
      i.user_id      AS userId,
      u.nickname     AS userNickname,
      i.answered_by_user_id AS answeredByUserId,
      au.nickname AS answeredByUserNickname`
      : '';
    const joinAdmin = isAdmin
      ? `
      LEFT JOIN user u ON u.user_id = i.user_id
      LEFT JOIN user au ON au.user_id = i.answered_by_user_id`
      : '';

    const [rows] = await conn.execute(
      `
      SELECT
        i.inquiry_id   AS inquiryId,
        i.title,
        i.content,
        i.type,
        i.status,
        i.answer,
        i.created_at   AS createdAt,
        i.answered_at  AS answeredAt
        ${selectAdminCols}
      FROM inquiry i
      ${joinAdmin}
      ${whereSql}
      ORDER BY i.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      { ...params },
    );

    const items = Array.isArray(rows) ? rows : [];
    const ids = items.map((r) => Number(r?.inquiryId)).filter((v) => Number.isFinite(v));

    const imageMap = new Map();
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const [imgRows] = await conn.execute(
        `
        SELECT inquiry_id AS inquiryId, file_path AS filePath
        FROM inquiry_image
        WHERE inquiry_id IN (${placeholders})
        `,
        ids,
      );

      for (const r of imgRows || []) {
        const iid = Number(r?.inquiryId);
        const fp = r?.filePath == null ? '' : String(r.filePath).trim();
        if (!Number.isFinite(iid) || !fp) continue;

        if (!imageMap.has(iid)) imageMap.set(iid, []);
        imageMap.get(iid).push(fp);
      }
    }

    const withImages = items.map((it) => {
      const iid = Number(it?.inquiryId);
      const imagePaths = Number.isFinite(iid) ? imageMap.get(iid) || [] : [];
      return { ...it, imagePaths };
    });

    if (isAdmin) {
      /** @type {inquiry.AdminList} */
      return { items: withImages, page, limit, total };
    }

    /** @type {inquiry.List} */
    return { items: withImages, page, limit, total };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '문의 목록 조회 중 오류가 발생했습니다.',
      data: {
        keys: Object.keys(filter || {}),
        dbCode: err?.code,
        extra: { mode },
      },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 문의 상세 조회
 * @param {number} inquiryId
 * @param {{ mode?: 'ME' | 'ADMIN', userId?: number }} opt
 * @returns {Promise<inquiry.Item | inquiry.AdminItem>}
 */
export async function readInquiry(inquiryId, opt) {
  const { mode = 'ME', userId } = opt || {};
  const isAdmin = mode === 'ADMIN';

  if (!isAdmin && userId == null)
    throw new AppError(ERR.FORBIDDEN, {
      message: '본인 문의만 조회할 수 있습니다.',
      data: { keys: ['userId'], extra: { mode } },
    });

  const conn = await db.getConnection();
  try {
    const where = ['i.inquiry_id = :inquiryId'];
    const params = { inquiryId };

    if (!isAdmin) {
      where.push('i.user_id = :userId');
      params.userId = userId;
    }

    const selectAdminCols = isAdmin
      ? `,
      i.user_id      AS userId,
      u.nickname     AS userNickname,
      i.answered_by_user_id AS answeredByUserId,
      au.nickname AS answeredByUserNickname`
      : '';
    const joinAdmin = isAdmin
      ? `
      LEFT JOIN user u ON u.user_id = i.user_id
      LEFT JOIN user au ON au.user_id = i.answered_by_user_id`
      : '';

    const [rows] = await conn.execute(
      `
      SELECT
        i.inquiry_id   AS inquiryId,
        i.title,
        i.content,
        i.type,
        i.status,
        i.created_at   AS createdAt,
        i.answer,
        i.answered_at  AS answeredAt
        ${selectAdminCols}
      FROM inquiry i
      ${joinAdmin}
      WHERE ${where.join(' AND ')}
      LIMIT 1
      `,
      params,
    );

    const item = rows?.[0];
    if (!item)
      throw new AppError(ERR.NOT_FOUND, {
        message: '해당 문의가 존재하지 않습니다.',
        data: { targetId: inquiryId },
      });

    const [imgRows] = await conn.execute(
      `
      SELECT file_path AS filePath
      FROM inquiry_image
      WHERE inquiry_id = :inquiryId
      `,
      { inquiryId },
    );

    const imagePaths = (imgRows || [])
      .map((r) => (r?.filePath == null ? '' : String(r.filePath).trim()))
      .filter(Boolean);

    return { ...item, imagePaths };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '문의 상세 조회 중 오류가 발생했습니다.',
      data: {
        targetId: inquiryId,
        dbCode: err?.code,
        extra: { mode, userId },
      },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 문의 답변
 * @param {number} inquiryId
 * @param {inquiry.AnswerPayload} payload
 * @param {{ actorId: number }} opt
 * @returns {Promise<void>}
 */
export async function answerInquiry(inquiryId, payload, opt) {
  const { answer } = payload;
  const { actorId } = opt || {};

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `
      SELECT inquiry_id AS inquiryId, status
      FROM inquiry
      WHERE inquiry_id = :inquiryId
      LIMIT 1
      FOR UPDATE
      `,
      { inquiryId },
    );

    const item = rows?.[0];
    if (!item)
      throw new AppError(ERR.NOT_FOUND, {
        message: '해당 문의가 존재하지 않습니다.',
        data: { targetId: inquiryId },
      });

    if (item.status === INQUIRY_STATUS.ANSWERED)
      throw new AppError(ERR.CONFLICT, {
        message: '이미 답변이 등록된 문의입니다.',
        data: { targetId: inquiryId },
      });

    await conn.execute(
      `
      UPDATE inquiry
        SET status = 'ANSWERED',
          answer = :answer,
          answered_by_user_id = :actorId,
          answered_at = NOW()
      WHERE inquiry_id = :inquiryId
        AND status = 'PENDING'
      `,
      { inquiryId, answer, actorId },
    );

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '문의 답변 처리 중 오류가 발생했습니다.',
      data: {
        targetId: inquiryId,
        keys: ['answer'],
        dbCode: err?.code,
        extra: { actorId },
      },
      cause: err,
    });
  } finally {
    conn.release();
  }
}
