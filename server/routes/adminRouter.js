// routes/adminRouter.js
import express from 'express';
import adminRestaurantRouter from './admin/restaurantRouter.js';

const router = express.Router();

router.use('/restaurants', adminRestaurantRouter);

export default router;
