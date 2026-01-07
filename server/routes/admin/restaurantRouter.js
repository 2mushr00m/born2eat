// routes/admin/restaurantRouter.js
import express from 'express';
import * as restaurantController from '../../controllers/restaurantController.js';
import { uploaders } from '../../middleware/upload.js';

const router = express.Router();

router.get('/', restaurantController.adminList);
router.post('/', restaurantController.adminCreate);
router.get('/:restaurantId', restaurantController.adminRead);
router.patch('/:restaurantId', restaurantController.adminUpdate);
router.delete('/:restaurantId', restaurantController.adminDestroy);

router.post('/sync-kakao', restaurantController.adminSyncKakao);

// router.put('/:restaurantId/tags', restaurantController.putTags);
// router.delete('/:restaurantId/tags/:tagCode', restaurantController.deleteTag);
router.post('/:restaurantId/photos', uploaders.restaurant, restaurantController.adminCreatePhotos);
router.delete('/:restaurantId/photos/:photoId', restaurantController.adminDestroyPhotos);
// router.patch('/:restaurantId/broadcasts', restaurantController.patchBroadcasts);

export default router;
