// controller/inquiryController.js
import { parseId } from '../common/check.js';
import { wrap, ok, created } from '../common/http.js';
import { buildListFilter, buildCreatePayload, buildAnswerPayload } from './request/inquiryRequest.js';
import { createInquiry, readInquiryList,
    readInquiryDetail, answerInquiry } from '../service/inquiryService.js';


/* ============== 사용자용 ============== */

/** POST /inquiries */
export const create = wrap(async (req, res) => {
    const userId = req.user?.userId ?? null;
    const payload = buildCreatePayload(req);
    const inquiryId = await createInquiry(userId, payload);
    created(res, { inquiryId });
});

/** GET /me/inquiries */
export const myList = wrap(async (req, res) => {
    const userId = req.user?.userId ?? null;
    const filter = buildListFilter(req, userId);
    const result = await readInquiryList(filter);
    ok(res, result);
});

/** GET /me/inquiries/:inquiryId */
export const myRead = wrap(async (req, res) => {
    const userId = req.user?.userId ?? null;
    const inquiryId = parseId(req.params?.inquiryId);
    const result = await readInquiryDetail(inquiryId, { userId });
    ok(res, result);
});


/* ============== 관리자용 ============== */

/** GET /admin/inquiries */
export const adminList = wrap(async (req, res) => {
    const filter = buildListFilter(req);
    const result = await readInquiryList(filter, { mode: 'ADMIN' });
    ok(res, result);
});

/** GET /admin/inquiries/:inquiryId */
export const adminRead = wrap(async (req, res) => {
    const inquiryId = parseId(req.params?.inquiryId);
    const result = await readInquiryDetail(inquiryId, { mode: 'ADMIN' });
    ok(res, result);
});

/** PATCH /admin/inquiries/:inquiryId */
export const adminAnswer = wrap(async (req, res) => {
    const actorId = req.user?.userId ?? null;
    const inquiryId = parseId(req.params?.inquiryId);
    const payload = buildAnswerPayload(req);
    await answerInquiry(inquiryId, payload, { actorId });
    ok(res, { inquiryId });
});
