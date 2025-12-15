// server/common/http.js

import axios from 'axios';
import * as cheerio from 'cheerio';
import { ApiError } from './error.js';

/**
 * @typedef {Object} FetchHtmlOptions
 * @property {string} [location] - 에러 발생 위치 태그
 * @property {Object} [params]   - axios GET params (query string)
 */


/**
 * axios.get + cheerio.load 공통 함수
 *
 * - axios 에러를 ApiError로 변환해서 상위로 throw
 * - 호출하는 쪽에서는 try-catch 없이 그냥 await만 사용
 *
 * @param {string} url
 * @param {FetchHtmlOptions} [opts]
 * @returns {Promise<cheerio.CheerioAPI>}
 */
export async function fetchHtml(url, { location, params } = {}) {
    try {
        const res = await axios.get(url, { params });
        return cheerio.load(res.data);
    } catch (err) {
        throw new ApiError('외부 HTML 페이지 요청 중 오류가 발생했습니다.', {
            location,
            data: {
                url,
                params,
                axiosCode: err.code,
                status: err.response?.status,
            },
        });
    }
}