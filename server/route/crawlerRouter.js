// server/route/crawlerRouter.js

import express from 'express';
import { makeLoc } from '../common/loc.js';
import { parseNumber, requireString } from '../common/check.js';
import crawlerService from '../service/crawlerService.js';

const router = express.Router();
const loc = makeLoc(import.meta.url);


/**
 * POST /crawler
 *
 * body:
 * {
 *   broadcast_code: 'TASTY_GUYS',
 *   episode_from: 1,
 *   episode_to: 50 | null
 * }
 */

router.post('/', async (req, res, next) => {
    try {
        const { broadcast_code, episode_from, episode_to } = req.body || {};

        requireString(broadcast_code, 'broadcast_code', {
            location: loc('POST /crawler'), data: { broadcast_code },
        })
        const from = parseNumber(episode_from, 'episode_from', {
            location: loc('POST /crawler'), positive: true, integer: true,
        });
        const to = parseNumber(episode_to, 'episode_to', {
            location: loc('POST /crawler'), nullable: true, positive: true, integer: true,
        });
        
        const result = await crawlerService({
            broadcast_code,
            episode_from: from,
            episode_to: to,
        });

        return res.json({
            success: true,
            result,
        });
    } catch (err) {
        next(err);
    }
});



export default router;