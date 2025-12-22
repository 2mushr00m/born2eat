// route/admin/restaurantRouter.js
import express from 'express';
import * as restaurantController from '../../controller/restaurantController.js';

const router = express.Router();

router.get('/', restaurantController.adminList);
router.post('/', restaurantController.adminCreate);
router.get('/:restaurantId', restaurantController.adminRead);
router.patch('/:restaurantId', restaurantController.adminUpdate);
router.delete('/:restaurantId', restaurantController.adminDestroy);

router.put('/:restaurantId/tags', restaurantController.putTags);
router.delete('/:restaurantId/tags/:tagCode', restaurantController.deleteTag);
router.patch('/:restaurantId/photos', restaurantController.patchPhotos);
router.patch('/:restaurantId/broadcasts', restaurantController.patchBroadcasts);

export default router;
