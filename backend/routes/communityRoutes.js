import express from 'express';
import { 
  getCommunities, 
  getTrendingHashtags, 
  joinCommunity, 
  createCommunity, 
  getCommunityById, 
  deleteCommunity, 
  updateCommunity,
  getCommunityMessages,
  sendCommunityMessage
} from '../controllers/communityController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Protected routes
router.get('/', protect, getCommunities);
router.get('/trending/hashtags', getTrendingHashtags);
router.post('/', protect, upload.single('logo'), createCommunity);
router.get('/:id', protect, getCommunityById);
router.post('/:id/join', protect, joinCommunity);
router.delete('/:id', protect, deleteCommunity);
router.put('/:id', protect, upload.single('logo'), updateCommunity);

// Group Chat routes
router.route('/:id/chat')
  .get(protect, getCommunityMessages)
  .post(protect, sendCommunityMessage);

export default router;
