// routes/tagRouter.js
import express from 'express';
import * as tagController from '../controllers/tagController.js';

const router = express.Router();

router.get('/', tagController.list);

export default router;
