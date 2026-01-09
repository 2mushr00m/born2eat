// services/userService.js
import bcrypt from 'bcrypt';
import db from '../repository/db.js';
import { AppError, ERR } from '../common/error.js';
import { USER_STATUS } from '../common/constants.js';

/** 내부 헬퍼: 회원정보 조회 (Item)
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {number} userId
 * @returns {Promise<user.Item>}
 */
async function selectUser(conn, userId) {
  const [rows] = await conn.execute(
    `
    SELECT
      user_id AS userId,
      email,
      nickname,
      profile_url AS profileUrl,
      role,
      status,
      suspended_until AS suspendedUntil
    FROM user
    WHERE user_id = :userId
    AND status <> 'DELETED'
    LIMIT 1
    `,
    { userId },
  );

  const user = rows?.[0];
  if (!user) {
    throw new AppError(ERR.NOT_FOUND, {
      message: '해당 계정이 존재하지 않습니다.',
      data: { targetId: userId },
    });
  }
  return user;
}

/** 회원정보 조회
 * @param {number} userId
 * @param {{ mode?: 'ME' | 'ADMIN' }} [opt]
 * @returns {Promise<user.Item>}
 */
export async function readUser(userId, opt) {
  const { mode = 'ME' } = opt || {};
  const conn = await db.getConnection();
  try {
    return await selectUser(conn, userId);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '회원정보 조회 중 오류가 발생했습니다.',
      data: { targetId: userId, extra: { mode } },
      cause: err,
    });
  } finally {
    conn.release?.();
  }
}

/** 회원정보 수정
 * @param {number} userId
 * @param {Partial<user.UpdatePayload>} payload
 * @param {{ mode?: 'ME' | 'ADMIN' }} [opt]
 * @returns {Promise<user.Item>}
 */
export async function updateUser(userId, payload, opt) {
  const { mode = 'ME' } = opt || {};
  const isAdmin = mode === 'ADMIN';

  const ALLOW = isAdmin
    ? {
        email: true,
        nickname: true,
        phone: true,
        profileUrl: true,
        status: true,
        suspendedUntil: true,
      }
    : { nickname: true, phone: true, profileUrl: true };

  for (const k of Object.keys(payload || {}))
    if (!ALLOW[k])
      throw new AppError(ERR.FORBIDDEN, {
        message: '수정할 수 없는 항목이 포함되어 있습니다.',
        data: { targetId: userId, keys: [k], extra: { mode } },
      });

  const set = [];
  const patch = { ...payload, userId };

  if ('email' in payload) set.push('email = :email');
  if ('nickname' in payload) set.push('nickname = :nickname');
  if ('phone' in payload) set.push('phone = :phone');
  if ('profileUrl' in payload) set.push('profile_url = :profileUrl');
  if (isAdmin && 'status' in payload) {
    set.push('status = :status');
    if (patch.status === USER_STATUS.ACTIVE && !('suspendedUntil' in payload)) {
      patch.suspendedUntil = null;
      set.push('suspended_until = :suspendedUntil');
    }
  }
  if (isAdmin && 'suspendedUntil' in payload) {
    set.push('suspended_until = :suspendedUntil');
    if (patch.suspendedUntil != null && !('status' in payload)) {
      patch.status = USER_STATUS.SUSPENDED;
      set.push('status = :status');
    }
  }

  const conn = await db.getConnection();
  try {
    if (set.length)
      await conn.execute(
        `
        UPDATE user
          SET ${set.join(', ')}
        WHERE user_id = :userId
        AND status <> 'DELETED'
        `,
        patch,
      );

    return await selectUser(conn, userId);
  } catch (err) {
    if (e?.code === 'ER_DUP_ENTRY') {
      if ('nickname' in patch)
        throw new AppError(ERR.CONFLICT, {
          message: '이미 사용 중인 닉네임입니다.',
          data: { keys: ['nickname'], dbCode: err?.code },
        });
      if ('email' in patch)
        throw new AppError(ERR.CONFLICT, {
          message: '이미 사용 중인 이메일입니다.',
          data: { keys: ['email'], dbCode: err?.code },
        });
      throw new AppError(ERR.CONFLICT, {
        message: '중복된 값이라 수정할 수 없습니다.',
        data: { dbCode: err?.code },
      });
    }
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '회원정보 수정 중 오류가 발생했습니다.',
      data: {
        targetId: userId,
        keys: Object.keys(patch),
        dbCode: err?.code,
        extra: { mode, patch },
      },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 비밀번호 변경
 * @param {number} userId
 * @param {user.PasswordPayload} payload
 * @returns {Promise<void>}
 */
export async function changePassword(userId, payload) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `
      SELECT user_id AS userId, status, password_hash AS passwordHash
      FROM user
      WHERE user_id = :userId
        AND status <> 'DELETED'
      LIMIT 1
      FOR UPDATE
      `,
      { userId },
    );

    const user = rows?.[0];
    if (!user)
      throw new AppError(ERR.NOT_FOUND, {
        message: '해당 계정이 존재하지 않습니다.',
        data: { targetId: userId },
      });

    if (user.status !== USER_STATUS.ACTIVE && user.status !== USER_STATUS.SUSPENDED)
      throw new AppError(ERR.FORBIDDEN, {
        message: '현재 계정 상태에서는 비밀번호를 변경할 수 없습니다.',
        data: { targetId: userId, extra: { status: user.status } },
      });

    const ok = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!ok)
      throw new AppError(ERR.CONFLICT, {
        message: '현재 비밀번호가 일치하지 않습니다.',
        data: { targetId: userId, keys: ['currentPassword'] },
      });

    const passwordHash = await bcrypt.hash(payload.newPassword, 10);

    await conn.execute(
      `
      UPDATE user
        SET password_hash = :passwordHash
      WHERE user_id = :userId
        AND status <> 'DELETED'
      `,
      { userId, passwordHash },
    );

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '비밀번호 변경 중 오류가 발생했습니다.',
      data: { targetId: userId, keys: ['currentPassword', 'newPassword'], dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release?.();
  }
}

