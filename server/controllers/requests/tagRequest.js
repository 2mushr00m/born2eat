// controllers/requests/tagRequest.js
import { requireString, parseNumber, parseId, parseBoolean } from '../../common/check.js';
import { TAG_TYPE } from '../../common/constants.js';

/** PUBLIC 태그 목록 조회 filter
 * @param {import('express').Request} req
 * @returns {{ type: 'tag' | 'food' }}
 */
export function buildPublicListFilter(req) {
  const raw = req?.query?.type;

  // 기본값: tag
  if (raw == null || raw === '') return { type: TAG_TYPE.tag };
  const type = String(raw).trim();

  if (type === TAG_TYPE.tag || type === TAG_TYPE.food) return { type };

  throw new AppError(ERR.VALIDATION, {
    message: 'type 값이 올바르지 않습니다.',
    data: { keys: ['type'], extra: { value: raw, allowed: [TAG_TYPE.tag, TAG_TYPE.food] } },
  });
}

export function buildAdminListFilter() {}
export function buildCreatePayload() {}
export function buildUpdatePayload() {}
