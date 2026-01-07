// services/kakaoApiService.js
import db from '../repository/db.js';
import logger from '../common/logger.js';
import { AppError, ERR } from '../common/error.js';
import { kakaoKeywordSearch, kakaoCoord2RegionCode } from '../common/api.js';

/**
 * 음식점 범위(startId~endId)에 대해 카카오 로컬 검색으로 주소/좌표/전화/region_code 갱신
 * - 1) 주소 있으면: "{name} {address}" 로 검색
 * - 2) 주소 없으면: "{name}" 로 검색
 * - 3) kakaoPlaceId 있으면: 검색결과 id 일치 검증 후 갱신
 * - 4) kakaoPlaceId 없으면: 유력 후보(첫 후보) 채택(이름 최소 검증) 후 placeId 포함 갱신
 * - 5) 좌표 확보 시: coord2regioncode로 region_code 자동 갱신(우리 region 테이블에 존재할 때만)
 *
 * @param {number} startId
 * @param {number} endId
 * @returns {Promise<{
 *  total: number,
 *  updated: number,
 *  skipped: number,
 *  failed: number,
 *  mismatched: number,
 *  details: Array<{ restaurantId:number, action:'UPDATED'|'SKIPPED'|'FAILED'|'MISMATCH', reason?:string, picked?:any }>
 * }>}
 */
