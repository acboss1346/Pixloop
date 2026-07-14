import express from 'express';
import { createPost, getPosts, getPost, deletePost, updatePost } from '../controllers/postController.js';
import { likePost, unlikePost, addComment, getComments, savePost, unsavePost } from '../controllers/interactionController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.route('/')
  .get(protect, getPosts)
  .post(protect, upload.single('image'), createPost);

router.route('/:id')
  .get(protect, getPost)
  .delete(protect, deletePost)
  .put(protect, updatePost);

router.route('/:id/like')
  .post(protect, likePost)
  .delete(protect, unlikePost);

router.route('/:id/save')
  .post(protect, savePost)
  .delete(protect, unsavePost);

router.route('/:id/comments')
  .get(protect, getComments)
  .post(protect, addComment);

export default router;
