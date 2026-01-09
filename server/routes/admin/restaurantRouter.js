// routes/admin/restaurantRouter.js
import express from 'express';
import * as restaurantController from '../../controllers/restaurantController.js';
import { uploaders } from '../../middleware/upload.js';

const router = express.Router();

router.get('/', restaurantController.adminList);
router.post('/', restaurantController.create);
router.get('/:restaurantId', restaurantController.adminRead);
router.patch('/:restaurantId', restaurantController.update);
router.delete('/:restaurantId', restaurantController.destroy);

router.post('/sync-kakao', restaurantController.syncKakao);

// router.put('/:restaurantId/tags', restaurantController.putTags);
// router.delete('/:restaurantId/tags/:tagCode', restaurantController.deleteTag);
router.post('/:restaurantId/photos', uploaders.restaurant, restaurantController.createPhotos);
router.delete('/:restaurantId/photos/:photoId', restaurantController.destroyPhotos);
// router.patch('/:restaurantId/broadcasts', restaurantController.patchBroadcasts);

export default router;