export async function syncKakaoByRange(startId, endId) {
  const details = [];

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let mismatched = 0;

  const total = Math.max(0, endId - startId + 1);

  for (let restaurantId = startId; restaurantId <= endId; restaurantId += 1) {
    try {
      const r = await _readRestaurantForSync(restaurantId);

      if (!r) {
        skipped += 1;
        details.push({ restaurantId, action: 'SKIPPED', reason: 'NOT_FOUND' });
        continue;
      }

      if (!r.name?.trim()) {
        skipped += 1;
        details.push({ restaurantId, action: 'SKIPPED', reason: 'NAME_EMPTY' });
        continue;
      }

      // (권장) VERIFIED 보호: 자동 배치가 덮어쓰지 않게
      if (r.dataStatus === 'VERIFIED') {
        skipped += 1;
        details.push({ restaurantId, action: 'SKIPPED', reason: 'VERIFIED_PROTECTED' });
        continue;
      }

      const name = r.name.trim();
      const address = (r.address || '').trim();
      const hasPlaceId = !!(r.kakaoPlaceId && String(r.kakaoPlaceId).trim());

      let picked = null;
      let query = null;

      if (hasPlaceId) {
        // 1) name+address 우선
        if (address) {
          query = `${name} ${address}`;
          let docs = await kakaoKeywordSearch({ query, size: 10 });

          picked = docs.find((d) => String(d.id) === String(r.kakaoPlaceId)) || null;

          // 2) 실패 시 name-only로 재검색
          if (!picked) {
            query = name;
            docs = await kakaoKeywordSearch({ query, size: 10 });
            picked = docs.find((d) => String(d.id) === String(r.kakaoPlaceId)) || null;

            // 여전히 실패면 mismatch
            if (!picked) {
              mismatched += 1;
              details.push({
                restaurantId,
                action: 'MISMATCH',
                reason: 'KAKAO_PLACE_ID_NOT_FOUND_IN_SEARCH',
                picked: {
                  kakaoPlaceId: r.kakaoPlaceId,
                  queryTried: [`${name} ${address}`, name],
                  candidateIdsTop5: docs.slice(0, 5).map((it) => it.id),
                },
              });
              continue;
            }
          }
        } else {
          // address가 없으면 name-only 1번만
          query = name;
          const docs = await kakaoKeywordSearch({ query, size: 10 });
          picked = docs.find((d) => String(d.id) === String(r.kakaoPlaceId)) || null;

          if (!picked) {
            mismatched += 1;
            details.push({
              restaurantId,
              action: 'MISMATCH',
              reason: 'KAKAO_PLACE_ID_NOT_FOUND_IN_SEARCH',
              picked: {
                kakaoPlaceId: r.kakaoPlaceId,
                queryTried: [name],
                candidateIdsTop5: docs.slice(0, 5).map((it) => it.id),
              },
            });
            continue;
          }
        }
      } else {
        // (기존 로직 유지) placeId 없으면 유력 후보 선택
        query = address ? `${name} ${address}` : name;
        const docs = await kakaoKeywordSearch({ query, size: 10 });

        if (!docs.length) {
          skipped += 1;
          details.push({ restaurantId, action: 'SKIPPED', reason: 'NO_CANDIDATE' });
          continue;
        }

        const top = docs[0];
        if (!_isNameLikelyMatch(name, top?.place_name)) {
          skipped += 1;
          details.push({
            restaurantId,
            action: 'SKIPPED',
            reason: 'NAME_NOT_LIKELY_MATCH',
            picked: { query, top: _briefDoc(top) },
          });
          continue;
        }

        picked = top;
      }

      // 업데이트 payload 구성: 기본은 "빈 칸만 채우기"
      const patch = _buildPatchFromKakao(r, picked);

      // placeId가 없었다면 placeId도 채움(단, picked.id 존재)
      if (!hasPlaceId && picked?.id) patch.kakaoPlaceId = String(picked.id);

      if (!_hasAnyPatch(patch)) {
        skipped += 1;
        details.push({ restaurantId, action: 'SKIPPED', reason: 'NOTHING_TO_UPDATE', picked: _briefDoc(picked) });
        continue;
      }

      await _updateRestaurantForSync(restaurantId, patch);

      // 5) region_code 자동 갱신 (가능하면)
      // - 좌표가 있어야 함
      if (picked?.x != null && picked?.y != null) {
        const region = await kakaoCoord2RegionCode({ x: picked.x, y: picked.y });

        if (region?.code) {
          // 우리 region 테이블에 있을 때만 반영
          const exists = await _regionExists(region.code);
          if (exists) {
            // 기존 값과 다를 때만
            if (!r.regionCode || String(r.regionCode) !== String(region.code)) {
              patch.regionCode = String(region.code);
            }
          } else {
            logger.debug({
              code: 'KAKAO_SYNC_REGION_SKIP',
              message: '카카오 region_code가 우리 region 테이블에 없어 region_code 갱신을 건너뜁니다.',
              data: { targetId: restaurantId, extra: { kakaoRegionCode: region.code, query } },
            });
          }
        }
      }

      updated += 1;
      details.push({
        restaurantId,
        action: 'UPDATED',
        picked: { query, doc: _briefDoc(picked), applied: patch },
      });
    } catch (err) {
      failed += 1;

      logger.error({
        code: 'KAKAO_SYNC_FAIL',
        message: '카카오 동기화 처리 중 오류가 발생했습니다.',
        data: { targetId: restaurantId, dbCode: err?.code },
        cause: err,
      });

      details.push({ restaurantId, action: 'FAILED', reason: err?.message || 'UNKNOWN' });
    }
  }

  return { total, updated, skipped, failed, mismatched, details };
}

/* =========================
 * DB helpers
 * ========================= */

