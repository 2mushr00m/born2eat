// routes/adminRouter.js
import express from 'express';
import adminRestaurantRouter from './admin/restaurantRouter.js';
import adminReviewRouter from './admin/reviewRouter.js';
import adminInquiryRouter from './admin/inquiryRouter.js';

const router = express.Router();

router.use('/restaurants', adminRestaurantRouter);
router.use('/reviews', adminReviewRouter);
router.use('/inquiries', adminInquiryRouter);

export default router;
