import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { LogOut, Heart, MessageCircle, Settings, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

export const ProfilePage = () => {
  const { username: paramUsername } = useParams();
  const { user: currentUser, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [uploadingPic, setUploadingPic] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const fileInputRef = useRef(null);

  const isOwnProfile = !paramUsername || paramUsername === currentUser?.username;

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError("");
        
        let targetUser = null;
        if (isOwnProfile) {
          targetUser = currentUser;
          // Sync state
          setEditUsername(currentUser?.username || "");
          setEditEmail(currentUser?.email || "");
        } else {
          const userRes = await api.get(`/auth/user/${paramUsername}`);
          targetUser = userRes.data;
        }
        
        if (!targetUser) {
          throw new Error("User not found");
        }
        
        setProfileUser(targetUser);

        // Fetch posts for target user
        const targetUserId = targetUser.id || targetUser._id;
        const postsRes = await api.get(`/posts?user_id=${targetUserId}`);
        
        // Defensive local filtering fallback
        const filteredPosts = postsRes.data.filter(p => 
          p.user_id === targetUserId || 
          p.username?.toLowerCase() === targetUser.username?.toLowerCase()
        );
        setPosts(filteredPosts);
      } catch (err) {
        console.error("Failed to load profile", err);
        setError(err.response?.data?.message || "User profile not found");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [paramUsername, currentUser]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setUploadingPic(true);
    try {
      const res = await api.put("/auth/profile-pic", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      // Update local and context state
      setProfileUser(res.data);
      updateUser({ profile_pic: res.data.profile_pic });
      alert("Profile picture updated!");
    } catch (err) {
      console.error("Failed to upload profile picture", err);
      alert(err.response?.data?.message || "Failed to upload image");
    } finally {
      setUploadingPic(false);
    }
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    if (!editUsername.trim() || !editEmail.trim()) return;

    setSavingDetails(true);
    try {
      const res = await api.put("/auth/profile", {
        username: editUsername,
        email: editEmail
      });
      
      // Update local and context state
      setProfileUser(res.data);
      updateUser({ username: res.data.username, email: res.data.email });
      setShowEditModal(false);
      alert("Profile details updated!");
    } catch (err) {
      console.error("Failed to update profile", err);
      alert(err.response?.data?.message || "Failed to update profile details");
    } finally {
      setSavingDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 size={36} className="animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="text-center py-20 bg-zinc-950 border border-zinc-900 rounded-2xl max-w-lg mx-auto">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-zinc-500 mb-6">{error || "This user does not exist."}</p>
        <button 
          onClick={() => navigate("/")}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
        >
          Go to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Profile Header */}
      <div className="bg-zinc-950 rounded-2xl p-6 sm:p-8 mb-8 border border-zinc-900 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 w-full sm:w-auto">
          {/* Avatar Container */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl font-bold text-white shadow-xl flex-shrink-0">
              {profileUser.profile_pic ? (
                <img src={profileUser.profile_pic} alt={profileUser.username} className="w-full h-full object-cover" />
              ) : (
                profileUser.username?.charAt(0).toUpperCase()
              )}
            </div>
            
            {/* Upload Button overlay (only for own profile) */}
            {isOwnProfile && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                disabled={uploadingPic}
                title="Upload Profile Picture"
              >
                {uploadingPic ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <Upload size={24} />
                )}
              </button>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
              {profileUser.username}
            </h1>
            <p className="text-zinc-500 text-sm mt-1">{profileUser.email}</p>
            
            <div className="flex gap-6 mt-4 justify-center sm:justify-start text-sm">
              <span className="text-zinc-300">
                <strong className="text-white text-base">{posts.length}</strong> posts
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 relative z-10 w-full sm:w-auto justify-center">
          {isOwnProfile ? (
            <>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-colors font-semibold border border-zinc-800 text-sm cursor-pointer"
              >
                <Settings size={16} />
                Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-950/20 hover:bg-red-900/20 text-red-400 hover:text-red-300 rounded-xl transition-colors font-semibold border border-red-900/30 text-sm cursor-pointer"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <span className="text-xs font-semibold bg-zinc-900 text-zinc-400 px-4 py-2 rounded-full border border-zinc-800">
              Visiting
            </span>
          )}
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-6 tracking-tight border-b border-zinc-900 pb-4">
        {isOwnProfile ? "Your Posts" : `${profileUser.username}'s Posts`}
      </h2>

      {/* Profile Posts Grid */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div 
              key={post.id} 
              onClick={() => navigate(`/post/${post.id}`)}
              className="relative aspect-square group rounded-xl overflow-hidden cursor-pointer bg-zinc-950 border border-zinc-900"
            >
              <img
                src={post.image_url}
                alt={post.caption}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 text-white backdrop-blur-[2px]">
                <div className="flex items-center gap-1.5 font-bold text-base">
                  <Heart fill="currentColor" size={20} />
                  <span>{post.like_count || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-base">
                  <MessageCircle fill="currentColor" size={20} />
                  <span>{post.comment_count || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-zinc-950 rounded-2xl border border-zinc-900 text-zinc-500">
          <ImageIcon size={48} className="mx-auto mb-4 text-zinc-700" />
          <p className="text-base font-semibold text-white mb-1">No posts found</p>
          <p className="text-sm">
            {isOwnProfile 
              ? "You haven't uploaded any posts yet."
              : "This user hasn't posted anything yet."}
          </p>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && isOwnProfile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-6 text-white tracking-tight">Edit Profile Details</h2>
            
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Username</label>
                <input 
                  type="text" 
                  value={editUsername} 
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-transparent border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition-all text-sm font-semibold cursor-pointer"
                  disabled={savingDetails}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-white text-black hover:opacity-90 rounded-xl transition-all text-sm font-semibold flex items-center gap-2 cursor-pointer"
                  disabled={savingDetails || !editUsername.trim() || !editEmail.trim()}
                >
                  {savingDetails && <Loader2 size={16} className="animate-spin" />}
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
