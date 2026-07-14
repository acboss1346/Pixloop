import express from 'express';
import { registerUser, loginUser, getMe, toggleNotifications, updateProfile, updateProfilePic, searchUsers, getUserProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/notifications-settings', protect, toggleNotifications);
router.put('/profile', protect, updateProfile);
router.put('/profile-pic', protect, upload.single('avatar'), updateProfilePic);
router.get('/search-users', protect, searchUsers);
router.get('/user/:username', protect, getUserProfile);

export default router;
