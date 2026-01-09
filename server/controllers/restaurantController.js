// controllers/restaurantController.js
import { wrap, ok, created } from '../common/http.js';
import { parseId } from '../common/check.js';
import {
  buildPublicListFilter,
  buildAdminListFilter,
  buildMyLikesFilter,
  buildCreatePayload,
  buildUpdatePayload,
  buildCreatePhotosPayload,
} from './requests/restaurantRequest.js';
import {
  readRestaurantList,
  readRestaurant,
  readRestaurantAdmin,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  likeRestaurant,
  unlikeRestaurant,
  readLikedRestaurantList,
  createRestaurantPhotos,
  deleteRestaurantPhoto,
} from '../services/restaurantService.js';
import { syncKakaoByRange } from '../services/kakaoApiService.js';

/* ============== PUBLIC ============== */

/** GET /restaurants */
export const list = wrap(async (req, res) => {
  const viewerId = req.user?.userId ?? null;
  const filter = buildPublicListFilter(req);
  const result = await readRestaurantList(filter, { mode: 'PUBLIC', viewerId, include: { viewerLiked: true } });
  ok(res, result);
});

/** GET /restaurants/:restaurantId */
export const read = wrap(async (req, res) => {
  const viewerId = req.user?.userId ?? null;
  const restaurantId = parseId(req.params?.restaurantId);
  const result = await readRestaurant(restaurantId, { viewerId, include: { viewerLiked: true } });
  ok(res, result);
});

/* ============== USER ============== */

/** GET /me/likes */
export const likedList = wrap(async (req, res) => {
  const userId = req.user?.userId ?? null;
  const filter = buildMyLikesFilter(req);
  const result = await readLikedRestaurantList(filter, userId);
  ok(res, result);
});

/** POST /restaurants/:restaurantId/like */
export const like = wrap(async (req, res) => {
  const restaurantId = parseId(req.params?.restaurantId);
  const userId = req.user?.userId ?? null;
  await likeRestaurant(restaurantId, userId);
  ok(res);
});

/** DELETE /restaurants/:restaurantId/like */
export const unlike = wrap(async (req, res) => {
  const restaurantId = parseId(req.params?.restaurantId);
  const userId = req.user?.userId ?? null;
  await unlikeRestaurant(restaurantId, userId);
  ok(res);
});

/* ============== ADMIN ============== */

/** GET /admin/restaurants */
export const adminList = wrap(async (req, res) => {
  const filter = buildAdminListFilter(req);
  const result = await readRestaurantList(filter, { mode: 'ADMIN', include: { viewerLiked: false } });
  ok(res, result);
});

/** GET /admin/restaurants/:restaurantId */
export const adminRead = wrap(async (req, res) => {
  const restaurantId = parseId(req.params?.restaurantId);
  const result = await readRestaurantAdmin(restaurantId, { include: { viewerLiked: false } });
  ok(res, result);
});

/** POST /admin/restaurants */
export const create = wrap(async (req, res) => {
  const payload = buildCreatePayload(req);
  const restaurantId = await createRestaurant(payload);
  created(res, { id: restaurantId });
});

/** PATCH /admin/restaurants/:restaurantId */
export const update = wrap(async (req, res) => {
  const restaurantId = parseId(req.params?.restaurantId);
  const payload = buildUpdatePayload(req);
  await updateRestaurant(restaurantId, payload);
  ok(res, { id: restaurantId });
});

/** DELETE /admin/restaurants/:restaurantId */
export const destroy = wrap(async (req, res) => {
  const restaurantId = parseId(req.params?.restaurantId);
  await deleteRestaurant(restaurantId);
  ok(res);
});

/** POST /restaurants/:restaurantId/photos */
export const createPhotos = wrap(async (req, res) => {
  const restaurantId = parseId(req.params?.restaurantId);
  const payload = buildCreatePhotosPayload(req);
  const result = await createRestaurantPhotos(restaurantId, payload);
  created(res, result);
});

/** DELETE /restaurants/:restaurantId/photos/:photoId */
export const destroyPhotos = wrap(async (req, res) => {
  const restaurantId = parseId(req.params?.restaurantId);
  const photoId = parseId(req.params?.photoId);
  await deleteRestaurantPhoto(restaurantId, photoId);
  ok(res);
});

/** POST /admin/restaurants/sync-kakao */
export const syncKakao = wrap(async (req, res) => {
  const startId = parseId(req.body?.startId);
  const endId = parseId(req.body?.endId);
  const result = await syncKakaoByRange(startId, endId);
  ok(res, result);
});

/* ============== TODO/Stub ============== */

/** PUT /restaurants/:restaurantId/tags */
export const putTags = wrap(async (req, res) => {
  const restaurantId = parseId(req.params?.restaurantId);
  ok(res);
});

/** DELETE /restaurants/:restaurantId/tags/:tagCode */
export const deleteTag = wrap(async (req, res) => {
  const restaurantId = parseId(req.params?.restaurantId);
  ok(res);
});

/** PATCH /restaurants/:restaurantId/broadcasts */
export const patchBroadcasts = wrap(async (req, res) => {
  const restaurantId = parseId(req.params?.restaurantId);
  ok(res);
});
