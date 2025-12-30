// controllers/requests/userRequest.js
import { requireString, requireStringNoTrim } from '../../common/check.js';
import { toFilePath } from '../../middleware/upload.js';
import { AppError, ERR } from '../../common/error.js';

/** @typedef {import('express').Request} Request */

/** 수정 payload
 * @param {Request} req
 * @returns {user.UpdatePayload} */
export function buildUpdatePayload(req) {
  const body = req?.body ?? {};

  /** @type {user.UpdatePayload} */
  const payload = {};

  if ('nickname' in body) payload.nickname = requireString(body.nickname);
  if ('phone' in body) payload.phone = body.phone == null ? null : String(body.phone).trim();

  const uploaded = req?.file;
  if (uploaded) payload.profileUrl = toFilePath(uploaded);
  else if ('profileUrl' in body) {
    const v = body.profileUrl;
    payload.profileUrl = v == null ? null : String(v).trim();
  }

  return payload;
}

/** 관리자 수정 payload
 * @param {Request} req
 * @returns {user.AdminUpdatePayload} */
export function buildAdminUpdatePayload(req) {
  const body = req?.body ?? {};

  /** @type {user.AdminUpdatePayload} */
  const payload = {};

  if ('email' in body) payload.email = requireString(body.email);
  if ('nickname' in body) payload.nickname = requireString(body.nickname);
  if ('phone' in body) payload.phone = body.phone == null ? null : String(body.phone).trim();
  if ('status' in body) payload.status = body.status;

  const uploaded = req?.file;
  if (uploaded) payload.profileUrl = toFilePath(uploaded);
  else if ('profileUrl' in body) {
    const v = body.profileUrl;
    payload.profileUrl = v == null ? null : String(v).trim();
  }

  return payload;
}

/** 비밀번호 변경 payload
 * @param {Request} req
 * @returns {user.PasswordPayload} */
export function buildPasswordPayload(req) {
  const body = req?.body ?? {};

  const currentPassword = requireStringNoTrim(body.currentPassword, '현재 비밀번호');
  const newPassword = requireStringNoTrim(body.newPassword, '새 비밀번호');

  if (currentPassword === newPassword)
    throw new AppError(ERR.BAD_REQUEST, {
      message: '새 비밀번호가 현재 비밀번호와 동일합니다.',
      data: { keys: ['newPassword'] },
    });

  /** @type {user.PasswordPayload} */
  const payload = { currentPassword, newPassword };

  return payload;
}
