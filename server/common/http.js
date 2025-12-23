// common/http.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { AppError, ERR } from './error.js';

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').NextFunction} NextFunction */
/** @typedef {import('express').RequestHandler} RequestHandler */

/**
 * @param {(req: Request, res: Response, next: NextFunction) => any | Promise<any>} handler
 * @returns {RequestHandler}
 */
export const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export const ok = (res, result) => res.json({ success: true, result });
export const created = (res, result) => res.status(201).json({ success: true, result });

/** axios.get + cheerio.load 공통 함수
 *
 * @param {string} url
 * @param {{ params?: Object }} [opts]  // axios GET params (query string)
 * @returns {Promise<cheerio.CheerioAPI>}
 * @throws {AppError}
 */
export async function fetchHtml(url, { params } = {}) {
  try {
    const res = await axios.get(url, { params });
    return cheerio.load(res.data);
  } catch (err) {
    throw new AppError(ERR.EXTERNAL_API, {
      message: '외부 HTML 페이지 요청 중 오류가 발생했습니다.',
      data: {
        apiUrl: err?.config?.url || url,
        apiCode: err?.code,
        apiStatus: err?.response?.status,
        extra: { params },
      },
      cause: err,
    });
  }
}