/** 회원 탈퇴
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function deleteUser(userId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 동시 요청 경합 방지
    const [rows] = await conn.execute(`SELECT user_id, status FROM user WHERE user_id = :userId FOR UPDATE`, {
      userId,
    });

    const user = rows?.[0];
    if (!user)
      throw new AppError(ERR.NOT_FOUND, {
        message: '해당 계정이 존재하지 않습니다.',
        data: { targetId: userId },
      });
    if (user.status === USER_STATUS.DELETED) {
      await conn.commit();
      return;
    }

    await conn.execute(
      `
      UPDATE user SET status = 'DELETED', deleted_at = NOW()
      WHERE user_id = :userId AND status <> 'DELETED'
      `,
      { userId },
    );
    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '회원 탈퇴 처리 중 오류가 발생했습니다.',
      data: { targetId: userId, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

// ADMIN 회원 목록 조회
export async function readUserListAdmin(filter) {
  const conn = await db.getConnection();
  try {
    const where = [];
    const params = [];

    if (filter.q) {
      where.push('(nickname LIKE ? OR email LIKE ?)');
      params.push(`%${filter.q}%`, `%${filter.q}%`);
    }

    if (filter.status) {
      where.push('status = ?');
      params.push(filter.status);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const limit = Number(filter.limit) || 10;
    const page = Number(filter.page) || 1;
    const offset = (page - 1) * limit;

    // ⭐ query() 사용
    const [items] = await conn.query(
      `
      SELECT
        user_id AS userId,
        email,
        nickname,
        role,
        status,
        profile_url AS profileUrl,
        created_at AS createdAt
      FROM \`user\`
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      params,
    );

    const [countRows] = await conn.query(
      `
      SELECT COUNT(*) AS total
      FROM \`user\`
      ${whereSql}
      `,
      params,
    );

    return {
      items,
      total: countRows[0]?.total ?? 0,
      page,
      limit,
    };
  } finally {
    conn.release?.();
  }
}

// ADMIN 회원 상세 조회
export async function readUserAdmin(userId) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      `
      SELECT
        user_id AS userId,
        email,
        nickname,
        role,
        status,
        profile_url AS profileUrl,
        created_at AS createdAt
      FROM \`user\`
      WHERE user_id = ?
      `,
      [userId],
    );

    return rows[0] ?? null;
  } finally {
    conn.release?.();
  }
}
