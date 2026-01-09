import express from 'express';
import { sessionUser, requireAuth, requireAdmin } from '../../middleware/auth.js';
import * as userController from '../../controllers/userController.js';

const router = express.Router();

router.get('/', userController.getUsers); // adminList → getUsers
router.get('/:userId', userController.adminRead);
router.patch('/:userId', userController.adminUpdate);
router.delete('/:userId', userController.adminDestroy);

export default router;
