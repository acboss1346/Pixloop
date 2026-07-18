import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  sendFriendRequest,
  getFriends,
  getPendingRequests,
  acceptFriendRequest,
  removeFriendship
} from '../controllers/friendController.js';

const router = express.Router();

router.route('/')
  .get(protect, getFriends);

router.route('/requests')
  .get(protect, getPendingRequests);

router.route('/request')
  .post(protect, sendFriendRequest);

router.route('/request/:id/accept')
  .put(protect, acceptFriendRequest);

router.route('/request/:id')
  .delete(protect, removeFriendship);

export default router;
