import express from 'express';
import { registerUser, loginUser, getMe, toggleNotifications, updateProfile, updateProfilePic, updateCoverPic, searchUsers, searchGlobal, getUserProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/notifications-settings', protect, toggleNotifications);
router.put('/profile', protect, updateProfile);
router.put('/profile-pic', protect, upload.single('avatar'), updateProfilePic);
router.put('/cover-pic', protect, upload.single('cover'), updateCoverPic);
router.get('/search-users', protect, searchUsers);
router.get('/search-all', protect, searchGlobal);
router.get('/user/:username', protect, getUserProfile);

export default router;
