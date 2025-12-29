// routes/admin/reviewRouter.js
import express from 'express';
import * as reviewController from '../../controllers/reviewController.js';

const router = express.Router();

router.get('/', reviewController.adminList);
router.patch('/:revieId/hide', reviewController.adminHide);
router.patch('/:revieId/show', reviewController.adminShow);

export default router;
