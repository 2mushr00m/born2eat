// server/service/restaurantService.js

import db from '../repository/db.js';
import logger from '../common/logger.js';
import { makeLoc } from '../common/loc.js';
import { BasicError, NotFoundError } from '../common/error.js';

/** @typedef {import('./restaurantType.js').RestaurantListFilter} Filter */
/** @typedef {import('./restaurantType.js').Restaurant} Item */
/** @typedef {import('./restaurantType.js').RestaurantList} List */
/** @typedef {import('./restaurantType.js').RestaurantDetail} Detail */
/** @typedef {import('./restaurantType.js').RestaurantCreatePayload} CreatePayload */
/** @typedef {import('./restaurantType.js').RestaurantUpdatePayload} UpdatePayload */


const loc = makeLoc(import.meta.url);

/**
 * 내부 헬퍼: type='food' 코드 → path prefix 조회
 * @param {string} foodCode
 * @returns {Promise<string>}  ex) 'food/한식/국밥%'
 */
async function resolveFoodPath(foodCode) {
    const location = loc(resolveFoodPath);
    const conn = await db.getConnection();
    try {
        const [rows] = await conn.execute(
            `SELECT path
               FROM tag
              WHERE type = 'food'
                AND code = :code
              LIMIT 1`,
            { code: foodCode },
        );
        if (rows.length === 0) {
            throw new NotFoundError('해당 음식 태그를 찾을 수 없습니다.', {
                code: 'FOOD_TAG_NOT_FOUND',
                location,
                data: { foodCode },
            });
        }

        const path = rows[0].path;
        return `${path}%`;
    } catch (err) {
        if (err instanceof NotFoundError)
            throw err;

        logger.warn({
            level: 'WARN',
            code: 'FOOD_QUERY_ERROR',
            message: 'food 태그 경로 조회 중 예외 발생, food 필터를 무시합니다.',
            location,
            data: { food, errMessage: err.message },
        });
    } finally {
        conn.release();
    }
}

/**
 * 내부 헬퍼: food_tag_code → tag_id 조회
 * @param {string|null} foodCode
 * @returns {Promise<number|null>}
 */
async function resolveFoodTagId(foodCode) {
    const location = loc(resolveFoodTagId);
    const conn = await db.getConnection();
    try {
        if (!foodCode) return null;
        const [rows] = await conn.execute(
            `
            SELECT tag_id
            FROM tag
            WHERE type = 'food'
            AND code = ?
            LIMIT 1
            `,
            [foodCode],
        );

        if (!rows || rows.length === 0)
            throw new NotFoundError('FOOD_TAG_NOT_FOUND', {
                location,
                data: { foodCode },
            });

        return rows[0].tag_id;
    } finally {
        conn.release();
    }
}

/**
 * 내부 헬퍼: id로 restaurant 모든 컬럼 조회
 * @param {number} id
 */
async function resolveRestaurantId(id) {

}



/**
 * /restaurants 목록 조회
 *
 * @param {Filter} filter
 * @returns {Promise<List>}
 */
