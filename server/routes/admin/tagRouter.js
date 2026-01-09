// routes/admin/tagRouter.js
import express from 'express';
import * as tagController from '../../controllers/tagController.js';

const router = express.Router();

router.get('/', tagController.adminList);
router.post('/', tagController.create);
router.patch('/:tagId', tagController.update);
router.delete('/:tagId', tagController.destroy);

export default router;
