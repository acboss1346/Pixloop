import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import {
  LogOut, Heart, MessageCircle, Settings, Upload, X, Loader2,
  Image as ImageIcon, MessageSquare, UserPlus, UserCheck, UserMinus,
  FolderHeart, Bookmark, Camera, FileText, Sparkles, Users
} from "lucide-react";

export const ProfilePage = () => {
  const { username: paramUsername } = useParams();
  const { user: currentUser, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friendCount, setFriendCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Profile tabs state: 'posts' (uploaded), 'liked', 'saved'
  const [activeTab, setActiveTab] = useState("posts");

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBio, setEditBio] = useState("");
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const isOwnProfile = !paramUsername || paramUsername === currentUser?.username;

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError("");
        
        let targetUser = null;
        if (isOwnProfile) {
          targetUser = currentUser;
          setEditUsername(currentUser?.username || "");
          setEditEmail(currentUser?.email || "");
          setEditBio(currentUser?.bio || "");
        } else {
          const userRes = await api.get(`/auth/user/${paramUsername}`);
          targetUser = userRes.data;
        }
        
        if (!targetUser) {
          throw new Error("User not found");
        }
        
        setProfileUser(targetUser);

        // Fetch posts for target user depending on tab
        const targetUserId = targetUser.id || targetUser._id;
        let postsUrl = `/posts?user_id=${targetUserId}`;
        if (isOwnProfile) {
          if (activeTab === "liked") {
            postsUrl = `/posts?liked_by=${targetUserId}`;
          } else if (activeTab === "saved") {
            postsUrl = `/posts?saved_by=${targetUserId}`;
          }
        }
        
        const [postsRes, friendsRes] = await Promise.allSettled([
          api.get(postsUrl),
          api.get("/friends")
        ]);

        if (postsRes.status === "fulfilled") {
          let filtered = postsRes.value.data;
          if (activeTab === "posts") {
            filtered = postsRes.value.data.filter(p => 
              p.user_id === targetUserId || 
              p.username?.toLowerCase() === targetUser.username?.toLowerCase()
            );
          }
          setPosts(filtered);
        }

        if (friendsRes.status === "fulfilled" && Array.isArray(friendsRes.value.data)) {
          setFriendCount(friendsRes.value.data.length);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setError(err.response?.data?.message || "User profile not found");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [paramUsername, currentUser, activeTab]);

  const handleLogout = () => {
    logout();
    toast.info("Logged out successfully");
    navigate("/login");
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setUploadingPic(true);
    try {
      const res = await api.put("/auth/profile-pic", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setProfileUser(prev => ({ ...prev, profile_pic: res.data.profile_pic }));
      updateUser({ profile_pic: res.data.profile_pic });
      toast.success("Profile picture updated!");
    } catch (err) {
      console.error("Failed to upload profile picture", err);
      toast.error(err.response?.data?.message || "Failed to upload image");
    } finally {
      setUploadingPic(false);
    }
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Cover image size must be less than 8MB");
      return;
    }

    const formData = new FormData();
    formData.append("cover", file);

    setUploadingCover(true);
    try {
      const res = await api.put("/auth/cover-pic", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setProfileUser(prev => ({ ...prev, cover_pic: res.data.cover_pic }));
      updateUser({ cover_pic: res.data.cover_pic });
      toast.success("Cover photo updated!");
    } catch (err) {
      console.error("Failed to upload cover picture", err);
      toast.error(err.response?.data?.message || "Failed to upload cover photo");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    if (!editUsername.trim() || !editEmail.trim()) return;

    setSavingDetails(true);
    try {
      const res = await api.put("/auth/profile", {
        username: editUsername.trim(),
        email: editEmail.trim(),
        bio: editBio.trim()
      });
      
      setProfileUser(res.data);
      updateUser({
        username: res.data.username,
        email: res.data.email,
        bio: res.data.bio
      });
      setShowEditModal(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Failed to update profile", err);
      toast.error(err.response?.data?.message || "Failed to update profile details");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      await api.post("/friends/request", { receiver_id: profileUser.id });
      const userRes = await api.get(`/auth/user/${paramUsername}`);
      setProfileUser(userRes.data);
      toast.success("Friend request sent!");
    } catch (err) {
      console.error("Failed to send friend request", err);
      toast.error(err.response?.data?.message || "Failed to send request");
    }
  };

  const handleAcceptFriendRequest = async () => {
    try {
      await api.put(`/friends/request/${profileUser.friendship.id}/accept`);
      const userRes = await api.get(`/auth/user/${paramUsername}`);
      setProfileUser(userRes.data);
      toast.success("Friend request accepted!");
    } catch (err) {
      console.error("Failed to accept friend request", err);
      toast.error("Failed to accept request");
    }
  };

  const handleRemoveFriendship = async () => {
    const isFriend = profileUser.friendship?.status === 'accepted';
    if (!window.confirm(isFriend ? "Are you sure you want to unfriend this user?" : "Cancel friend request?")) return;
    
    try {
      await api.delete(`/friends/request/${profileUser.friendship.id}`);
      const userRes = await api.get(`/auth/user/${paramUsername}`);
      setProfileUser(userRes.data);
      toast.info(isFriend ? "Friendship removed" : "Request cancelled");
    } catch (err) {
      console.error("Failed to remove friendship", err);
      toast.error("Failed to remove request");
    }
  };

  const handleMessageRedirect = () => {
    navigate('/messages', { state: { selectFriendId: profileUser.id } });
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
      <div className="text-center py-20 bg-zinc-950 border border-zinc-900 rounded-3xl max-w-lg mx-auto p-8">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-bold mb-2 text-white">Profile Not Found</h2>
        <p className="text-zinc-500 mb-6 text-sm">{error || "This user does not exist or has been removed."}</p>
        <button 
          onClick={() => navigate("/")}
          className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-semibold text-xs transition-colors border-none cursor-pointer"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 px-2 sm:px-4">
      {/* Profile Card Container */}
      <div className="bg-zinc-950 rounded-3xl mb-8 border border-zinc-900 overflow-hidden shadow-2xl relative">
        {/* Cover Photo */}
        <div className="relative h-44 sm:h-60 w-full bg-gradient-to-r from-purple-900 via-indigo-950 to-zinc-950 overflow-hidden">
          {profileUser.cover_pic ? (
            <img 
              src={profileUser.cover_pic} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500 via-purple-900 to-black" />
          )}

          {/* Change Cover Photo Button */}
          {isOwnProfile && (
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
              title="Change cover photo"
            >
              {uploadingCover ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
              <span>{profileUser.cover_pic ? "Edit Cover" : "Add Cover"}</span>
            </button>
          )}

          <input 
            type="file" 
            ref={coverInputRef} 
            onChange={handleCoverChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Profile Info Header */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-zinc-900 border-4 border-zinc-950 flex items-center justify-center text-4xl font-extrabold text-white shadow-2xl flex-shrink-0">
                {profileUser.profile_pic ? (
                  <img src={profileUser.profile_pic} alt={profileUser.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center font-bold text-3xl">
                    {profileUser.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {isOwnProfile && (
                <button 
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingPic}
                  className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer border-none"
                  title="Upload Profile Picture"
                >
                  {uploadingPic ? (
                    <Loader2 size={24} className="animate-spin text-purple-400" />
                  ) : (
                    <Upload size={24} />
                  )}
                </button>
              )}

              <input 
                type="file" 
                ref={avatarInputRef} 
                onChange={handleAvatarChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 flex-wrap justify-center sm:justify-end">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-all font-semibold border border-zinc-800 text-xs sm:text-sm cursor-pointer shadow-sm"
                  >
                    <Settings size={15} />
                    Edit Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded-xl transition-all font-semibold border border-rose-900/30 text-xs sm:text-sm cursor-pointer shadow-sm"
                  >
                    <LogOut size={15} />
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  {!profileUser.friendship && (
                    <button
                      onClick={handleSendFriendRequest}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:opacity-90 rounded-xl transition-all font-bold text-xs sm:text-sm cursor-pointer border-none shadow-md"
                    >
                      <UserPlus size={16} />
                      Add Friend
                    </button>
                  )}

                  {profileUser.friendship && profileUser.friendship.status === 'pending' && (
                    profileUser.friendship.sender_id === currentUser.id ? (
                      <button
                        onClick={handleRemoveFriendship}
                        className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-zinc-400 hover:text-white rounded-xl transition-all font-semibold border border-zinc-800 text-xs sm:text-sm cursor-pointer"
                      >
                        <UserMinus size={16} />
                        Cancel Request
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleAcceptFriendRequest}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white text-black hover:opacity-95 rounded-xl font-bold text-xs cursor-pointer border-none"
                        >
                          <UserCheck size={14} />
                          Accept
                        </button>
                        <button
                          onClick={handleRemoveFriendship}
                          className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-rose-400 hover:text-rose-300 border border-zinc-800 rounded-xl font-semibold text-xs cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    )
                  )}

                  {profileUser.friendship && profileUser.friendship.status === 'accepted' && (
                    <>
                      <button
                        onClick={handleMessageRedirect}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors font-bold text-xs sm:text-sm cursor-pointer border-none shadow-lg shadow-purple-950/60"
                      >
                        <MessageSquare size={16} />
                        Message
                      </button>
                      <button
                        onClick={handleRemoveFriendship}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition-colors font-semibold text-xs cursor-pointer"
                        title="Remove Friend"
                      >
                        <UserMinus size={15} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="text-center sm:text-left mt-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
              {profileUser.username}
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">{profileUser.email}</p>

            {/* Bio */}
            <p className="text-zinc-300 text-sm mt-3 leading-relaxed max-w-xl">
              {profileUser.bio || (isOwnProfile ? "No bio yet. Click Edit Profile to add one!" : "No bio provided.")}
            </p>

            {/* Stats row */}
            <div className="flex gap-8 mt-5 justify-center sm:justify-start text-xs sm:text-sm border-t border-zinc-900/80 pt-4">
              <span className="text-zinc-400">
                <strong className="text-white font-bold text-base mr-1">{posts.length}</strong> posts
              </span>
              <span className="text-zinc-400">
                <strong className="text-white font-bold text-base mr-1">{friendCount}</strong> friends
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      {isOwnProfile ? (
        <div className="flex border-b border-zinc-900 mb-8 justify-center sm:justify-start gap-8">
          <button
            onClick={() => setActiveTab("posts")}
            className={`pb-4 px-2 font-bold text-sm flex items-center gap-2 transition-all bg-transparent border-none cursor-pointer ${
              activeTab === "posts"
                ? "text-white border-b-2 border-purple-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <ImageIcon size={16} />
            Uploaded
          </button>
          <button
            onClick={() => setActiveTab("liked")}
            className={`pb-4 px-2 font-bold text-sm flex items-center gap-2 transition-all bg-transparent border-none cursor-pointer ${
              activeTab === "liked"
                ? "text-white border-b-2 border-purple-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <FolderHeart size={16} />
            Liked
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`pb-4 px-2 font-bold text-sm flex items-center gap-2 transition-all bg-transparent border-none cursor-pointer ${
              activeTab === "saved"
                ? "text-white border-b-2 border-purple-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Bookmark size={16} />
            Saved
          </button>
        </div>
      ) : (
        <h2 className="text-lg font-bold text-white mb-6 tracking-tight border-b border-zinc-900 pb-4">
          {profileUser.username}'s Posts
        </h2>
      )}

      {/* Profile Posts Grid */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {posts.map((post) => (
            <div 
              key={post.id} 
              onClick={() => navigate(`/post/${post.id}`)}
              className="relative aspect-square group rounded-2xl overflow-hidden cursor-pointer bg-zinc-950 border border-zinc-900 shadow-md"
            >
              <img
                src={post.image_url}
                alt={post.caption || "PixLoop post"}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 text-white backdrop-blur-[2px]">
                <div className="flex items-center gap-1.5 font-bold text-sm sm:text-base">
                  <Heart fill="currentColor" size={18} />
                  <span>{post.like_count || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-sm sm:text-base">
                  <MessageCircle fill="currentColor" size={18} />
                  <span>{post.comment_count || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-zinc-950/60 rounded-3xl border border-zinc-900 text-zinc-500 p-8">
          <ImageIcon size={44} className="mx-auto mb-3 text-zinc-700" />
          <p className="text-sm font-semibold text-white mb-1">No posts found</p>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            {isOwnProfile 
              ? `You haven't ${activeTab === 'posts' ? 'uploaded' : activeTab === 'liked' ? 'liked' : 'saved'} any posts yet.`
              : "This user hasn't posted anything yet."}
          </p>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && isOwnProfile && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer border-none bg-transparent"
            >
              <X size={19} />
            </button>

            <h2 className="text-xl font-bold mb-6 text-white tracking-tight">Edit Profile</h2>
            
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Username</label>
                <input 
                  type="text" 
                  value={editUsername} 
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bio</label>
                  <span className="text-[10px] text-zinc-500">{editBio.length}/300</span>
                </div>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value.slice(0, 300))}
                  placeholder="Tell the world about yourself..."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-xs sm:text-sm resize-none"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-transparent border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition-all text-xs font-semibold cursor-pointer"
                  disabled={savingDetails}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all text-xs font-bold flex items-center gap-2 cursor-pointer border-none shadow-md shadow-purple-950"
                  disabled={savingDetails || !editUsername.trim() || !editEmail.trim()}
                >
                  {savingDetails && <Loader2 size={14} className="animate-spin" />}
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
