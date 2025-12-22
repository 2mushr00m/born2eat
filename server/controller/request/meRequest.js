// controller/request/meRequest.js
import { requireString } from '../../common/check.js';

/** @typedef {import('express').Request} Request */


/** 수정 payload
 * @param {Request} req
 * @returns {me.UpdatePayload} */
export function buildUpdatePayload(req) {
    const body = req?.body ?? {};

    /** @type {me.UpdatePayload} */
    const payload = {};

    if ('nickname' in body) payload.nickname = requireString(body.nickname).trim();
    if ('phone' in body) payload.phone = body.phone == null ? null : String(body.phone).trim();

    const uploaded = req?.file;
    if (uploaded) payload.profile_url = toFilePath(uploaded);
    else if ('profileUrl' in body) {
        const v = body.profile_url;
        payload.profileUrl = v == null ? null : String(v).trim();
    }
    
    return payload;
}
