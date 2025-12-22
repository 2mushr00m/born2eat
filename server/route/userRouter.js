// server/route/userRouter.js
import express from 'express';
import db from '../repository/db.js';

const router = express.Router();

router.get('/', (req, res) => {});
router.post('/', (req, res) => {});
router.get('/:userId', (req, res) => {});
router.patch('/:userId', (req, res) => {});
router.delete('/:userId', (req, res) => {});

export default router;
