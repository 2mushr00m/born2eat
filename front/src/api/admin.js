import api from './api';

/** 관리자 문의 목록 조회
 * GET /admin/inquiries
 * @param {{
 *  page?: number;
 *  limit?: number;
 *  status?: "PENDING" | "ANSWERED";
 *  type?: "GENERAL" | "BUG" | "RESTAURANT" | "ACCOUNT" | "OTHER";
 *  q?: string;
 *  searchTarget?: "ALL" | "TITLE" | "CONTENT";
 * }} [params]
 */
export const AdminInquiryListApi = (params) => {
  const p = params ?? {};
  const qs = new URLSearchParams();

  if (p.page != null) qs.set('page', String(p.page));
  if (p.limit != null) qs.set('limit', String(p.limit));

  if (p.status) qs.set('status', String(p.status));
  if (p.type) qs.set('type', String(p.type));

  if (p.q) qs.set('q', String(p.q));
  if (p.searchTarget) qs.set('searchTarget', String(p.searchTarget));

  const query = qs.toString();
  const url = query ? `/admin/inquiries?${query}` : '/admin/inquiries';
  return api.get(url);
};

/** 관리자 문의 상세 조회
 * GET /admin/inquiries/:inquiryId
 * @param {number} inquiryId
 */
export const AdminInquiryDetailApi = (inquiryId) => {
  if (!inquiryId) throw new Error('inquiryId is required');
  return api.get(`/admin/inquiries/${inquiryId}`);
};

/** 관리자 문의 답변 저장
 * PATCH /admin/inquiries/:inquiryId
 * @param {number} inquiryId
 * @param {{ answer: string }} body
 */
export const AdminInquiryAnswerApi = (inquiryId, body) => {
  if (!inquiryId) throw new Error('inquiryId is required');
  if (!body || typeof body.answer !== 'string') throw new Error('answer(string) is required');
  return api.patch(`/admin/inquiries/${inquiryId}`, body);
};

/** 관리자 리뷰 목록 조회
 * GET /admin/reviews
 * @param {{
 *  q?: string;
 *  sort?: string;
 *  searchTarget?: string;
 *  restaurantId?: number;
 *  userId?: number;
 *  isVisible?: "true" | "false";
 *  page?: number;
 *  limit?: number;
 * }} [params]
 */
export const AdminReviewListApi = (params) => {
  const p = params ?? {};
  const qs = new URLSearchParams();

  if (p.page != null) qs.set('page', String(p.page));
  if (p.limit != null) qs.set('limit', String(p.limit));

  if (p.sort) qs.set('sort', String(p.sort));
  if (p.q) qs.set('q', String(p.q));
  if (p.searchTarget) qs.set('searchTarget', String(p.searchTarget));

  if (p.restaurantId != null) qs.set('restaurantId', String(p.restaurantId));
  if (p.userId != null) qs.set('userId', String(p.userId));
  if (p.isVisible) qs.set('isVisible', String(p.isVisible)); // "true" | "false"

  const query = qs.toString();
  const url = query ? `/admin/reviews?${query}` : '/admin/reviews';
  return api.get(url);
};

/** 관리자 리뷰 상세 조회
 * GET /admin/reviews/:reviewId
 * @param {number} reviewId
 */
export const AdminReviewDetailApi = (reviewId) => {
  if (!reviewId) throw new Error('reviewId is required');
  return api.get(`/admin/reviews/${reviewId}`);
};

/** 관리자 리뷰 숨김
 * PATCH /admin/reviews/:reviewId/hide
 * @param {number} reviewId
 */
export const AdminReviewHideApi = (reviewId) => {
  if (!reviewId) throw new Error('reviewId is required');
  return api.patch(`/admin/reviews/${reviewId}/hide`);
};

/** 관리자 리뷰 보이기
 * PATCH /admin/reviews/:reviewId/show
 * @param {number} reviewId
 */
export const AdminReviewShowApi = (reviewId) => {
  if (!reviewId) throw new Error('reviewId is required');
  return api.patch(`/admin/reviews/${reviewId}/show`);
};

/** 관리자 음식점 목록 조회
 * GET /admin/restaurants
 *
 * @param {{
 *  q?: string;
 *  sort?: "recent" | "popular" | "recommend";
 *  isPublished?: "true" | "false";
 *  dataStatus?: "RAW" | "BASIC" | "VERIFIED";
 *  page?: number;
 *  limit?: number;
 * }} [params]
 */
export const AdminRestListApi = (params) => {
  const p = params ?? {};
  const qs = new URLSearchParams();

  if (p.q) qs.set('q', String(p.q));
  if (p.sort) qs.set('sort', String(p.sort));
  if (p.isPublished !== undefined && p.isPublished !== null && p.isPublished !== '') {
    const v = typeof p.isPublished === 'boolean' ? String(p.isPublished) : String(p.isPublished);
    qs.set('isPublished', v);
  }
  if (p.dataStatus) qs.set('dataStatus', String(p.dataStatus));
  if (p.page != null) qs.set('page', String(p.page));
  if (p.limit != null) qs.set('limit', String(p.limit));

  const query = qs.toString();
  const url = query ? `/admin/restaurants?${query}` : '/admin/restaurants';

  return api.get(url);
};

/** 관리자 음식점 상세 조회
 * GET /admin/restaurants/:restaurantId
 *
 * @param {number} restaurantId
 */
export const getRest = (restaurantId) => {
  if (!restaurantId) throw new Error('restaurantId is required');
  return api.get(`/admin/restaurants/${restaurantId}`);
};

/** 관리자 음식점 기본 수정
 * PATCH /admin/restaurants/:restaurantId/
 *
 * @param {number} restaurantId
 * @param {{
 *  name?: string,
 *  longitude?: number|null,
 *  latitude?: number|null,
 *  kakaoPlaceId?: string|null,
 *  description?: string|null,
 *  regionCode?: string|null,
 *  foodTagCode?: string|null,
 *  mainFood?: string|null,
 *  phone?: string|null,
 *  address?: string|null,
 *  isPublished?: boolean,
 *  dataStatus?: 'RAW'|'BASIC'|'VERIFIED'
 * }} [params]
 */
export const patchRestBase = (restaurantId, params) => {
  if (!restaurantId) throw new Error('restaurantId is required');

  const body = params ?? {};
  if (!body || Object.keys(body).length === 0) {
    throw new Error('params is empty');
  }

  return api.patch(`/admin/restaurants/${restaurantId}`, body);
};

/** 관리자 음식점 사진 추가
 * POST /admin/restaurants/:restaurantId/photos
 */
export const postRestPhotos = (restaurantId, formData) => {
  if (!restaurantId) throw new Error('restaurantId is required');

  return api.post(`/admin/restaurants/${restaurantId}/photos`, formData);
};

/** 관리자 음식점 사진 단건 삭제
 * DELETE /admin/restaurants/:restaurantId/photos/:photoId
 *
 * @param {number} restaurantId
 * @param {number} photoId
 */
export const deleteRestPhotos = (restaurantId, photoId) => {
  if (!restaurantId) throw new Error('restaurantId is required');
  if (!photoId) throw new Error('photoId is required');
  return api.delete(`/admin/restaurants/${restaurantId}/photos/${photoId}`);
};