async function _readRestaurantForSync(restaurantId) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(
      `
      SELECT
        r.restaurant_id AS restaurantId,
        r.kakao_place_id AS kakaoPlaceId,
        r.name AS name,
        r.address AS address,
        r.phone AS phone,
        r.longitude AS longitude,
        r.latitude AS latitude,
        r.region_code AS regionCode,
        r.data_status AS dataStatus
      FROM restaurant r
      WHERE r.restaurant_id = :restaurantId
      LIMIT 1
      `,
      { restaurantId },
    );

    return rows?.[0] || null;
  } catch (err) {
    throw new AppError(ERR.DB, {
      message: '음식점 동기화 대상 조회 중 오류가 발생했습니다.',
      data: { targetId: restaurantId, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

async function _updateRestaurantForSync(restaurantId, patch) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const params = {
      restaurantId,
      kakaoPlaceId: null,
      address: null,
      phone: null,
      longitude: null,
      latitude: null,
      regionCode: null, // ✅ 추가
      ...patch,
    };

    for (const k of Object.keys(params)) {
      if (params[k] === undefined) params[k] = null;
    }

    await conn.execute(
      `
      UPDATE restaurant
      SET
        kakao_place_id = COALESCE(:kakaoPlaceId, kakao_place_id),
        address        = COALESCE(:address, address),
        phone          = COALESCE(:phone, phone),
        longitude      = COALESCE(:longitude, longitude),
        latitude       = COALESCE(:latitude, latitude),
        region_code    = COALESCE(:regionCode, region_code),
        data_status    = CASE
          WHEN data_status='RAW' AND (
            COALESCE(:address, address) IS NOT NULL
            OR COALESCE(:longitude, longitude) IS NOT NULL
            OR COALESCE(:latitude, latitude) IS NOT NULL
            OR COALESCE(:phone, phone) IS NOT NULL
            OR COALESCE(:regionCode, region_code) IS NOT NULL
          ) THEN 'BASIC'
          ELSE data_status
        END,
        is_published   = CASE
          WHEN is_published = 0
            AND data_status = 'RAW'
            AND (
              COALESCE(:address, address) IS NOT NULL
              OR COALESCE(:longitude, longitude) IS NOT NULL
              OR COALESCE(:latitude, latitude) IS NOT NULL
              OR COALESCE(:phone, phone) IS NOT NULL
              OR COALESCE(:regionCode, region_code) IS NOT NULL
            )
          THEN 1
          ELSE is_published
        END
      WHERE restaurant_id = :restaurantId
      `,
      params,
    );

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}

    if (String(err?.code).includes('ER_DUP_ENTRY')) {
      throw new AppError(ERR.CONFLICT, {
        message: 'kakaoPlaceId가 이미 다른 음식점에 등록되어 있어 갱신할 수 없습니다.',
        data: { targetId: restaurantId, dbCode: err?.code, extra: { kakaoPlaceId: patch?.kakaoPlaceId } },
        cause: err,
      });
    }

    throw new AppError(ERR.DB, {
      message: '음식점 카카오 동기화 업데이트 중 오류가 발생했습니다.',
      data: { targetId: restaurantId, dbCode: err?.code },
      cause: err,
    });
  } finally {
    conn.release();
  }
}

async function _regionExists(regionCode) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(
      `
      SELECT region_code
      FROM region
      WHERE region_code = :regionCode
      LIMIT 1
      `,
      { regionCode },
    );
    return !!rows?.length;
  } finally {
    conn.release();
  }
}

/* =========================
 * selection / patch helpers
 * ========================= */

function _buildPatchFromKakao(r, doc) {
  const patch = {};

  // 주소: road 우선, 없으면 지번
  const nextAddress = (doc?.road_address_name || doc?.address_name || '').trim() || null;
  if (!r.address && nextAddress) patch.address = nextAddress;

  // 전화
  const nextPhone = (doc?.phone || '').trim() || null;
  if (!r.phone && nextPhone) patch.phone = nextPhone;

  // 좌표
  const x = doc?.x != null ? Number(doc.x) : null;
  const y = doc?.y != null ? Number(doc.y) : null;

  if (r.longitude == null && x != null && !Number.isNaN(x)) patch.longitude = x;
  if (r.latitude == null && y != null && !Number.isNaN(y)) patch.latitude = y;

  return patch;
}

function _hasAnyPatch(patch) {
  if (!patch) return false;
  return Object.values(patch).some((v) => v != null);
}

function _normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()［］\[\]{}]/g, '')
    .replace(/(본점|직영점|1호점|2호점|3호점)$/g, '')
    .trim();
}

function _isNameLikelyMatch(a, b) {
  const na = _normalizeName(a);
  const nb = _normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

function _briefDoc(d) {
  if (!d) return null;
  return {
    id: d.id,
    place_name: d.place_name,
    address_name: d.address_name,
    road_address_name: d.road_address_name,
    phone: d.phone,
    x: d.x,
    y: d.y,
    category_name: d.category_name,
    place_url: d.place_url,
  };
}
