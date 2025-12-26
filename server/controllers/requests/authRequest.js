// controllers/requests/authRequest.js
import { requireString, requireStringNoTrim } from '../../common/check.js';

/** @typedef {import('express').Request} Request */

/** 회원가입 payload
 * @param {Request} req
 * @returns {auth.SignupPayload} */
export function buildSignupPayload(req) {
  const body = req?.body ?? {};

  /** @type {auth.SignupPayload} */
  const payload = {
    email: requireString(body.email, '이메일').trim(),
    password: requireStringNoTrim(body.password, '비밀번호'),
  };

  const phone = body.phone == null ? '' : String(body.phone).trim();
  if (phone) payload.phone = phone;

  return payload;
}

/** 로그인용 payload
 * @param {Request} req
 * @returns {auth.LoginPayload}
 */
export function buildLoginPayload(req) {
  const body = req?.body ?? {};

  /** @type {auth.LoginPayload} */
  const payload = {
    email: requireString(body.email, '이메일').trim(),
    password: requireStringNoTrim(body.password, '비밀번호'),
  };

  return payload;
}
