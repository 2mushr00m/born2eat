// middleware/auth.js
import db from '../repository/db.js';
import { AppError, ERR } from '../common/error.js';
import { formatKstYmdHm } from '../common/time.js';
import { USER_ROLE, USER_STATUS } from '../common/constants.js';

export async function sessionUser(req, res, next) {
  const userId = req.session?.userId;
  if (!userId) {
    req.user = null;
    return next();
  }

  const conn = await db.getConnection();
  try {
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
            LIMIT 1
        `,
      { userId },
    );

    let user = rows?.[0] ?? null;

    // 세션은 있는데 유저가 없거나, 차단/탈퇴면 세션 정리
    if (!user || user.status === USER_STATUS.BANNED || user.status === USER_STATUS.DELETED) {
      req.user = null;
      try {
        req.session.userId = null;
      } catch {}
      try {
        req.session.destroy(() => {});
      } catch {}
      return next();
    }

    // 정지 기간이 지나면 자동해제
    if (
      user.status === USER_STATUS.SUSPENDED &&
      user.suspended_until != null &&
      new Date(user.suspended_until).getTime() <= Date.now()
    ) {
      const status = USER_STATUS.ACTIVE;
      await conn.execute(
        `
                UPDATE user
                    SET status = :status, suspended_until = NULL
                WHERE user_id = :userId
            `,
        { userId, status },
      );

      user = { ...user, status, suspendedUntil: null };
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(
      new AppError(ERR.DB, {
        message: '세션 사용자 로딩 중 오류가 발생했습니다.',
        data: { targetId: userId, dbCode: err?.code },
        cause: err,
      }),
    );
  } finally {
    conn.release();
  }
}

/** 로그인 필수 */
export function requireAuth(req, res, next) {
  if (!req.user?.userId) return next(new AppError(ERR.UNAUTHORIZED, { message: '로그인이 필요합니다.' }));

  if (req.user?.status === USER_STATUS.DELETED)
    return next(new AppError(ERR.UNAUTHORIZED, { message: '로그인이 필요합니다.' }));

  if (req.user?.status === USER_STATUS.BANNED)
    return next(new AppError(ERR.FORBIDDEN, { message: '차단된 계정입니다.' }));

  return next();
}

/** 정지 회원 사용불가 */
export function blockSuspendedUser(req, res, next) {
  if (req.user?.status === USER_STATUS.SUSPENDED) {
    const until = formatKstYmdHm(req.user?.suspendedUntil);
    return next(
      new AppError(ERR.FORBIDDEN, {
        message: until
          ? `계정이 정지되어 이용이 제한됩니다. ${until} 이후 다시 시도해 주세요.`
          : '계정이 정지되어 이용이 제한됩니다.',
      }),
    );
  }
  return next();
}

/** 관리자 권한 필수 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== USER_ROLE.ADMIN)
    return next(new AppError(ERR.FORBIDDEN, { message: '관리자 권한이 필요합니다.' }));

  return next();
}
