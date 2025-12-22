// controller/meController.js
import { parseId } from '../common/check.js';
import { wrap, ok, created } from '../common/http.js';
import { buildUpdatePayload } from './request/meRequest.js';
import { } from '../service/meService.js';
import { deleteUser, updateUser } from '../service/userService.js';


/** GET /me */
export const read = wrap(async (req, res) => {
    const userId = req.user?.userId ?? null;
    const result = {};
    ok(res, result);
});

/** PATCH /me */
export const update = wrap(async (req, res) => {
    const userId = req.user?.userId ?? null;
    const payload = buildUpdatePayload(req);    
    const result = await updateUser(userId, payload);
    ok(res, result);
});

/** DELETE /me */
export const destroy = wrap(async (req, res) => {
    const userId = req.user?.userId ?? null;
    await deleteUser(userId);
    await new Promise((resolve) => req.session.destroy(() => resolve()));
    ok(res);
});

/** PATCH /me/password */
export const password = wrap(async (req, res) => {
    const userId = req.user?.userId ?? null;
    {};
    ok(res, { userId });
});
