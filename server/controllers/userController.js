// controllers/userController.js
// controllers/adminUserController.js
import { wrap, ok } from '../common/http.js';
import { parseId } from '../common/check.js';
import { buildAdminUpdatePayload } from './requests/userRequest.js';
import { readUserListAdmin, readUserAdmin, readUser, updateUser, deleteUser } from '../services/userService.js';

/* ============== ADMIN ============== */

/** GET /admin/users */
export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = 'recent', searchField, q } = req.query;

    const filter = {
      page: Number(page),
      limit: Number(limit),
      q: searchField === 'name' || searchField === 'nickname' || searchField === 'email' ? q : undefined,
      status: searchField === 'status' ? q : undefined,
    };

    const result = await readUserListAdmin(filter);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
};

/** GET /admin/users/:userId */
export const adminRead = wrap(async (req, res) => {
  const userId = parseId(req.params?.userId);
  const result = await readUserAdmin(userId);
  ok(res, result);
});

/** PATCH /admin/users/:userId */
export const adminUpdate = wrap(async (req, res) => {
  const userId = parseId(req.params?.userId);
  const payload = buildAdminUpdatePayload(req);
  await updateUser(userId, payload);
  ok(res, { id: userId });
});

/** DELETE /admin/users/:userId */
export const adminDestroy = wrap(async (req, res) => {
  const userId = parseId(req.params?.userId);
  await deleteUser(userId);
  ok(res);
});
