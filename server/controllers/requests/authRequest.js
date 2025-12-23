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
    email: requireString(body.email, 'email').trim(),
    password: requireStringNoTrim(body.password, 'password'),
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
    email: requireString(body.email, 'email').trim(),
    password: requireStringNoTrim(body.password, 'password'),
  };

  return { email, password };
}
