import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { PostItem } from "../components/PostItem";
import { ArrowLeft, Users, Trash2, Edit2, Image as ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const GroupDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreatePost, setShowCreatePost] = useState(false);
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Edit Community State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLogoFile, setEditLogoFile] = useState(null);
  const [editLogoPreview, setEditLogoPreview] = useState("");
  const [savingCommunity, setSavingCommunity] = useState(false);
  const editLogoInputRef = useRef(null);

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const [groupRes, postsRes] = await Promise.all([
        api.get(`/communities/${id}`),
        api.get(`/posts?community_id=${id}`)
      ]);
      setCommunity(groupRes.data.data);
      setPosts(postsRes.data);
    } catch (err) {
      console.error("Failed to fetch group data", err);
      setError("Failed to load group. It may have been deleted.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    try {
      const res = await api.post(`/communities/${id}/join`);
      if (res.data.success) {
        setCommunity({ ...community, is_member: true, memberCount: parseInt(community.memberCount) + 1 });
      }
    } catch (err) {
      console.error("Failed to join group", err);
      alert(err.response?.data?.message || "Failed to join group");
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this community? All posts inside it will also be deleted.")) return;
    try {
      const res = await api.delete(`/communities/${id}`);
      if (res.data.success) {
        navigate('/groups');
      }
    } catch (err) {
      console.error("Failed to delete group", err);
      alert(err.response?.data?.message || "Failed to delete group");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!image) return alert("Please select an image");
    
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("caption", caption);
      formData.append("community_id", id);
      
      const res = await api.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setPosts([res.data, ...posts]);
      setShowCreatePost(false);
      setCaption("");
      setImage(null);
      setPreview("");
    } catch (err) {
      console.error("Failed to create post", err);
      alert(err.response?.data?.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeToggle = async (postId, isLiked) => {
    try {
      if (isLiked) {
        await api.delete(`/posts/${postId}/like`);
        setPosts(posts.map(p => p.id === postId ? { ...p, is_liked: false, like_count: p.like_count - 1 } : p));
      } else {
        await api.post(`/posts/${postId}/like`);
        setPosts(posts.map(p => p.id === postId ? { ...p, is_liked: true, like_count: p.like_count + 1 } : p));
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleSaveToggle = async (postId, isSaved) => {
    try {
      if (isSaved) {
        await api.delete(`/posts/${postId}/save`);
        setPosts(posts.map(p => p.id === postId ? { ...p, is_saved: false, save_count: (p.save_count || 0) - 1 } : p));
      } else {
        await api.post(`/posts/${postId}/save`);
        setPosts(posts.map(p => p.id === postId ? { ...p, is_saved: true, save_count: (p.save_count || 0) + 1 } : p));
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    }
  };

  // Edit community logo change handler
  const handleEditLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditLogoFile(file);
      setEditLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleEditCommunitySubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setSavingCommunity(true);
    try {
      const formData = new FormData();
      formData.append("name", editName);
      formData.append("description", editDesc);
      if (editLogoFile) {
        formData.append("logo", editLogoFile);
      }

      const res = await api.put(`/communities/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        setCommunity(res.data.data);
        setShowEditModal(false);
        setEditLogoFile(null);
        alert("Community updated successfully!");
      }
    } catch (err) {
      console.error("Failed to edit community", err);
      alert(err.response?.data?.message || "Failed to update community details");
    } finally {
      setSavingCommunity(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 size={36} className="animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="max-w-md mx-auto mt-8 text-center p-8 bg-zinc-950 rounded-2xl border border-zinc-900">
        <div className="text-4xl mb-4">😢</div>
        <h2 className="text-xl font-bold mb-2">Community Not Found</h2>
        <p className="text-zinc-500 mb-6">{error}</p>
        <button 
          onClick={() => navigate('/groups')}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-full font-medium transition-colors"
        >
          Browse Communities
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/groups')}
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-colors w-fit border-none bg-transparent cursor-pointer font-semibold text-sm"
      >
        <ArrowLeft size={16} />
        Back to Communities
      </button>

      {/* Group Header */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row gap-6 items-start relative z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-zinc-900 flex items-center justify-center flex-shrink-0 border border-zinc-800 shadow-xl">
            {community.logo_url ? (
              <img src={community.logo_url} alt={community.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">
                {community.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="flex-grow w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">{community.name}</h1>
                <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4 font-semibold">
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{community.memberCount} members</span>
                  </div>
                  <span>•</span>
                  <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {community.creator_id === user.id && (
                  <>
                    <button 
                      onClick={() => {
                        setEditName(community.name);
                        setEditDesc(community.description || "");
                        setEditLogoPreview(community.logo_url || "");
                        setShowEditModal(true);
                      }}
                      className="p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-lg transition-colors border border-zinc-800 bg-transparent cursor-pointer"
                      title="Edit Community"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={handleDeleteGroup}
                      className="p-2 text-red-500 hover:bg-red-950/20 hover:text-red-400 rounded-lg transition-colors border border-red-900/30 bg-transparent cursor-pointer"
                      title="Delete Community"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                
                {community.is_member ? (
                  <button className="px-5 py-2 bg-zinc-900 text-zinc-500 rounded-full font-semibold border border-zinc-800 cursor-default text-xs">
                    Joined
                  </button>
                ) : (
                  <button 
                    onClick={handleJoinGroup}
                    className="px-5 py-2 bg-white text-black hover:opacity-90 rounded-full font-bold transition-all text-xs"
                  >
                    Join Group
                  </button>
                )}
              </div>
            </div>
            
            <p className="text-zinc-300 text-sm leading-relaxed max-w-2xl">{community.description || "No description provided."}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-6">
        {/* Posts Feed */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Group Feed</h2>
            {community.is_member && (
              <button 
                onClick={() => setShowCreatePost(!showCreatePost)}
                className="flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white px-4 py-2 rounded-xl transition-all font-semibold"
              >
                <Edit2 size={14} />
                Create Post
              </button>
            )}
          </div>

          {showCreatePost && community.is_member && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 mb-8 animate-fadeIn">
              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent transition-colors resize-none h-24"
                  />
                </div>
                
                {preview && (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-800 aspect-square sm:aspect-[4/5] max-h-96">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => { setImage(null); setPreview(""); }}
                      className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-zinc-400 hover:text-white cursor-pointer transition-colors p-2 rounded-xl hover:bg-zinc-900">
                    <ImageIcon size={18} />
                    <span className="text-xs font-semibold">Add Photo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageChange} 
                    />
                  </label>
                  
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => { setShowCreatePost(false); setImage(null); setPreview(""); setCaption(""); }}
                      className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={submitting || !image}
                      className="px-5 py-2 text-xs font-bold bg-white text-black rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {posts.length === 0 ? (
            <div className="text-center py-16 bg-zinc-950 rounded-xl border border-zinc-900 text-zinc-500">
              <div className="text-4xl mb-3 text-zinc-700">📸</div>
              <h3 className="text-base font-bold text-white mb-1">No posts yet</h3>
              <p className="text-xs mb-4">Be the first to share something in this community!</p>
              {community.is_member && (
                <button 
                  onClick={() => setShowCreatePost(true)}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors bg-transparent border-none cursor-pointer"
                >
                  Create a post
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
              {posts.map((post) => (
                <PostItem 
                  key={post.id} 
                  post={post} 
                  onLikeToggle={() => handleLikeToggle(post.id, post.is_liked)}
                  onSaveToggle={() => handleSaveToggle(post.id, post.is_saved)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Community Modal */}
      {showEditModal && community.creator_id === user.id && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => { setShowEditModal(false); setEditLogoFile(null); }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-6 text-white tracking-tight">Edit Community Settings</h2>
            
            <form onSubmit={handleEditCommunitySubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Community Name</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea 
                  value={editDesc} 
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white min-h-[100px] focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Community Logo</label>
                <div className="flex items-center gap-4">
                  {editLogoPreview ? (
                    <img src={editLogoPreview} alt="Logo preview" className="w-16 h-16 rounded-full object-cover border border-zinc-800" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-500">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => editLogoInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Upload size={14} />
                    Change Image
                  </button>
                  <input 
                    type="file" 
                    ref={editLogoInputRef} 
                    accept="image/*"
                    onChange={handleEditLogoChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                <button 
                  type="button" 
                  onClick={() => { setShowEditModal(false); setEditLogoFile(null); }}
                  className="px-4 py-2 bg-transparent border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition-all text-sm font-semibold"
                  disabled={savingCommunity}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-white text-black hover:opacity-90 rounded-xl transition-all text-sm font-semibold flex items-center gap-2"
                  disabled={savingCommunity || !editName.trim()}
                >
                  {savingCommunity && <Loader2 size={16} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
