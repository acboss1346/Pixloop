import express from 'express';
import { protect } from '../middleware/auth.js';
import { getChatMessages, sendChatMessage } from '../controllers/chatController.js';

const router = express.Router();

router.route('/:friendId')
  .get(protect, getChatMessages)
  .post(protect, sendChatMessage);

export default router;
