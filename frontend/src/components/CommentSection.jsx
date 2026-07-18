import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { CommentItem } from "./CommentItem";
import { Loader2 } from "lucide-react";

export const CommentSection = ({ postId }) => {
  const [newCommentText, setNewCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/posts/${postId}/comments`);
      setComments(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch comments", err);
      setError("Failed to load comments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !user) return;
    
    try {
      setIsPosting(true);
      await api.post(`/posts/${postId}/comments`, {
        comment: newCommentText
      });
      setNewCommentText("");
      
      // Fetch fresh, joined comments from the database to sync details
      const response = await api.get(`/posts/${postId}/comments`);
      setComments(response.data);
    } catch (err) {
      console.error("Failed to post comment", err);
      setError("Error posting comment.");
    } finally {
      setIsPosting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-zinc-500 gap-2">
        <Loader2 size={16} className="animate-spin text-purple-500" />
        <span className="text-xs">Loading comments...</span>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-zinc-900 pt-4">
      <h3 className="text-sm font-bold text-white mb-4">Comments</h3>

      {error && <div className="text-red-500 text-xs mb-3 bg-red-950/20 border border-red-900/30 p-2.5 rounded-xl font-semibold">{error}</div>}

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-2">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            className="w-full border border-zinc-800 bg-zinc-900 p-3 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 resize-none transition-colors"
            placeholder="Add a comment..."
            rows={2}
          />
          <button
            type="submit"
            disabled={isPosting || !newCommentText.trim()}
            className="self-end bg-white text-black disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isPosting && <Loader2 size={12} className="animate-spin" />}
            {isPosting ? "Posting..." : "Post"}
          </button>
        </form>
      ) : (
        <p className="mb-4 text-xs text-zinc-500">
          You must be logged in to post a comment.
        </p>
      )}

      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No comments yet. Be the first to share your thoughts!</p>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
};
