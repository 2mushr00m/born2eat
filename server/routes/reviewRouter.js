// routes/reviewRouter.js
import express from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { blockSuspendedUser } from '../middleware/auth.js';

const router = express.Router();

router.patch('/:reviewId', blockSuspendedUser, reviewController.update);
router.delete('/:reviewId', reviewController.destroy);

export default router;
