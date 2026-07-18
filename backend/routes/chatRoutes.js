import express from 'express';
import { protect } from '../middleware/auth.js';
import { getChatMessages, sendChatMessage, getUnreadMessagesCount } from '../controllers/chatController.js';

const router = express.Router();

router.get('/unread/count', protect, getUnreadMessagesCount);

router.route('/:friendId')
  .get(protect, getChatMessages)
  .post(protect, sendChatMessage);

export default router;
