// server/route/meRouter.js
import express from 'express';
import * as meController from '../controller/meController.js';
import * as inquiryController from '../controller/inquiryController.js'
import { uploaders } from '../middleware/upload.js';

const router = express.Router();

router.get('/', meController.read);
router.patch('/', uploaders.profile, meController.update);
router.delete('/', meController.destroy);

router.patch('/password', meController.password);
router.get('/inquiries', inquiryController.myList);
router.get('/inquiries/:inquiryId', inquiryController.myRead);
// router.get('/likes', meController.likes);
// router.get('/reviews', meController.reviews);

export default router;
