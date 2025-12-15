import express from 'express';
import db from '../repository/db.js';
import { parseNumber, requireString } from '../common/check.js';
import { makeLoc } from '../common/loc.js';

const router = express.Router();
const loc = makeLoc(import.meta.url);


router.get('/', async (req, res, next) => {
    try {
        const location = loc('GET /regions')
        const { depth, parent_code } = req.query;

        const params = {};
        const where = [];

        if (depth != null) {
            where.push('depth = :depth');
            params.depth = parseNumber(depth, 'depth', {positive: true, max: 3, min: 1});
        }
        if (parent_code != null) {
            where.push('parent_code = :parent_code');
            requireString(parent_code, 'parent_code', {location});
            params.parent_code = String(parent_code);
        }

        const sql = `
            SELECT region_code, name, depth, parent_code
              FROM region
             ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
             ORDER BY name
        `;

        const conn = await db.getConnection();
        const [rows] = await conn.execute(sql, params);
        conn.release();

        return res.json({ 
            success: true,
            result: rows 
        });
    } catch (err) {
        next(err);
    }
});


export default router;