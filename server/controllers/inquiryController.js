// controllers/inquiryController.js
import { wrap, ok, created } from '../common/http.js';
import { parseId } from '../common/check.js';
import {
  buildMyListFilter,
  buildAdminListFilter,
  buildCreatePayload,
  buildAnswerPayload,
} from './requests/inquiryRequest.js';
import { createInquiry, readInquiryList, readInquiry, answerInquiry } from '../services/inquiryService.js';

/* ============== PUBLIC ============== */

/** POST /inquiries */
export const create = wrap(async (req, res) => {
  const userId = req.user?.userId ?? null;
  const payload = buildCreatePayload(req);
  const inquiryId = await createInquiry(userId, payload);
  created(res, { id: inquiryId });
});

/* ============== USER ============== */

/** GET /me/inquiries */
export const myList = wrap(async (req, res) => {
  const filter = buildMyListFilter(req);
  const result = await readInquiryList(filter, { mode: 'ME' });
  ok(res, result);
});

/* ============== ADMIN ============== */

/** GET /admin/inquiries */
export const adminList = wrap(async (req, res) => {
  const filter = buildAdminListFilter(req);
  const result = await readInquiryList(filter, { mode: 'ADMIN' });
  ok(res, result);
});

/** GET /admin/inquiries/:inquiryId */
export const adminRead = wrap(async (req, res) => {
  const inquiryId = parseId(req.params?.inquiryId);
  const result = await readInquiry(inquiryId, { mode: 'ADMIN' });
  ok(res, result);
});

/** PATCH /admin/inquiries/:inquiryId */
export const adminAnswer = wrap(async (req, res) => {
  const actorId = req.user?.userId ?? null;
  const inquiryId = parseId(req.params?.inquiryId);
  const payload = buildAnswerPayload(req);
  await answerInquiry(inquiryId, payload, { actorId });
  ok(res, { id: inquiryId });
});
