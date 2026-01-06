// routes/admin/reviewRouter.js
import express from 'express';
import * as reviewController from '../../controllers/reviewController.js';

const router = express.Router();

router.get('/', reviewController.adminList);
router.get('/:reviewId', reviewController.adminRead);
router.patch('/:reviewId/hide', reviewController.adminHide);
router.patch('/:reviewId/show', reviewController.adminShow);

export default router;