export async function readRestaurantList(filter) {
    const location = loc(readRestaurantList);
    const { food, tags, region, q, page, limit } = filter;
    const offset = (page - 1) * limit;

    // 1) food path prefix 준비
    let foodPathPrefix = null;
    if (food) foodPathPrefix = await resolveFoodPath(food);

    const conn = await db.getConnection();
    try {
        const params = {};

        const whereClauses = ['1=1'];
        const joinClauses = [];
        let groupBy = [];
        const havingClauses = [];

        joinClauses.push(`
            LEFT JOIN tag tf
                   ON tf.tag_id = r.food_tag_id
        `);
        joinClauses.push(`
            LEFT JOIN region rg3
                   ON rg3.region_code = r.region_code
        `);
        joinClauses.push(`
            LEFT JOIN region rg2
                   ON rg2.region_code = rg3.parent_code
        `);
        joinClauses.push(`
            LEFT JOIN region rg1
                   ON rg1.region_code = rg2.parent_code
        `);
        joinClauses.push(`
            LEFT JOIN (
                SELECT restaurant_id, COUNT(*) AS like_count
                  FROM restaurant_like
                 GROUP BY restaurant_id
            ) rl ON rl.restaurant_id = r.restaurant_id
        `);
        joinClauses.push(`
            LEFT JOIN (
                SELECT restaurant_id,
                       MAX(CASE WHEN photo_type = 'MAIN' AND is_main = 1 THEN file_path END) AS main_photo
                  FROM restaurant_photo
                 GROUP BY restaurant_id
            ) rp ON rp.restaurant_id = r.restaurant_id
        `);

        // 1) food 필터 (대표 food + 하위 포함)
        if (foodPathPrefix) {
            whereClauses.push(`
                tf.type = 'food'
                AND tf.path LIKE :foodPathPrefix
            `);
            params.foodPathPrefix = foodPathPrefix;
        }

        // 2) region 필터 (prefix)
        if (region) {
            whereClauses.push(`r.region_code LIKE :regionPrefix`);
            params.regionPrefix = `${region}%`;
        }

        // 3) 검색어 필터 (이름, 대표메뉴명, 지역명 전부)
        if (q) {
            whereClauses.push(`
                (
                    r.name LIKE :q
                    OR tf.name LIKE :q
                    OR rg1.name LIKE :q
                    OR rg2.name LIKE :q
                    OR rg3.name LIKE :q
                )
            `);
            params.q = `%${q}%`;
        }

        // 4) tags (AND 조건) 있을 때만 GROUP BY / HAVING 사용
        const useTagFilter = Array.isArray(tags) && tags.length > 0;
        if (useTagFilter) {
            const tagPlaceholders = tags
                .map((_, idx) => `:tag_${idx}`)
                .join(', ');

            tags.forEach((code, idx) => {
                params[`tag_${idx}`] = code;
            });

            joinClauses.push(`
                JOIN restaurant_tag rt_filter
                  ON rt_filter.restaurant_id = r.restaurant_id
            `);
            joinClauses.push(`
                JOIN tag t_filter
                  ON t_filter.tag_id = rt_filter.tag_id
                 AND t_filter.type = 'tag'
                 AND t_filter.code IN (${tagPlaceholders})
            `);

            havingClauses.push(`COUNT(DISTINCT t_filter.code) = :tagCount`);
            params.tagCount = tags.length;

            groupBy = [
                'r.restaurant_id',
                'r.name',
                'r.kakao_place_id',
                'r.address',
                'r.longitude',
                'r.latitude',
                'r.rating_sum',
                'r.review_count',
                'rl.like_count',
                'r.region_code',
                'tf.name',
                'rp.main_photo',
                'rg1.name',
                'rg2.name',
                'rg3.name',
            ];
        }

        // 5) 메인 SELECT
        const baseSelect = `
            SELECT
                r.restaurant_id,
                r.name,
                r.kakao_place_id,
                r.main_food,
                r.address,
                r.longitude,
                r.latitude,
                r.rating_sum,
                r.review_count,
                COALESCE(rl.like_count, 0) AS like_count,
                tf.name AS food_category,
                rp.main_photo,
                r.region_code,
                COALESCE(rg1.name, rg2.name, rg3.name) AS region_depth1,
                CASE
                    WHEN rg1.name IS NOT NULL THEN rg2.name   -- 3단계: 시/도(rg1), 구(rg2), 동(rg3)
                    WHEN rg2.name IS NOT NULL THEN rg3.name   -- 2단계: 시/도(rg2), 구(rg3)
                    ELSE NULL                                 -- 1단계: 시/도(rg3)만 있음
                END AS region_depth2,
                CASE
                    WHEN rg1.name IS NOT NULL THEN rg3.name   -- 동까지 있을 때만 depth3 채움
                    ELSE NULL
                END AS region_depth3
            FROM restaurant r
            ${joinClauses.join('\n')}
            WHERE ${whereClauses.join(' AND ')}
            ${groupBy.length ? `GROUP BY ${groupBy.join(', ')}` : ''}
            ${havingClauses.length ? `HAVING ${havingClauses.join(' AND ')}` : ''}
            ORDER BY
                r.review_count DESC,
                r.rating_sum  DESC,
                r.restaurant_id DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const [rows] = await conn.execute(baseSelect, params);

        /** @type {Item[]} */
        const items = rows.map((row) => ({
            restaurant_id: row.restaurant_id,
            name: row.name,
            kakao_place_id: row.kakao_place_id ?? null,
            
            food_category: row.food_category ?? null,
            main_food: row.main_food ?? null,
            main_photo: row.main_photo ?? null,
            address: row.address ?? null,

            longitude: row.longitude != null ? Number(row.longitude) : null,
            latitude: row.latitude != null ? Number(row.latitude) : null,

            rating_sum: row.rating_sum != null ? Number(row.rating_sum) : 0,
            rating_count: row.review_count != null ? Number(row.review_count) : 0,
            like_count: row.like_count != null ? Number(row.like_count) : 0,

            tags: [],

            region: {
                code: row.region_code ?? null,
                depth1: row.region_depth1 ?? null,
                depth2: row.region_depth2 ?? null,
                depth3: row.region_depth3 ?? null,
            },
        }));

        if (items.length === 0) {
            return {
                items: [],
                page,
                limit,
                total: 0,
            };
        }

        // 6) tags 로딩 (restaurant_tag + tag)
        const restaurantIds = items.map((r) => r.restaurant_id);
        let tagsByRestaurant = new Map();

        if (restaurantIds.length > 0) {
            const idPlaceholders = restaurantIds
                .map((_, idx) => `:id_${idx}`)
                .join(', ');

            /** @type {Record<string, any>} */
            const idParams = {};
            restaurantIds.forEach((id, idx) => {
                idParams[`id_${idx}`] = id;
            });

            const [tagRows] = await conn.execute(
                `
                SELECT
                    rt.restaurant_id,
                    t.name
                  FROM restaurant_tag rt
                  JOIN tag t
                    ON t.tag_id = rt.tag_id
                 WHERE rt.restaurant_id IN (${idPlaceholders})
                `,
                idParams,
            );

            tagsByRestaurant = new Map();
            for (const row of tagRows) {
                const arr = tagsByRestaurant.get(row.restaurant_id) || [];
                arr.push(row.name);
                tagsByRestaurant.set(row.restaurant_id, arr);
            }
        }

        for (const item of items) {
            item.tags = tagsByRestaurant.get(item.restaurant_id) || [];
        }

        // 7) total 카운트 (필터 동일, LIMIT/OFFSET 없이 COUNT)
        const countQuery = `
            SELECT COUNT(*) AS total
              FROM (
                SELECT r.restaurant_id
                  FROM restaurant r
                  ${joinClauses.join('\n')}
                  WHERE ${whereClauses.join(' AND ')}
                  ${groupBy.length ? `GROUP BY ${groupBy.join(', ')}` : ''}
                  ${havingClauses.length ? `HAVING ${havingClauses.join(' AND ')}` : ''}
              ) x
        `;
        const [countRows] = await conn.execute(countQuery, params);
        const total = countRows[0]?.total ?? 0;

        return {
            items,
            page,
            limit,
            total
        };
    } catch (err) {
        throw new BasicError('레스토랑 목록 조회 중 오류가 발생했습니다.', {
            code: 'GET_RESTAURANT_LIST_ERROR',
            status: 500,
            location,
            data: {
                filter,
                message: err?.message,
                sqlState: err?.sqlState,
                sqlMessage: err?.sqlMessage,
             },
            cause: err,
        });
    } finally {
        conn.release();
    }
}


/**
 * /restaurants/:id 상세 조회
 *
 * @param {number} id
 * @returns {Promise<Detail>}
 */
export async function readRestaurant(id) {
    const location = loc(readRestaurant);
    const conn = await db.getConnection();
    
    try {
        // 1) 기본 정보 + region + food 카테고리 + like_count
        const [basicRows] = await conn.execute(
            `
            SELECT
                r.restaurant_id,
                r.name,
                r.kakao_place_id,
                r.main_food,
                r.phone,
                r.address,
                r.longitude,
                r.latitude,
                r.rating_sum,
                r.review_count,
                COALESCE(rl.like_count, 0) AS like_count,
                r.region_code,
                rg.depth AS region_depth,
                CASE
                    WHEN rg.depth = 1 THEN rg.name
                    WHEN rg.depth = 2 THEN rg_p1.name
                    WHEN rg.depth = 3 THEN rg_p2.name
                    ELSE NULL
                END AS region_depth1,
                CASE
                    WHEN rg.depth = 1 THEN NULL
                    WHEN rg.depth = 2 THEN rg.name
                    WHEN rg.depth = 3 THEN rg_p1.name
                    ELSE NULL
                END AS region_depth2,
                CASE
                    WHEN rg.depth = 1 THEN NULL
                    WHEN rg.depth = 2 THEN NULL
                    WHEN rg.depth = 3 THEN rg.name
                    ELSE NULL
                END AS region_depth3,
                ft.name  AS food_category
            FROM restaurant r
            LEFT JOIN tag ft
                   ON ft.tag_id = r.food_tag_id
            LEFT JOIN region rg
                   ON rg.region_code = r.region_code
            LEFT JOIN region rg_p1
                   ON rg_p1.region_code = rg.parent_code
            LEFT JOIN region rg_p2
                   ON rg_p2.region_code = rg_p1.parent_code
            LEFT JOIN (
                SELECT restaurant_id, COUNT(*) AS like_count
                  FROM restaurant_like
                 GROUP BY restaurant_id
            ) rl ON rl.restaurant_id = r.restaurant_id
            WHERE r.restaurant_id = :id
            LIMIT 1
            `,
            { id },
        );

        if (basicRows.length === 0)
            throw new NotFoundError('레스토랑을 찾을 수 없습니다.', {
                code: 'RESTAURANT_NOT_FOUND',
                status: 404,
                location,
                data: { id },
            });

        const row = basicRows[0];

        /** @type {Detail} */
        const detail = {
            restaurant_id: row.restaurant_id,
            name: row.name,
            kakao_place_id: row.kakao_place_id ?? null,

            food_category: row.food_category ?? null,
            main_food: row.main_food ?? null,
            phone: row.phone ?? null,
            address: row.address ?? null,

            longitude: row.longitude != null ? Number(row.longitude) : null,
            latitude: row.latitude != null ? Number(row.latitude) : null,

            rating_sum: row.rating_sum != null ? Number(row.rating_sum) : 0,
            rating_count: row.review_count != null ? Number(row.review_count) : 0,
            like_count: row.like_count != null ? Number(row.like_count) : 0,

            region: {
                code: row.region_code ?? null,
                depth1: row.region_depth1 ?? null,
                depth2: row.region_depth2 ?? null,
                depth3: row.region_depth3 ?? null,
            },

            // 아래에서 채움
            tags: [],
            photos: {
                main: [],
                menu_board: [],
                food: [],
                interior: [],
                etc: [],
            },
            /** @type {Broadcast[]} */
            broadcasts: [],
        };

        // 2) 태그 목록
        const [tagRows] = await conn.execute(
            `
            SELECT t.name
              FROM restaurant_tag rt
              JOIN tag t
                ON t.tag_id = rt.tag_id
             WHERE rt.restaurant_id = :id AND t.type = 'TAG'
            `,
            { id },
        );
        detail.tags = tagRows.map((t) => t.name);

        // 3) 사진 그룹 (Photo / PhotosGroup 형태로 매핑)
        const [photoRows] = await conn.execute(
            `
            SELECT
                p.photo_type,
                p.file_path,
                p.caption,
                p.updated_at,
                p.source_type,
                p.is_main,
                u.name AS source_user_name
              FROM restaurant_photo p
         LEFT JOIN user u
                ON u.user_id = p.source_user_id
             WHERE p.restaurant_id = :id
             ORDER BY
                p.is_main DESC,
                p.created_at ASC
            `,
            { id },
        );

        /** @type {PhotosGroup} */
        const photos = {
            main: [],
            menu_board: [],
            food: [],
            interior: [],
            etc: [],
        };

        for (const p of photoRows) {
            /** @type {Photo} */
            const photo = {
                file_path: p.file_path ?? null,
                caption: p.caption ?? null,
                updated_at: p.updated_at,                 // Date 또는 문자열 그대로 전달
                source: p.source_type,                    // 'USER' | 'ADMIN' | 'CRAWLER'
                source_user: p.source_type === 'USER'
                    ? (p.source_user_name ?? null)        // 사용자 닉네임(표시 이름)
                    : null,
                is_main: p.is_main === 1,
            };

            switch (p.photo_type) {
                case 'MAIN':
                    photos.main.push(photo);
                    break;
                case 'MENU_BOARD':
                    photos.menu_board.push(photo);
                    break;
                case 'FOOD':
                    photos.food.push(photo);
                    break;
                case 'INTERIOR':
                    photos.interior.push(photo);
                    break;
                default:
                    photos.etc.push(photo);
            }
        }

        detail.photos = photos;


        // 4) 방송 정보: 출연한 모든 방송/회차 목록 → Broadcast[]
        const [brRows] = await conn.execute(
            `
            SELECT
                br.broadcast_id,
                b.broadcast_code,
                b.name AS broadcast_name,
                br.episode_no,
                be.aired_at
              FROM broadcast_restaurant br
              JOIN broadcast b
                ON b.broadcast_id = br.broadcast_id
         LEFT JOIN broadcast_episode be
                ON be.broadcast_id = br.broadcast_id
               AND be.episode_no   = br.episode_no
             WHERE br.restaurant_id = :id
             ORDER BY
                be.aired_at DESC,
                br.episode_no DESC
            `,
            { id },
        );

        if (brRows.length > 0) {
            // 방송 ID 목록
            const broadcastIds = Array.from(
                new Set(brRows.map((r) => r.broadcast_id)),
            );

            // 4-1) OTT 정보 한번에 조회해서 Map으로
            const ottParams = {};
            const ottPlaceholders = broadcastIds
                .map((bid, idx) => {
                    const key = `bid_${idx}`;
                    ottParams[key] = bid;
                    return `:${key}`;
                })
                .join(', ');

            let ottByBroadcastId = new Map();

            if (broadcastIds.length > 0) {
                const [ottRows] = await conn.execute(
                    `
                    SELECT broadcast_id, platform, ott_url
                      FROM broadcast_ott
                     WHERE broadcast_id IN (${ottPlaceholders})
                    `,
                    ottParams,
                );

                // 초기화
                for (const bid of broadcastIds) {
                    ottByBroadcastId.set(bid, {
                        NETFLIX: null,
                        TVING: null,
                        WAVVE: null,
                        etc: null,
                    });
                }

                for (const o of ottRows) {
                    const ott = ottByBroadcastId.get(o.broadcast_id);
                    if (!ott) continue;

                    if (o.platform === 'NETFLIX') ott.NETFLIX = o.ott_url;
                    else if (o.platform === 'TVING') ott.TVING = o.ott_url;
                    else if (o.platform === 'WAVVE') ott.WAVVE = o.ott_url;
                    else ott.etc = o.ott_url; // 'ETC'
                }
            }

            // 4-2) YouTube 정보: broadcast_id 기준으로 한번에 조회 후 (broadcast_id,episode_no)로 묶기
            const ytByKey = new Map();

            if (broadcastIds.length > 0) {
                const [ytRows] = await conn.execute(
                    `
                    SELECT broadcast_id, episode_no, youtube_url
                      FROM broadcast_youtube
                     WHERE broadcast_id IN (${ottPlaceholders})
                    `,
                    ottParams,
                );

                for (const y of ytRows) {
                    const key = `${y.broadcast_id}:${y.episode_no}`;
                    if (!ytByKey.has(key)) ytByKey.set(key, []);
                    ytByKey.get(key).push(y.youtube_url);
                }
            }

            // 4-3) brRows를 돌면서 Broadcast 객체 생성
            for (const br of brRows) {
                const ott = ottByBroadcastId.get(br.broadcast_id) || {
                    NETFLIX: null,
                    TVING: null,
                    WAVVE: null,
                    etc: null,
                };
                const ytKey = `${br.broadcast_id}:${br.episode_no}`;
                const youtube = ytByKey.get(ytKey) || [];

                detail.broadcasts.push({
                    name: br.broadcast_name ?? null,
                    episode_no: br.episode_no ?? null,
                    aired_at: br.aired_at ?? null,
                    ott,
                    youtube,
                });
            }
        }

        return detail;
    } catch (err) {
        if (err instanceof BasicError || err instanceof NotFoundError)
            throw err;
        throw new BasicError('레스토랑 상세 조회 중 오류가 발생했습니다.', {
            code: 'GET_RESTAURANT_DETAIL_ERROR',
            status: 500,
            location,
            data: { id, message: err?.message },
            cause: err,
        });
    } finally {
        conn.release();
    }
}

/**
 * /restaurants 생성
 * 
 * @param {CreatePayload} payload
 * @returns {Promise<number>}
 */
export async function createRestaurant(payload) {
    const location = loc(createRestaurant);
    const conn = await db.getConnection();
    
    // 1) food_tag_code → food_tag_id 해석
    const foodTagId = await resolveFoodTagId(payload.food_tag_code);
    
    try {
        await conn.beginTransaction();

        const sql = `
            INSERT INTO restaurant (
                name,
                kakao_place_id,
                region_code,
                food_tag_id,
                main_food,
                phone,
                address,
                longitude,
                latitude,
                is_published,
                data_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            payload.name,
            payload.kakao_place_id,
            payload.region_code,
            foodTagId,
            payload.main_food,
            payload.phone,
            payload.address,
            payload.longitude,
            payload.latitude,
            payload.is_published ? 1 : 0,
            payload.data_status,
        ];

        const [result] = await conn.execute(sql, params);
        const insertId = result.insertId;

        await conn.commit();
        return insertId;
    } catch (err) {
        if (err instanceof BasicError || err instanceof NotFoundError)
            throw err;
        throw new BasicError('레스토랑 생성 중 오류가 발생했습니다.', {
            code: 'CREATE_RESTAURANT_FAILED',
            status: 500,
            location,
            data: { payload },
            cause: err,
        });
    } finally {
        conn.release();
    }
}

