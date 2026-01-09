// routes/reviewRouter.js
import express from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { blockSuspendedUser } from '../middleware/auth.js';
import { uploaders } from '../middleware/upload.js';

const router = express.Router();

router.patch('/:reviewId', blockSuspendedUser, uploaders.review, reviewController.update);
router.delete('/:reviewId', reviewController.destroy);

router.post('/:reviewId/like', reviewController.like);
router.delete('/:reviewId/like', reviewController.unlike);

export default router;
