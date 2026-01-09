// routes/adminRouter.js
import express from 'express';
import adminUserRouter from './admin/userRouter.js';
import adminRestaurantRouter from './admin/restaurantRouter.js';
import adminReviewRouter from './admin/reviewRouter.js';
import adminInquiryRouter from './admin/inquiryRouter.js';
import adminTagRouter from './admin/tagRouter.js';

const router = express.Router();

router.use('/users', adminUserRouter);
router.use('/restaurants', adminRestaurantRouter);
router.use('/reviews', adminReviewRouter);
router.use('/inquiries', adminInquiryRouter);
router.use('/tags', adminTagRouter);

export default router;