/**
 * /restaurants 업데이트
 * 
 * @param {number} id
 * @param {UpdatePayload} payload
 */
export async function updateRestaurant(id, payload) {
    const location = loc(updateRestaurant);
    const conn = await db.getConnection();

    // 1) food_tag_code가 들어온 경우에만 tag_id 해석
    let foodTagId;
    if ('food_tag_code' in payload)
        foodTagId = await resolveFoodTagId(payload.food_tag_code);
    
    try {
        await conn.beginTransaction();
        const setClauses = [];
        const params = [];

        if ('name' in payload) {
            setClauses.push('name = ?');
            params.push(payload.name);
        }
        if ('kakao_place_id' in payload) {
            setClauses.push('kakao_place_id = ?');
            params.push(payload.kakao_place_id);
        }
        if ('region_code' in payload) {
            setClauses.push('region_code = ?');
            params.push(payload.region_code);
        }
        if ('food_tag_code' in payload) {
            setClauses.push('food_tag_id = ?');
            params.push(foodTagId);
        }
        if ('main_food' in payload) {
            setClauses.push('main_food = ?');
            params.push(payload.main_food);
        }
        if ('phone' in payload) {
            setClauses.push('phone = ?');
            params.push(payload.phone);
        }
        if ('address' in payload) {
            setClauses.push('address = ?');
            params.push(payload.address);
        }
        if ('longitude' in payload) {
            setClauses.push('longitude = ?');
            params.push(payload.longitude);
        }
        if ('latitude' in payload) {
            setClauses.push('latitude = ?');
            params.push(payload.latitude);
        }
        if ('is_published' in payload) {
            setClauses.push('is_published = ?');
            params.push(payload.is_published ? 1 : 0);
        }
        if ('data_status' in payload) {
            setClauses.push('data_status = ?');
            params.push(payload.data_status);
        }

        // 실제로 수정할 필드가 하나도 없다면 에러
        if (setClauses.length === 0)
            throw new BasicError('NO_FIELDS_TO_UPDATE', {
                location,
                data: { restaurant_id: id, payload },
            });

        const sql = `
            UPDATE restaurant
               SET ${setClauses.join(', ')}
             WHERE restaurant_id = ?
        `;
        params.push(id);

        const [result] = await conn.execute(sql, params);

        if (result.affectedRows === 0)
            throw new NotFoundError('RESTAURANT_NOT_FOUND', {
                location,
                data: { restaurant_id: id },
            });

        await conn.commit();
    } catch (err) {
        if (err instanceof BasicError || err instanceof NotFoundError)
            throw err;

        throw new BasicError('레스토랑 업데이트 중 오류가 발생했습니다.', {
            code: 'UPDATE_RESTAURANT_FAILED',
            status: 500,
            location,
            data: { restaurant_id: id, payload, sql: err?.sql },
            cause: err,
        });
    } finally {
        conn.release();
    }
}

/**
 * /restaurants/:id 삭제
 * 
 * @param {number} id
 */
export async function deleteRestaurant(id) {
    return 'test';
}