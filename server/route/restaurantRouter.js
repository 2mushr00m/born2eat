import express from 'express';
import { makeLoc } from '../common/loc.js';
import { requireString, parseNumber } from '../common/check.js';
import {
    readRestaurantList,
    readRestaurant,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
} from '../service/restaurantService.js';

/** @typedef {import('../service/restaurantType.js').RestaurantListFilter} Filter */
/** @typedef {import('../service/restaurantType.js').RestaurantCreatePayload} CreatePayload */
/** @typedef {import('../service/restaurantType.js').RestaurantUpdatePayload} UpdatePayload */


const router = express.Router();
const loc = makeLoc(import.meta.url);

/**
 * tags 쿼리 문자열 파싱
 * ex) "a,b,c" → ["a","b","c"]
 *
 * @param {any} raw
 * @returns {string[]}
 */
function parseTags(raw) {
    if (raw == null) return [];

    const values = Array.isArray(raw) ? raw : [raw];
    const parts = values
        .map((v) => String(v).trim())
        .filter(Boolean)
        .flatMap((s) => s.split(','))
        .map((x) => x.trim())
        .filter(Boolean);

    return Array.from(new Set(parts));
}


/**
 * GET /restaurants
 * 레스토랑 목록
 */
router.get('/', async (req, res, next) => {
    try {
        const location = loc('GET /restaurants')
        const {
            food: rawFood,
            tags: rawTags,
            region: rawRegion,
            q: rawQ,
            page: rawPage,
            limit: rawLimit,
        } = req.query || {};

        const page = parseNumber(rawPage, 'page', {
            location, integer: true, positive: true, nullable: true,
        }) || 1;
        const limit = parseNumber(rawLimit, 'limit', {
            location, integer: true, positive: true, nullable: true,
        }) || 10;
        const food = rawFood ? String(rawFood) : null;
        const region = rawRegion ? String(rawRegion) : null;
        const q = rawQ ? String(rawQ) : null;
        const tags = parseTags(rawTags);

        /** @type {Filter} */
        const filter = {food, tags, region, q, page, limit,};
        const result = await readRestaurantList(filter);

        return res.json({
            success: true,
            result,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /restaurants/:id
 * 레스토랑 상세조회
 */
router.get('/:id', async (req, res, next) => {
    try {
        const location = loc('GET /restaurants/:id');
        const { id: rawId } = req.params;

        const id = parseNumber(rawId, 'id', {
            location,
            integer: true,
            positive: true,
        });

        const result = await readRestaurant(id);

        return res.json({
            success: true,
            result,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /restaurants
 * 레스토랑 생성
 */
router.post('/', async (req, res, next) => {
    try {
        const location = loc('POST /restaurants');
        const {
            name,
            kakao_place_id,
            region_code,
            food_tag_code,
            main_food,
            phone,
            address,
            longitude,
            latitude,
            is_published,
            data_status,
        } = req.body || {};

        // 필수값 검증
        requireString(name, 'name', { location, data: { body: req.body } });

        /** @type {CreatePayload} */
        const payload = {
            name,
            kakao_place_id: kakao_place_id ?? null,
            region_code: region_code ?? null,
            food_tag_code: food_tag_code ?? null,
            main_food: main_food ?? null,
            phone: phone ?? null,
            address: address ?? null,
            longitude: parseNumber(longitude, 'longitude', {nullable: true, location, data: longitude}),
            latitude: parseNumber(latitude, 'latitude', {nullable: true, location, data: latitude}),
            is_published: Boolean(is_published),
            data_status: data_status ?? 'RAW',
        };
        const newId = await createRestaurant(payload);

        return res.status(201).json({
            success: true,
            result: { restaurant_id: newId },
        });
    } catch (err) {
        next(err);
    }
});

/**
 * PATCH /restaurants/:id
 * 레스토랑 부분 수정
 */
router.patch('/:id', async (req, res, next) => {
    try {
        const location = loc('PATCH /restaurants/:id');
        const rawId = req.params.id;
        const id = parseNumber(rawId, 'id', {
            location,
            integer: true,
            positive: true,
        });

        const body = req.body || {};
        const {
            name,
            kakao_place_id,
            region_code,
            food_tag_code,
            main_food,
            phone,
            address,
            longitude,
            latitude,
            is_published,
            data_status,
        } = body;

        /** @type {UpdatePayload} */
        const payload = {};
        
        if ('name' in body)            payload.name = name ?? null;
        if ('kakao_place_id' in body)  payload.kakao_place_id = kakao_place_id ?? null;
        if ('region_code' in body)     payload.region_code = region_code ?? null;
        if ('food_tag_code' in body)   payload.food_tag_code = food_tag_code ?? null;
        if ('main_food' in body)       payload.main_food = main_food ?? null;
        if ('phone' in body)           payload.phone = phone ?? null;
        if ('address' in body)         payload.address = address ?? null;
        if ('longitude' in body) {
            const longitude = parseNumber(longitude, 'longitude', {nullable: true, location, data: longitude});
            if (longitude) payload.longitude = longitude;
        }
        if ('latitude' in body) {
            const latitude = parseNumber(latitude, 'latitude', {nullable: true, location, data: latitude});
            if (latitude) payload.latitude = latitude;
        }
        if ('is_published' in body)   payload.is_published = Boolean(is_published);
        if ('data_status' in body)    payload.data_status = data_status ?? null;

        await updateRestaurant(id, payload);

        return res.json({
            success: true,
            result: { restaurant_id: id },
        });
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /restaurants/:id
 * 레스토랑 삭제
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const location = loc('DELETE /restaurants/:id');
        const rawId = req.params.id;
        const id = parseNumber(rawId, 'id', {
            location,
            integer: true,
            positive: true,
        });

        await deleteRestaurant(id);

        return res.json({
            success: true,
            result: { restaurant_id: id },
        });
    } catch (err) {
        next(err);
    }
});




router.put('/:id/tags', async (req, res, next) => {
    try {
        const location = loc('PUT /restaurants/:id/tags');
        const rawId = req.params.id;
        const id = parseNumber(rawId, 'id', {
            location,
            integer: true,
            positive: true,
        });

        const tags = Array.isArray(req.body.tags) ? req.body.tags : [];
        return res.json({
            success: true,
            result: { restaurant_id: id },
        });
    } catch (err) {
        next(err);
    }
});
router.delete('/:id/tags/:tagCode', async (req, res, next) => {
    try {
        const location = loc('DELETE /:id/tags/:tagCode');
        const rawId = req.params.id;
        const id = parseNumber(rawId, 'id', {
            location,
            integer: true,
            positive: true,
        });

        const tags = Array.isArray(req.body.tags) ? req.body.tags : [];
        return res.json({
            success: true,
            result: { restaurant_id: id },
        });
    } catch (err) {
        next(err);
    }
});

router.patch('/:id/photos', async (req, res, next) => {
    try {
        const location = loc('PATCH /restaurants/:id/photos');
        const rawId = req.params.id;
        const id = parseNumber(rawId, 'id', {
            location,
            integer: true,
            positive: true,
        });

        return res.json({
            success: true,
            result: { restaurant_id: id },
        });
    } catch (err) {
        next(err);
    }
});

router.patch('/:id/broadcasts', async (req, res, next) => {
    try {
        const location = loc('PATCH /restaurants/:id/broadcasts');
        const rawId = req.params.id;
        const id = parseNumber(rawId, 'id', {
            location,
            integer: true,
            positive: true,
        });

        return res.json({
            success: true,
            result: { restaurant_id: id },
        });
    } catch (err) {
        next(err);
    }
});



export default router;