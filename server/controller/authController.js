// controller/authController.js
import { wrap, ok, created } from '../common/http.js';
import { buildSignupPayload, buildLoginPayload } from './request/authRequest.js';
import {
    signup as signupService,
    login as loginService, logout as logoutService
} from '../service/authService.js';


/* ============== 공개용 ============== */

/** POST /auth/signup */
export const signup = wrap(async (req, res) => {
    const payload = buildSignupPayload(req);
    const result = await signupService(req, payload);
    created(res, result);
});

/** POST /auth/login */
export const login = wrap(async (req, res) => {
    const payload = buildLoginPayload(req);
    const result = await loginService(req, payload);
    ok(res, result);
});

/** POST /auth/logout */
export const logout = wrap(async (req, res) => {
    await logoutService(req);
    ok(res);
});

/* ============== 관리자용 ============== */
