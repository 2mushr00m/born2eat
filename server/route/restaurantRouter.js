// server/route/restaurantRouter.js
import express from 'express';
import * as restaurantController from '../controller/restaurantController.js';

const router = express.Router();

router.get('/', restaurantController.list);
router.get('/:restaurantId', restaurantController.read);

export default router;
