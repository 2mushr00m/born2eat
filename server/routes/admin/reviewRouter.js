// routes/admin/reviewRouter.js
import express from 'express';
import * as reviewController from '../controller/reviewController.js';

const router = express.Router();

router.get('/', reviewController.adminList);
router.delete('/:revieId', reviewController.adminHide);
// router.patch('/:revieId',  reviewController.adminUpdate); // 필요 시

export default router;
