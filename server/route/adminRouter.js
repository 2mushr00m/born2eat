// router/adminRouter.js
import { Router } from 'express';
// import { requireAdmin } from '../middleware/auth.js';
// import adminRestaurantRouter from './adminRestaurantRouter.js';

const router = Router();

// 이 아래 전체에 관리자 권한 필요
// adminRouter.use(requireAdmin);
// adminRouter.use('/restaurants', adminRestaurantRouter);

export default router;
