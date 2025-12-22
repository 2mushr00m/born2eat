// route/admin/inquiryRouter.js
import express from 'express';
import * as inquiryController from '../../controller/inquiryController.js'

const router = express.Router();

router.get('/', inquiryController.adminList);
router.get('/:inquiryId', inquiryController.adminRead);
router.patch('/:inquiryId', inquiryController.adminAnswer);

export default router;
