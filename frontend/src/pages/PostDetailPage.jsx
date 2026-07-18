import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { PostItem } from "../components/PostItem";
import { ArrowLeft } from "lucide-react";

export const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/posts/${id}`);
        setPost(res.data);
      } catch (err) {
        console.error("Failed to fetch post", err);
        setError("Failed to load post. It may have been deleted.");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const handleLikeToggle = async (postId, isLiked) => {
    try {
      if (isLiked) {
        await api.delete(`/posts/${postId}/like`);
        setPost({ ...post, is_liked: false, like_count: post.like_count - 1 });
      } else {
        await api.post(`/posts/${postId}/like`);
        setPost({ ...post, is_liked: true, like_count: post.like_count + 1 });
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleSaveToggle = async (postId, isSaved) => {
    try {
      if (isSaved) {
        await api.delete(`/posts/${postId}/save`);
        setPost({ ...post, is_saved: false, save_count: (post.save_count || 0) - 1 });
      } else {
        await api.post(`/posts/${postId}/save`);
        setPost({ ...post, is_saved: true, save_count: (post.save_count || 0) + 1 });
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto mt-8 text-center p-8 bg-[#1e1e1e] rounded-xl border border-[#333]">
        <div className="text-4xl mb-4">😢</div>
        <h2 className="text-xl font-bold mb-2">Post Not Found</h2>
        <p className="text-gray-400 mb-6">{error || "This post doesn't exist."}</p>
        <button 
          onClick={() => navigate(-1)}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-full font-medium transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-4">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Back
      </button>
      
      <PostItem 
        post={post}
        onLikeToggle={() => handleLikeToggle(post.id, post.is_liked)}
        onSaveToggle={() => handleSaveToggle(post.id, post.is_saved)}
      />
    </div>
  );
};
