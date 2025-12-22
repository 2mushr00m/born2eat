// controller/request/inquiryRequest.js
import { requireString, parseNumber } from '../../common/check.js';
import { INQUIRY_TYPE } from '../../common/constants.js';
import { toFilePath } from '../../middleware/upload.js';

/** @typedef {import('express').Request} Request */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;


/** 목록 조회 filter
 * @param {Request} req
 * @param {number} [userId] 
 * @returns {inquiry.ListFilter} */
export function buildListFilter(req, userId) {
    const query = req.query || {};
    
    const page = parseNumber(query.page, 'page', {
        integer: true, positive: true, nullable: true, autoFix: true,
    }) ?? DEFAULT_PAGE;

    const limit = parseNumber(query.limit, 'limit', {
        integer: true, positive: true, nullable: true, autoFix: true, max: MAX_LIMIT,
    }) ?? DEFAULT_LIMIT;

    /** @type {inquiry.ListFilter} */
    const filter = { page, limit };
    
    if (query.status != null) {
        const s = String(query.status).trim();
        if (Object.values(INQUIRY_STATUS).includes(s)) filter.status = s;
    }

    if (userId) filter.userId = userId;
    
    const q = query.q == null ? '' : String(query.q).trim();
    if (q) filter.q = q;
    
    return filter;
}

/** 생성 payload
 * @param {Request} req
 * @returns {inquiry.CreatePayload} */
export function buildCreatePayload(req) {
    const body = req?.body ?? {};

    const type = requireString(body.type, 'type').trim();
    if (!Object.values(INQUIRY_TYPE).includes(type))
        throw new AppError(ERR.BAD_REQUEST, {
            message: '유효하지 않은 문의 유형입니다.',
            data: { keys: ['type'], extra: { type } },
        });

    /** @type {inquiry.CreatePayload} */
    const payload = {
        type,
        title: requireString(body.title, 'title').trim(),
        content: requireString(body.content, 'content').trim(),
    };

    const files = [];
    if (req?.file) files.push(req.file);
    if (req?.files) {
        if (Array.isArray(req.files)) files.push(...req.files);
        else for (const arr of Object.values(req.files)) files.push(...(arr || []));
    }

    if (files.length) {
        const filePaths = [...new Set(files.map((f) => toFilePath(f)).filter(Boolean))];
        if (filePaths.length) payload.filePaths = filePaths;
    }

    return payload;
}

/** 답변 payload
 * @param {Request} req
 * @returns {inquiry.AnswerPayload} */
export function buildAnswerPayload(req) {
    const body = req?.body ?? {};
    
    /** @type {inquiry.AnswerPayload} */
    const payload = {
        answer: requireString(body.answer, 'answer').trim()
    };
    
    return payload;
}
