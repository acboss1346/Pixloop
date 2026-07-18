import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Bookmark, MoreVertical, Edit2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CommentSection } from "./CommentSection";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { parseSafeDate } from "../utils/date";
import "./PostItem.css";

export const PostItem = ({ post: initialPost, onLikeToggle, onSaveToggle }) => {
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const { user } = useAuth();

  // Sync state if initialPost changes
  if (initialPost.id !== post.id || initialPost.like_count !== post.like_count || initialPost.is_liked !== post.is_liked || initialPost.is_saved !== post.is_saved || initialPost.comment_count !== post.comment_count) {
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
    } catch (err) {
      console.error("Failed to edit post caption", err);
      alert("Failed to update caption");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLikeClick = async () => {
    // Optimistic UI updates
    const isLiked = post.is_liked;
    setPost({
      ...post,
      is_liked: !isLiked,
      like_count: isLiked ? post.like_count - 1 : post.like_count + 1
    });
    
    // Call parent handler
    if (onLikeToggle) {
      await onLikeToggle();
    }
  };

  const handleSaveClick = async () => {
    const isSaved = post.is_saved;
    setPost({
      ...post,
      is_saved: !isSaved
    });
    
    if (onSaveToggle) {
      await onSaveToggle();
    }
  };

  return (
    <div className="post-card">
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
              {formatDistanceToNow(parseSafeDate(post.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        
        <div className="post-menu-wrapper">
          <button 
            className="post-menu-btn" 
            title="More options"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={18} />
          </button>
          
          {showMenu && (
            <div className="post-dropdown-menu">
              <button 
                className="dropdown-item"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                  setShowMenu(false);
                  alert('Link copied to clipboard!');
                }}
              >
                Copy Link
              </button>
              
              {user && user.username === post.username && (
                <>
                  <button 
                    className="dropdown-item edit-item"
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                  >
                    Edit Caption
                  </button>
                  <button 
                    className="dropdown-item delete-item"
                    onClick={async () => {
                      if(window.confirm('Are you sure you want to delete this post?')) {
                        try {
                          await api.delete(`/posts/${post.id}`);
                          window.location.reload();
                        } catch(err) {
                          alert('Failed to delete post');
                        }
                      }
                      setShowMenu(false);
                    }}
                  >
                    Delete Post
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image */}
      <div className="post-image-container" onDoubleClick={handleLikeClick}>
        <img 
          src={post.image_url} 
          alt={post.caption || "PixLoop post"}
          className="post-image"
          loading="lazy"
        />
      </div>

      {/* Actions Bar */}
      <div className="post-actions-bar">
        <button 
          onClick={handleLikeClick}
          className={`post-action-btn like-btn ${post.is_liked ? 'active' : ''}`}
          title={post.is_liked ? 'Unlike' : 'Like'}
        >
          <Heart size={24} fill={post.is_liked ? "#ef4444" : "none"} color={post.is_liked ? "#ef4444" : "#ffffff"} />
        </button>

        <button 
          onClick={() => setShowComments(!showComments)}
          className="post-action-btn comment-btn"
          title="Comment"
        >
          <MessageCircle size={24} color="#ffffff" />
        </button>

        <button 
          onClick={handleSaveClick}
          className={`post-action-btn save-btn ml-auto ${post.is_saved ? 'active' : ''}`}
          title={post.is_saved ? 'Unsave' : 'Save'}
        >
          <Bookmark size={24} fill={post.is_saved ? "#ffffff" : "none"} color="#ffffff" />
        </button>
      </div>

      {/* Engagement Stats */}
      <div className="post-engagement-info">
        <p className="like-count-display">
          {post.like_count || 0} {post.like_count === 1 ? 'like' : 'likes'}
        </p>
      </div>

      {/* Caption / Editing Content */}
      <div className="post-caption-section">
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="edit-caption-form">
            <textarea
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value)}
              className="edit-caption-textarea"
              rows={2}
              required
            />
            <div className="edit-caption-actions">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)} 
                className="btn-edit-cancel"
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-edit-save"
                disabled={savingEdit || !editedCaption.trim()}
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <p className="caption-text-content">
            <Link to={`/profile/${post.username}`} className="caption-owner-username">
              {post.username}
            </Link>
            <span className="caption-body">{post.caption}</span>
          </p>
        )}
      </div>

      {/* Comments Trigger link */}
      {post.comment_count > 0 && !showComments && (
        <button 
          onClick={() => setShowComments(true)}
          className="view-comments-btn"
        >
          View all {post.comment_count} comments
        </button>
      )}
      
      {/* Comments Section Drawer Inline */}
      {showComments && (
        <div className="post-comments-wrapper">
          <CommentSection postId={post.id} />
        </div>
      )}
    </div>
  );
};
