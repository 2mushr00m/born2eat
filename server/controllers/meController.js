// controllers/meController.js
import { wrap, ok } from '../common/http.js';
import { requireString } from '../common/check.js';
import { buildUpdatePayload, buildPasswordPayload } from './requests/userRequest.js';
import { changePassword, deleteUser, readUser, updateUser } from '../services/userService.js';

/* ============== USER ============== */

/** GET /me */
export const read = wrap(async (req, res) => {
  const userId = req.user?.userId ?? null;
  const result = await readUser(userId, { mode: 'ME' });
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
  const payload = buildPasswordPayload(req);
  await changePassword(userId, payload);
  ok(res, { id: userId });
});
