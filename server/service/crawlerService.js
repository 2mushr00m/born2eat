// server/service/crawlerService.js

import db from '../repository/db.js';
import TASTY_GUYS from './scraper/TASTY_GUYS.js';
import logger from '../common/logger.js';
import { makeLoc } from '../common/loc.js';
import { BasicError, NotFoundError } from '../common/error.js';
import { CRAWL_STATUS } from '../common/status.js';

/** @typedef {import('./crawlerType.js').Scraper} Scraper */
/** @typedef {import('./crawlerType.js').CrawlParams} Params */
/** @typedef {import('./crawlerType.js').CrawlResult} Result */
/** @typedef {import('./crawlerType.js').ScrapRestaurant} Restaurant */

/** @type {Record<string, Scraper>} */
const SCRAPERS = {
    TASTY_GUYS,
};
const loc = makeLoc(import.meta.url);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * 방송 코드에 맞는 스크래퍼 조회 및 검증
 *
 * @param {string} broadcast_code
 * @returns {Scraper}
 */
function getScraper(broadcast_code) {
    const scraper = SCRAPERS[broadcast_code];
    
    if (!scraper)
        throw new BasicError(`스크래퍼를 찾을 수 없습니다.`, {
            code: 'SCRAPER_NOT_FOUND',
            status: 400,
            location: loc(getScraper),
            data: { broadcast_code },
        });

    if (typeof scraper.latestEpisode !== 'function' || typeof scraper.parseEpisode !== 'function')
        throw new BasicError(`스크래퍼 export 형식이 올바르지 않습니다.`, {
            code: 'SCRAPER_INVALID_EXPORTS',
            status: 500,
            location: loc(getScraper),
            data: { broadcast_code, exports: Object.keys(scraper) },
        });

    return scraper;
}

/**
 * broadcast_code → broadcast_id 조회
 *
 * @param {*} conn
 * @param {string} broadcast_code
 * @returns {Promise<number>}
 */
async function resolveBroadcastId(conn, broadcast_code) {
    const [rows] = await conn.execute(
        `SELECT broadcast_id
           FROM broadcast
          WHERE broadcast_code = :code
          LIMIT 1`,
        { code: broadcast_code },
    );

    if (rows.length === 0)
        throw new NotFoundError('DB에서 방송 정보를 찾을 수 없습니다.', {
            location: loc(resolveBroadcastId),
            data: { broadcast_code },
        });

    return rows[0].broadcast_id;
}

/**
 * 이미 존재하는 회차 여부 확인
 *
 * @param {*} conn
 * @param {number} broadcast_id
 * @param {number} episode_no
 * @returns {Promise<boolean>}
 */
async function isEpisodeExists(conn, broadcast_id, episode_no) {
    const [rows] = await conn.execute(
        `SELECT 1
           FROM broadcast_episode
          WHERE broadcast_id = :broadcast_id
            AND episode_no   = :ep
          LIMIT 1`,
        { broadcast_id, ep: episode_no },
    );
    return rows.length > 0;
}

/**
 * 크롤링된 식당 목록을 DB에 반영
 *
 * @param {*} conn
 * @param {Object} params
 * @param {number} params.broadcast_id
 * @param {number} params.episode_no
 * @param {Date|string|null} params.aired_at
 * @param {Restaurant[]} params.restaurants
 */
async function saveCrawlEpisode(conn, { broadcast_id, episode_no, aired_at, restaurants }) {
    // (1) 회차 메타 생성
    await conn.execute(
        `INSERT INTO broadcast_episode (broadcast_id, episode_no, aired_at)
         VALUES (:broadcast_id, :ep, :aired_at)`,
        {
            broadcast_id,
            ep: episode_no,
            aired_at,
        },
    );

    // (2) 식당 생성 및 방송 회차와 N:N 연결
    for (const r of restaurants) {
        const name = (r.name || '').trim();
        const address = (r.address || '').trim();
        const kakaoMapId = r.kakaoMapId ?? null;
        const menus = r.menus;

        // 이름이 없으면 건너뜀
        if (!name) continue;

        let restaurant_id = null;

        // 1-1) kakao_place_id로 1차 매칭
        if (kakaoMapId != null) {
            const [byKakao] = await conn.execute(
                `SELECT restaurant_id
                   FROM restaurant
                  WHERE kakao_place_id = :pid
                  LIMIT 1`,
                { pid: kakaoMapId },
            );
            if (byKakao.length > 0) restaurant_id = byKakao[0].restaurant_id;
        }

        // 1-2) kakao_place_id로 못 찾았으면, 매장명으로 매칭
        if (restaurant_id == null) {
            const [byName] = await conn.execute(
                `SELECT restaurant_id
                   FROM restaurant
                  WHERE name = :name
                  LIMIT 1`,
                { name },
            );
            if (byName.length > 0) restaurant_id = byName[0].restaurant_id;
        }

        // 2) 기존에 없으면 name, address, kakao_place_id로 새로 생성
        if (restaurant_id == null) {
            const [ins] = await conn.execute(
                `INSERT INTO restaurant (name, address, kakao_place_id, main_food)
                 VALUES (:name, :address, :kakao_place_id, :main_food)`,
                {
                    name,
                    address: address || null,
                    kakao_place_id: kakaoMapId,
                    main_food: menus.length > 0 ? menus[0] : null, 
                },
            );
            restaurant_id = ins.insertId;
        }

        // 3) 음식점-방송 출연 테이블 연결
        await conn.execute(
            `INSERT INTO broadcast_restaurant (restaurant_id, broadcast_id, episode_no)
             VALUES (:restaurant_id, :broadcast_id, :ep)
             ON DUPLICATE KEY UPDATE episode_no = episode_no`,
            { restaurant_id, broadcast_id, ep: episode_no },
        );
    }
}


