// controllers/reviewController.js
import { wrap, ok, created } from '../common/http.js';
import { parseId } from '../common/check.js';
import {
  buildPublicListFilter,
  buildMyListFilter,
  buildAdminListFilter,
  buildCreatePayload,
  buildUpdatePayload,
} from './requests/reviewRequset.js';
import {
  readReviewList,
  createReview,
  updateReview,
  deleteReview,
  hideReview,
  showReview,
} from '../services/reviewService.js';

/* ============== PUBLIC ============== */

/** GET /restaurants/:restaurantId/reviews */
export const list = wrap(async (req, res) => {
  const viewerId = req.user?.userId ?? null;
  const filter = buildPublicListFilter(req);
  const result = await readReviewList(filter, {
    mode: 'PUBLIC',
    viewerId,
    include: { detail: true, viewerLiked: true },
  });
  ok(res, result);
});

/* ============== USER ============== */

/** POST /restaurants/:restaurantId/reviews */
export const create = wrap(async (req, res) => {
  const restaurantId = parseId(req.params?.restaurantId);
  const userId = req.user?.userId ?? null;
  const payload = buildCreatePayload(req);
  const reviewId = await createReview(userId, restaurantId, payload);
  created(res, { id: reviewId });
});

/** PATCH /reviews/:reviewId */
export const update = wrap(async (req, res) => {
  const reviewId = parseId(req.params?.reviewId);
  const userId = req.user?.userId ?? null;
  const payload = buildUpdatePayload(req);
  await updateReview(reviewId, userId, payload);
  ok(res, { id: reviewId });
});

/** DELETE /reviews/:reviewId */
export const destroy = wrap(async (req, res) => {
  const reviewId = parseId(req.params?.reviewId);
  const userId = req.user?.userId ?? null;
  await deleteReview(reviewId, userId);
  ok(res);
});

/** GET /me/reviews */
export const myList = wrap(async (req, res) => {
  const userId = req.user?.userId ?? null;
  const filter = buildMyListFilter(req);
  const result = await readReviewList(filter, {
    mode: 'ME',
    viewerId: userId,
    include: { detail: true, viewerLiked: true },
  });
  ok(res, result);
});

/* ============== ADMIN ============== */

/** GET /admin/reviews */
export const adminList = wrap(async (req, res) => {
  const filter = buildAdminListFilter(req);
  const viewerId = req.user?.userId ?? null;
  const result = await readReviewList(filter, {
    mode: 'ADMIN',
    viewerId,
    include: { detail: false, viewerLiked: false },
  });
  ok(res, result);
});

/** PATCH /admin/reviews/:reviewId/hide */
export const adminHide = wrap(async (req, res) => {
  const reviewId = parseId(req.params?.reviewId);
  const actorId = req.user?.userId ?? null;
  await hideReview(reviewId, { actorId });
  ok(res, { id: reviewId });
});

/** PATCH /admin/reviews/:reviewId/show */
export const adminShow = wrap(async (req, res) => {
  const reviewId = parseId(req.params?.reviewId);
  const actorId = req.user?.userId ?? null;
  await showReview(reviewId, { actorId });
  ok(res, { id: reviewId });
});
