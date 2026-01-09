// 음식점 관련 api 호출
import api from './api';

/** 음식점 목록
 * GET /restaurants
 * @param {{ q?: string, food?: string | null, tags?: string[] | string | null, region?: string | null }} [params]
 */
export const getRestList = (params) => api.get('/restaurants', { params });

/** 태그 목록 (UI용)
 * GET /tags
 */
export const getTags = (type) => {
  if (type === 'tag' || type === 'food') return api.get(`/tags?type=${type}`);
  else return api.get(`/tags?type=tag`);
};

export async function patchReview(reviewId, payload) {
  const fd = new FormData();

  if (payload.rating != null) fd.append('rating', String(payload.rating));
  if (payload.content != null) fd.append('content', payload.content);

  if (Array.isArray(payload.tags)) {
    payload.tags.forEach((t) => {
      if (t != null && String(t).trim() !== '') fd.append('tags', String(t));
    });
  }

  if (Array.isArray(payload.photosPatch) && payload.photosPatch.length > 0) {
    fd.append('photosPatch', JSON.stringify(payload.photosPatch));
  }

  if (Array.isArray(payload.photos) && payload.photos.length > 0) {
    payload.photos.forEach((file, idx) => {
      if (!file) return;
      fd.append('photos', file);

      const id = Array.isArray(payload.ids) ? payload.ids[idx] : '';
      const cap = Array.isArray(payload.captions) ? payload.captions[idx] : '';

      fd.append('ids', id == null ? '' : String(id));
      fd.append('captions', cap == null ? '' : String(cap));
    });
  }

  return api.patch(`/reviews/${reviewId}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export const deleteReview = (reviewId) => {
  if (!reviewId) throw new Error('reviewId is required');
  return api.delete(`/reviews/${reviewId}`);
};