/**
 * 방송 회차 크롤링 & DB 반영
 *
 * @param {CrawlParams} params
 * @returns {Promise<CrawlResult>}
 */
export default async function runCrawl({
    broadcast_code, episode_from, episode_to, delayMs = 1500,
}) {
    const scraper = getScraper(broadcast_code);
    const conn = await db.getConnection();

    // 1) broadcast_id 조회
    const broadcast_id = await resolveBroadcastId(conn, broadcast_code);

    // 2) 종료 회차 결정
    let toEp = episode_to;
    if (toEp == null)
        toEp = await scraper.latestEpisode();
    if (episode_from > toEp)
        throw new BasicError('시작 회차가 종료 회차보다 클 수 없습니다.', {
            code: 'INVALID_EPISODE_RANGE', status: 400, 
            location: loc(runCrawl),
            data: { broadcast_code, episode_from, episode_to: toEp },
        });

    // 3) 회차 루프
    const successEpisodes = [];
    const skippedEpisodes = [];
    const failedEpisodes = [];

    
    try {
        for (let ep = episode_from; ep <= toEp; ep += 1) {
            const loopLocation = `${loc(runCrawl)}.episode_${ep}`;

            try {
                // 3-1) 이미 수집된 회차면 SKIP
                if (await isEpisodeExists(conn, broadcast_id, ep)) {
                    skippedEpisodes.push(ep);
                    logger.log({
                        code: 'CRAWL_SKIP_EXISTS',
                        message: `${broadcast_code} ${ep}: 이미 존재하는 회차`,
                        location: loopLocation,
                    });
                    if (ep < toEp && delayMs > 0) await sleep(delayMs);
                    continue;
                }

                // 3-2) 크롤링 & 파싱
                const parsed = await scraper.parseEpisode(ep);
                if (parsed.status === CRAWL_STATUS.SKIP) {
                    skippedEpisodes.push(ep);
                    logger.warn({
                        code: 'CRAWL_SKIP',
                        message: `${broadcast_code} ${ep}: ${parsed.message || '에피소드 스킵'}`,
                        location: loopLocation,
                    });
                    if (ep < toEp && delayMs > 0) await sleep(delayMs);
                    continue;
                }

                // 3-3) 정상 경로: DB 트랜잭션
                else if (parsed.status === CRAWL_STATUS.SUCCESS) {
                    await conn.beginTransaction();
                    try {
                        await saveCrawlEpisode(conn, {
                            broadcast_id,
                            episode_no: ep,
                            aired_at: parsed.aired_at ?? null,
                            restaurants: parsed.restaurants,
                        });

                        await conn.commit();
                        successEpisodes.push(ep);
                        
                        logger.log({
                            code: 'CRAWL_SUCCESS',
                            message: `${broadcast_code} ${ep}: 크롤링/저장 성공 (식당 ${parsed.restaurants.length}개)`,
                        });
                    } catch (e) {
                        await conn.rollback();
                        failedEpisodes.push(ep);

                        logger.error({
                            code: 'CRAWL_DB_ERROR',
                            message: `${broadcast_code} ${ep}: DB 트랜잭션 처리 중 오류`,
                            location: loopLocation,
                            data: { error: e.message },
                        });
                    }

                }

                // 3-4) 비정상 경로
                else throw new BasicError('알 수 없는 크롤 상태입니다.', {
                        code: 'CRAWL_INVALID_STATUS',
                        status: 500,
                        location: loopLocation,
                        data: { status: parsed.status, ep },
                    });

                if (ep < toEp && delayMs > 0) await sleep(delayMs);
            } catch (err) {
                failedEpisodes.push(ep);

                logger.error({
                    code: 'CRAWL_EPISODE_ERROR',
                    message: `${broadcast_code} ${ep}: 에피소드 크롤링 중 예외 발생`,
                    location: loopLocation,
                    data: {
                        errCode: err.code,
                        errStatus: err.status,
                        errMessage: err.message,
                    },
                });

                if (ep < toEp && delayMs > 0) await sleep(delayMs);
            }
        }
    } finally {
        conn.release();
    }

    const result = {
        broadcast_code,
        broadcast_id,
        from: episode_from,
        to: toEp,
        successEpisodes,
        skippedEpisodes,
        failedEpisodes,
    };

    logger.log({
        code: 'CRAWL_DONE',
        message: `${broadcast_code} 크롤링 완료`,
        location: loc(runCrawl),
        data: result,
    });
    return result;
}