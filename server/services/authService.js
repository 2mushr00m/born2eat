// services/authService.js
import bcrypt from 'bcrypt';
import db from '../repository/db.js';
import { AppError, ERR } from '../common/error.js';
import { USER_ROLE, USER_STATUS } from '../common/constants.js';

/** @typedef {import('express').Request} Request */

const DEFAULT_NICKNAME = '맛집탐험대';

/** 내부 헬퍼: 닉네임 랜덤생성 */
function generateNickname() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${DEFAULT_NICKNAME}-${suffix}`;
}

/** 회원가입
 * @param {Request} req
 * @param {auth.SignupPayload} payload
 * @returns {Promise<user.Item>}
 */
export async function signup(req, payload) {
  const { email, password, phone = null } = payload;
  const conn = await db.getConnection();

  try {
    // 1) 중복 이메일 체크
    const [dup] = await conn.execute(`SELECT user_id as userId FROM user WHERE email = :email LIMIT 1`, { email });
    if (dup?.[0])
      throw new AppError(ERR.CONFLICT, {
        message: '이미 사용 중인 이메일입니다.',
        data: { keys: ['email'] },
      });

    // 2) 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);

    // 3) 닉네임+사용자 생성
    for (let i = 0; i < 10; i++) {
      const cand = generateNickname();
      try {
        const [ins] = await conn.execute(
          `INSERT INTO user (email, password_hash, nickname, phone)
            VALUES (:email, :passwordHash, :nickname, :phone)`,
          { email, passwordHash, nickname: cand, phone },
        );

        // 4) 가입 즉시 로그인
        req.session.userId = Number(ins.insertId);
        return {
          userId: Number(ins.insertId),
          email,
          nickname: cand,
          profileUrl: null,
          role: USER_ROLE.USER,
          status: USER_STATUS.ACTIVE,
          suspendedUntil: null,
        };
      } catch (e) {
        if (e?.code === 'ER_DUP_ENTRY') continue;
        throw e;
      }
    }

    // 5) 10회 반복, 실패 시 오류
    throw new AppError(ERR.INTERNAL, {
      message: '닉네임 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '회원가입 처리 중 오류가 발생했습니다.',
      data: { keys: ['email', 'password', 'phone'], dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 로그인
 * @param {Request} req
 * @param {auth.LoginPayload} payload
 * @returns {Promise<user.Item>}
 */
export async function login(req, payload) {
  const { email, password } = payload;
  const conn = await db.getConnection();

  try {
    const [rows] = await conn.execute(
      `SELECT
        user_id AS userId,
        email,
        password_hash AS passwordHash,
        status,
        role,
        nickname,
        profile_url AS profileUrl,
        suspended_until AS suspendedUntil
      FROM user
      WHERE email = :email
      LIMIT 1`,
      { email },
    );

    const user = rows?.[0];
    if (!user)
      throw new AppError(ERR.UNAUTHORIZED, {
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });

    if (user.status === USER_STATUS.DELETED)
      throw new AppError(ERR.UNAUTHORIZED, { message: '이미 탈퇴한 회원입니다.' });
    if (user.status === USER_STATUS.BANNED) throw new AppError(ERR.UNAUTHORIZED, { message: '차단된 회원입니다.' });

    const ok = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!ok)
      throw new AppError(ERR.UNAUTHORIZED, {
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });

    // 현재 세션을 새 세션 ID로 교체
    await new Promise((resolve, reject) => {
      req.session.regenerate((e) => (e ? reject(e) : resolve()));
    });
    req.session.userId = Number(user.userId);

    return {
      userId: Number(user.userId),
      email: String(user.email),
      nickname: String(user.nickname),
      profileUrl: user.profileUrl ?? null,
      role: String(user.role),
      status: String(user.status),
      suspendedUntil: user.suspendedUntil ?? null,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERR.DB, {
      message: '로그인 처리 중 오류가 발생했습니다.',
      data: { keys: ['email', 'password'], dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

/** 로그아웃
 * @param {Request} req
 * @returns {Promise<void>}
 */
export async function logout(req) {
  if (!req || !req.session) return;

  await new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        return reject(
          new AppError(ERR.INTERNAL_ERROR, {
            message: '로그아웃 처리 중 오류가 발생했습니다.',
            cause: err,
          }),
        );
      }
      resolve();
    });
  });
}
