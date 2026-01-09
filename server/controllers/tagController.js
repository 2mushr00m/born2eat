// controllers/tagController.js
import { wrap, ok, created } from '../common/http.js';
import {
  buildPublicListFilter,
  buildAdminListFilter,
  buildCreatePayload,
  buildUpdatePayload,
} from './requests/tagRequest.js';
import { readTagList, readAdminTagList, createTag, updateTag, deleteTag } from '../services/tagService.js';
import { parseId } from '../common/check.js';

/* ============== PUBLIC ============== */

/** GET /tags */
export const list = wrap(async (req, res) => {
  const filter = buildPublicListFilter(req);
  const result = await readTagList(filter);
  ok(res, result);
});

//tag Clickcount 올라가는 API는 나중에 구현

/* ============== ADMIN ============== */

/** GET /admin/tags */
export const adminList = wrap(async (req, res) => {
  const filter = buildAdminListFilter(req);
  const result = await readAdminTagList(filter);
  ok(res, result);
});

/** POST /admin/tags */
export const create = wrap(async (req, res) => {
  const payload = buildCreatePayload(req);
  const tagId = await createTag(payload);
  created(res, { id: tagId });
});

/** PATCH /admin/tags/:tagId */
export const update = wrap(async (req, res) => {
  const tagId = parseId(req.params?.tagId);
  const payload = buildUpdatePayload(req);
  await updateTag(tagId, payload);
  ok(res);
});

/** DELETE /admin/tags/:tagId */
export const destroy = wrap(async (req, res) => {
  const tagId = parseId(req.params?.tagId);
  await deleteTag(tagId);
  ok(res);
});
