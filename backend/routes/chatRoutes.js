import express from 'express';
import { protect } from '../middleware/auth.js';
import { 
  getChatMessages, 
  sendChatMessage, 
  getUnreadMessagesCount, 
  editMessage, 
  deleteMessage, 
  addReaction,
  getConversations 
} from '../controllers/chatController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/unread/count', protect, getUnreadMessagesCount);
router.get('/conversations', protect, getConversations);

router.route('/:friendId')
  .get(protect, getChatMessages)
  .post(protect, upload.single('attachment'), sendChatMessage);

router.put('/message/:messageId', protect, editMessage);
router.delete('/message/:messageId', protect, deleteMessage);
router.post('/message/:messageId/react', protect, addReaction);

export default router;
