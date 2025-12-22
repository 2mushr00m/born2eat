// controller/restaurantController.js
import { parseId } from '../common/check.js';
import { wrap, ok, created } from '../common/http.js';
import { buildListFilter, buildCreatePayload, buildUpdatePayload } from './request/restaurantRequest.js';
import {
    readRestaurantList, readRestaurant,
    createRestaurant, updateRestaurant, deleteRestaurant,
} from '../service/restaurantService.js';


/* ============== 공개용 ============== */

/** GET /restaurants */
export const list = wrap(async (req, res) => {
    const filter = buildListFilter(req);
    const result = await readRestaurantList(filter);
    ok(res, result);
});

/** GET /restaurants/:restaurantId */
export const read = wrap(async (req, res) => {
    const restaurantId = parseId(req.params?.restaurantId);
    const result = await readRestaurant(restaurantId);
    ok(res, result);
});


/* ============== 관리자용 ============== */

/** GET /admin/restaurants */
export const adminList = wrap(async (req, res) => {
    const filter = buildListFilter(req);
    const result = await readRestaurantList(filter, { mode: 'ADMIN' });
    ok(res, result);
});

/** GET /admin/restaurants/:restaurantId */
export const adminRead = wrap(async (req, res) => {
    const restaurantId = parseId(req.params?.restaurantId);
    const result = await readRestaurant(restaurantId, { mode: 'ADMIN' });
    ok(res, result);
});

/** POST /admin/restaurants */
export const adminCreate = wrap(async (req, res) => {
    const payload = buildCreatePayload(req);
    const restaurantId = await createRestaurant(payload);
    created(res, { restaurantId });
});

/** PATCH /admin/restaurants/:restaurantId */
export const adminUpdate = wrap(async (req, res) => {
    const restaurantId = parseId(req.params?.restaurantId);
    const payload = buildUpdatePayload(req);
    await updateRestaurant(restaurantId, payload);
    ok(res, { restaurantId });
});

/** DELETE /admin/restaurants/:restaurantId */
export const adminDestroy = wrap(async (req, res) => {
    const restaurantId = parseId(req.params?.restaurantId);
    await deleteRestaurant(restaurantId);
    ok(res, { restaurantId });
});



/* ============== TODO/Stub ============== */

/** PUT /restaurants/:restaurantId/tags */
export const putTags = wrap(async (req, res) => {
    const restaurantId = parseId(req.params?.restaurantId);
    ok(res, { restaurantId })
});

/** DELETE /restaurants/:restaurantId/tags/:tagCode */
export const deleteTag = wrap(async (req, res) => {
    const restaurantId = parseId(req.params?.restaurantId);
    ok(res, { restaurantId })
});

/** PATCH /restaurants/:restaurantId/photos */
export const patchPhotos = wrap(async (req, res) => {
    const restaurantId = parseId(req.params?.restaurantId);
    ok(res, { restaurantId })
});

/** PATCH /restaurants/:restaurantId/broadcasts */
export const patchBroadcasts = wrap(async (req, res) => {
    const restaurantId = parseId(req.params?.restaurantId);
    ok(res, { restaurantId })
});


