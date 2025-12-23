// server/service/scrapers/TASTY_GUYS.js

import { fetchHtml } from '../../common/http.js';
import { BasicError } from '../../common/error.js';
import { parseNumber } from '../../common/check.js';
import { CRAWL_STATUS } from '../../common/constants.js';
import { makeLoc } from '../../common/loc.js';

/** @typedef {import('../../model/crawlerType.js').Scraper} Scraper */
/** @typedef {import('../../model/crawlerType.js').ScrapResult} Result */
/** @typedef {import('../../model/crawlerType.js').ScrapRestaurant} Restaurant */

const BASE_URL = 'https://ihq.co.kr/channel/program/tip/?p_id=235';
const loc = makeLoc(import.meta.url);

function getParserVersion(episode_no) {
  // parser 버전 결정
  if (episode_no <= 468) return 1;
  return 2;
}
function getEpisode($) {
  // 에피소드 번호 추출
  // 1) tab_btn_single 중 첫 번째 회차
  const $ep = $('.tab_btn .tab_btn_inner .tab_btn_single').first();
  if ($ep.length === 0)
    throw new BasicError('TASTY_GUYS 회차 정보를 찾을 수 없습니다.', {
      code: 'EPISODE_NOT_FOUND',
      status: 502,
      location: loc(getEpisode),
    });

  // 2) "541회\nTHE맛있는녀석들" 형태를 변환
  const fullText = $ep.find('a').first().text().trim();
  const firstLine = fullText.split('\n')[0].trim();

  // 3) 숫자만 추출
  const match = firstLine.match(/(\d+)/);
  const ep = parseNumber(match?.[1], 'episode', {
    location: loc(getEpisode),
    integer: true,
    positive: true,
    code: 'EPISODE_NOT_FOUND',
    status: 502,
  });

  return ep;
}

/**
 * parser_ver 1: 이미지 기반
 *
 * @param {*} $   cheerio root
 * @param {Result} ret
 * @returns {Result}
 */
function parseVersion1($, ret) {
  ret.status = CRAWL_STATUS.SKIP;
  ret.message = '기능이 미구현 상태입니다. (이미지 기반)';
  return ret;
}

/**
 * parser_ver 2: HTML 기반
 *
 * @param {*} $   cheerio root
 * @param {Result} ret
 * @returns {Result}
 */
function parseVersion2($, ret) {
  /** @type {Restaurant[]} */
  const restaurants = [];

  $('.content_area .content_area_inner p').each((_, el) => {
    const $p = $(el);
    const rawText = $p.text().trim();
    if (!rawText) return;
    if (!rawText.includes('식당')) return;

    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    /** @type {Restaurant} */
    const restaurant = {
      name: null,
      address: null,
      kakaoMapId: null,
      menus: [],
    };

    for (const line of lines) {
      if (line.startsWith('식당')) {
        const mAngle = line.match(/식당\s*\d*\s*<([^>]+)>/);
        if (mAngle && mAngle[1]) {
          restaurant.name = mAngle[1].trim();
          continue;
        }
        const mColon = line.match(/식당\s*\d*\s*:\s*(.+)$/);
        if (mColon && mColon[1]) {
          restaurant.name = mColon[1].trim();
          continue;
        }
      } else if (/^주소\s*:/.test(line)) {
        restaurant.address = line.replace(/^주소\s*:\s*/, '').trim();
      } else if (/^\s*(대표\s*메뉴|주요\s*메뉴)\s*:/.test(line)) {
        const menuStr = line.replace(/^\s*(대표\s*메뉴|주요\s*메뉴)\s*:\s*/, '').trim();

        let menus = [];

        if (menuStr.includes(',')) {
          menus = menuStr.split(',');
        } else if (menuStr) {
          menus = [menuStr];
        }

        restaurant.menus = menus.map((m) => m.replace(/\s+등등?$/, '').trim()).filter(Boolean);
      } else if (/^링크\s*:/.test(line)) {
        const mId = line.match(/place\.map\.kakao\.com\/(\d+)/);
        if (mId && mId[1]) {
          restaurant.kakaoMapId = mId[1];
        }
      }
    }

    if (!restaurant.name) return;
    restaurants.push(restaurant);
  });

  if (restaurants.length === 0) {
    ret.status = CRAWL_STATUS.SKIP;
    ret.message = '식당 정보를 찾지 못했습니다.';
    return ret;
  }

  ret.status = CRAWL_STATUS.SUCCESS;
  ret.restaurants = restaurants;
  return ret;
}

/** @type {Scraper} */
const TASTY_GUYS = {
  async latestEpisode() {
    return getEpisode(await fetchHtml(BASE_URL, { location: loc('latestEpisode') }));
  },
  async parseEpisode(episode_no) {
    const crawl_url = `${BASE_URL}&s_no=${episode_no}`;
    const parser_ver = getParserVersion(episode_no);

    /** @type {Result} */
    const ret = {
      parser_ver,
      episode_no,
      crawl_url,
      status: null,
      message: null,
      restaurants: [],
      aired_at: null,
    };

    const $ = await fetchHtml(crawl_url, { location: loc('parseEpisode') });
    if (getEpisode($) !== episode_no) {
      ret.status = CRAWL_STATUS.SKIP;
      ret.message = '해당 회차를 찾지 못했습니다.';
      return ret;
    }

    switch (parser_ver) {
      case 1:
        return parseVersion1($, ret);
      case 2:
      default:
        return parseVersion2($, ret);
    }
  },
};

export default TASTY_GUYS;
