// routes/restaurantRouter.js
import express from 'express';
import * as restaurantController from '../controllers/restaurantController.js';
import * as reviewController from '../controllers/reviewController.js';
import { requireAuth, blockSuspendedUser } from '../middleware/auth.js';
import { uploaders } from '../middleware/upload.js';

const router = express.Router();

router.get('/', restaurantController.list);
router.get('/:restaurantId', restaurantController.read);

router.get('/:restaurantId/reviews', reviewController.list);
router.post('/:restaurantId/reviews', requireAuth, blockSuspendedUser, uploaders.review, reviewController.create);

router.post('/:restaurantId/like', requireAuth, restaurantController.like);
router.delete('/:restaurantId/like', requireAuth, restaurantController.unlike);

export default router;
