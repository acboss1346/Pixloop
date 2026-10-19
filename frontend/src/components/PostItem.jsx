import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Bookmark, MoreVertical, Edit2, Share2, Flag, Trash2, Check, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CommentSection } from "./CommentSection";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { parseSafeDate } from "../utils/date";
import "./PostItem.css";

export const PostItem = ({ post: initialPost, onLikeToggle, onSaveToggle, onDelete }) => {
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);
  const { user } = useAuth();
  const toast = useToast();

  // Sync state if initialPost changes
  if (
    initialPost.id !== post.id ||
    initialPost.like_count !== post.like_count ||
    initialPost.is_liked !== post.is_liked ||
    initialPost.is_saved !== post.is_saved ||
    initialPost.comment_count !== post.comment_count
  ) {
    setPost(initialPost);
    setEditedCaption(initialPost.caption || "");
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editedCaption.trim()) return;
    setSavingEdit(true);
    try {
      const res = await api.put(`/posts/${post.id}`, { caption: editedCaption });
      setPost(res.data);
      setIsEditing(false);
      toast.success("Caption updated!");
    } catch (err) {
      console.error("Failed to edit post caption", err);
      toast.error("Failed to update caption");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLikeClick = async () => {
    const isLiked = post.is_liked;
    setPost({
      ...post,
      is_liked: !isLiked,
      like_count: isLiked ? Math.max(0, post.like_count - 1) : post.like_count + 1
    });

    if (!isLiked) {
      setLikeAnimation(true);
      setTimeout(() => setLikeAnimation(false), 800);
    }

    if (onLikeToggle) {
      await onLikeToggle();
    }
  };

  const handleDoubleClick = () => {
    if (!post.is_liked) {
      handleLikeClick();
    } else {
      setLikeAnimation(true);
      setTimeout(() => setLikeAnimation(false), 800);
    }
  };

  const handleSaveClick = async () => {
    const isSaved = post.is_saved;
    setPost({
      ...post,
      is_saved: !isSaved,
      save_count: isSaved ? Math.max(0, (post.save_count || 0) - 1) : (post.save_count || 0) + 1
    });
    toast.info(isSaved ? "Post removed from saved" : "Post saved to your collection");

    if (onSaveToggle) {
      await onSaveToggle();
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.username} on PixLoop`,
          text: post.caption || "Check out this post on PixLoop!",
          url: postUrl
        });
        return;
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(err);
        }
      }
    }

    navigator.clipboard.writeText(postUrl);
    toast.success("Link copied to clipboard!");
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await api.delete(`/posts/${post.id}`);
      toast.success("Post deleted successfully");
      setShowMenu(false);
      if (onDelete) {
        onDelete(post.id);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete post");
    }
  };

  const handleReport = () => {
    setShowMenu(false);
    toast.info("Thank you. This post has been reported for review.");
  };

  return (
    <div className="post-card relative">
      {/* Header */}
      <div className="post-header">
        <div className="post-user-info">
          <Link to={`/profile/${post.username}`} className="post-avatar-link">
            {post.profile_pic ? (
              <img src={post.profile_pic} alt={post.username} className="post-avatar-img" />
            ) : (
              <div className="post-avatar-placeholder">
                {post.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          <div className="post-user-meta">
            <Link to={`/profile/${post.username}`} className="post-username">
              {post.username}
            </Link>
            <span className="post-time">
              {post.created_at ? formatDistanceToNow(parseSafeDate(post.created_at), { addSuffix: true }) : "recently"}
            </span>
          </div>
        </div>

        <div className="post-menu-wrapper relative">
          <button 
            className="post-menu-btn" 
            title="More options"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <div className="post-dropdown-menu absolute right-0 mt-2 w-44 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl p-1 z-30 animate-fadeIn">
              <button 
                className="dropdown-item w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg cursor-pointer bg-transparent border-none text-left"
                onClick={handleShare}
              >
                <Copy size={14} />
                Copy Link
              </button>

              <button 
                className="dropdown-item w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg cursor-pointer bg-transparent border-none text-left"
                onClick={handleReport}
              >
                <Flag size={14} />
                Report Post
              </button>

              {user && (user.username === post.username || user.id === post.user_id) && (
                <>
                  <button 
                    className="dropdown-item edit-item w-full flex items-center gap-2 px-3 py-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-zinc-800/60 rounded-lg cursor-pointer bg-transparent border-none text-left"
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                  >
                    <Edit2 size={14} />
                    Edit Caption
                  </button>
                  <button 
                    className="dropdown-item delete-item w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg cursor-pointer bg-transparent border-none text-left"
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} />
                    Delete Post
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image with double-tap heart animation */}
      <div className="post-image-container relative select-none" onDoubleClick={handleDoubleClick}>
        <img 
          src={post.image_url} 
          alt={post.caption || "PixLoop post"}
          className="post-image w-full object-cover"
          loading="lazy"
        />
        {likeAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
            <Heart size={80} fill="#ef4444" color="#ef4444" className="drop-shadow-2xl opacity-90" />
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="post-actions-bar flex items-center gap-4 px-4 py-3">
        <button 
          onClick={handleLikeClick}
          className={`post-action-btn like-btn flex items-center justify-center transition-transform hover:scale-110 cursor-pointer bg-transparent border-none p-0 ${post.is_liked ? 'active' : ''}`}
          title={post.is_liked ? 'Unlike' : 'Like'}
        >
          <Heart size={23} fill={post.is_liked ? "#ef4444" : "none"} color={post.is_liked ? "#ef4444" : "#ffffff"} />
        </button>

        <button 
          onClick={() => setShowComments(!showComments)}
          className="post-action-btn comment-btn flex items-center justify-center transition-transform hover:scale-110 cursor-pointer bg-transparent border-none p-0 text-white"
          title="Comment"
        >
          <MessageCircle size={23} />
        </button>

        <button 
          onClick={handleShare}
          className="post-action-btn share-btn flex items-center justify-center transition-transform hover:scale-110 cursor-pointer bg-transparent border-none p-0 text-zinc-300 hover:text-white"
          title="Share"
        >
          <Share2 size={22} />
        </button>

        <button 
          onClick={handleSaveClick}
          className={`post-action-btn save-btn ml-auto flex items-center justify-center transition-transform hover:scale-110 cursor-pointer bg-transparent border-none p-0 ${post.is_saved ? 'active' : ''}`}
          title={post.is_saved ? 'Unsave' : 'Save'}
        >
          <Bookmark size={23} fill={post.is_saved ? "#ffffff" : "none"} color="#ffffff" />
        </button>
      </div>

      {/* Engagement Stats */}
      <div className="post-engagement-info px-4 mb-2">
        <p className="like-count-display font-bold text-xs text-zinc-200 m-0">
          {post.like_count || 0} {post.like_count === 1 ? 'like' : 'likes'}
        </p>
      </div>

      {/* Caption / Editing Content */}
      <div className="post-caption-section px-4 pb-2">
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="edit-caption-form space-y-2">
            <textarea
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-500 resize-none"
              rows={2}
              required
            />
            <div className="edit-caption-actions flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)} 
                className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-300 hover:text-white border-none cursor-pointer"
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-3 py-1.5 rounded-lg text-xs bg-purple-600 hover:bg-purple-500 font-bold text-white border-none cursor-pointer"
                disabled={savingEdit || !editedCaption.trim()}
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <p className="caption-text-content text-xs sm:text-sm text-zinc-300 leading-relaxed m-0">
            <Link to={`/profile/${post.username}`} className="caption-owner-username font-bold text-white mr-2 hover:text-purple-400 text-decoration-none">
              {post.username}
            </Link>
            <span className="caption-body">{post.caption}</span>
          </p>
        )}
      </div>

      {/* Comments Trigger link */}
      {post.comment_count > 0 && !showComments && (
        <div className="px-4 pb-3">
          <button 
            onClick={() => setShowComments(true)}
            className="view-comments-btn text-xs text-zinc-500 hover:text-zinc-400 bg-transparent border-none cursor-pointer p-0 font-medium"
          >
            View all {post.comment_count} comments
          </button>
        </div>
      )}

      {/* Comments Section Drawer Inline */}
      {showComments && (
        <div className="post-comments-wrapper border-t border-zinc-900/60 p-4">
          <CommentSection postId={post.id} />
        </div>
      )}
    </div>
  );
};
