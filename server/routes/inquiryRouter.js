// routes/inquiryRouter.js
import express from 'express';
import * as inquiryController from '../controllers/inquiryController.js';
import { uploaders } from '../middleware/upload.js';

const router = express.Router();

router.post('/', uploaders.inquiry, inquiryController.create);

export default router;
