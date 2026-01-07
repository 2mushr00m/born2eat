// common/api.js
import axios from 'axios';
import { AppError, ERR } from './error.js';

const BASE = 'https://dapi.kakao.com';
const KEY = process.env.KAKAO_REST_API_KEY;

function _requireKey() {
  if (!KEY)
    throw new AppError(ERR.INTERNAL_ERROR, {
      message: 'Kakao REST API 키가 설정되지 않았습니다.',
      data: { keys: ['KAKAO_REST_API_KEY'] },
    });
}

function _wrapExternal(err, message, extra) {
  throw new AppError(ERR.EXTERNAL_API, {
    message,
    data: {
      apiUrl: err?.config?.url,
      apiCode: err?.code,
      apiStatus: err?.response?.status,
      extra,
    },
    cause: err,
  });
}

/** 카카오 키워드 검색
 * @param {{ query: string, size?: number, page?: number, x?: number|string, y?: number|string, radius?: number }} params
 * @returns {Promise<any[]>} documents */
export async function kakaoKeywordSearch(params) {
  _requireKey();

  const { query, size = 10, page = 1, x, y, radius } = params || {};
  if (!query)
    throw new AppError(ERR.BAD_REQUEST, {
      message: '카카오 키워드 검색 query가 필요합니다.',
      data: { keys: ['query'] },
    });

  try {
    const res = await axios.get(`${BASE}/v2/local/search/keyword.json`, {
      headers: { Authorization: `KakaoAK ${KEY}` },
      params: { query, size, page, x, y, radius },
      timeout: 10_000,
    });

    return res?.data?.documents || [];
  } catch (err) {
    _wrapExternal(err, '카카오 키워드 검색 요청 중 오류가 발생했습니다.', { query, size, page, x, y, radius });
  }
}

/** 좌표 → 행정구역 (법정동 코드 포함)
 * @param {{ x: number|string, y: number|string }} params
 * @returns {Promise<{ code: string|null, depth1: string|null, depth2: string|null } | null>}
 */
export async function kakaoCoord2RegionCode(params) {
  _requireKey();

  const { x, y } = params || {};
  if (x == null || y == null)
    throw new AppError(ERR.BAD_REQUEST, {
      message: '좌표 변환 x,y가 필요합니다.',
      data: { keys: ['x', 'y'] },
    });

  try {
    const res = await axios.get(`${BASE}/v2/local/geo/coord2regioncode.json`, {
      headers: { Authorization: `KakaoAK ${KEY}` },
      params: { x, y },
      timeout: 10_000,
    });

    const docs = res?.data?.documents || [];
    if (!docs.length) return null;

    // 법정동(B) 우선
    const b = docs.find((d) => d.region_type === 'B') || docs[0];

    return {
      code: b.code || null,
      depth1: b.region_1depth_name || null,
      depth2: b.region_2depth_name || null,
    };
  } catch (err) {
    _wrapExternal(err, '카카오 좌표 → 행정구역 변환 요청 중 오류가 발생했습니다.', { x, y });
  }
}
