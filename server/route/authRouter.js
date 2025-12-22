// server/route/authRouter.js
import express from 'express';
import * as authController from '../controller/authController.js';

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

export default router;
