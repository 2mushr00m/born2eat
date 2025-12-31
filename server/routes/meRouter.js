// routes/meRouter.js
import express from 'express';
import * as meController from '../controllers/meController.js';
import * as inquiryController from '../controllers/inquiryController.js';
import * as reviewController from '../controllers/reviewController.js';
import * as restaurantController from '../controllers/restaurantController.js';
import { uploaders } from '../middleware/upload.js';

const router = express.Router();

router.get('/', meController.read);
router.patch('/', uploaders.profile, meController.update);
router.delete('/', meController.destroy);
router.patch('/password', meController.password);

router.get('/inquiries', inquiryController.myList);
router.get('/reviews', reviewController.myList);
router.get('/likes', restaurantController.likedList);

export default router;
