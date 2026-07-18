import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { PostItem } from "../components/PostItem";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Compass } from "lucide-react";
import "./Home.css";

export const Home = () => {
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();

  const handleJoinGroup = async (communityId) => {
    try {
      const res = await api.post(`/communities/${communityId}/join`);
      if (res.data.success) {
        setCommunities(communities.map(c => 
          c.id === communityId ? { ...c, is_member: true, memberCount: parseInt(c.memberCount) + 1 } : c
        ));
      }
    } catch (err) {
      console.error("Failed to join group", err);
      alert(err.response?.data?.message || "Failed to join group");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [postsRes, communitiesRes] = await Promise.allSettled([
          api.get("/posts"),
          api.get("/communities")
        ]);
        
        if (postsRes.status === "fulfilled") {
          setPosts(postsRes.value.data);
        } else {
          setError(postsRes.reason?.response?.data?.message || "Failed to load posts");
        }

        if (communitiesRes.status === "fulfilled") {
          setCommunities(communitiesRes.value.data.data);
        } else {
          console.error("Failed to load communities:", communitiesRes.reason);
        }
      } catch (err) {
        setError("An unexpected error occurred while loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (error) {
    return (
      <div className="home-error">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Main Feed */}
      <main className="home-feed">
        {loading ? (
          <div className="loading-skeleton">
            {[1, 2, 3].map(n => (
              <div key={n} className="skeleton-card">
                <div className="skeleton-header"></div>
                <div className="skeleton-image"></div>
                <div className="skeleton-actions"></div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <Sparkles size={48} className="text-purple-500 mb-4" />
            <h2>Welcome to PixLoop!</h2>
            <p>There are no posts yet. Be the first to share something amazing.</p>
            <Link to="/create" className="btn-create-first">
              Create a Post
            </Link>
          </div>
        ) : (
          <div className="posts-feed">
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
      </main>

      {/* Right Sidebar - Suggestions */}
      <aside className="home-sidebar-right">
        <div className="sidebar-profile-card">
          <Link to="/profile" className="profile-link-card">
            {user?.profile_pic ? (
              <img src={user.profile_pic} alt={user.username} className="sidebar-profile-avatar" />
            ) : (
              <div className="sidebar-profile-avatar-placeholder">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="sidebar-profile-meta">
              <span className="sidebar-profile-username">{user?.username}</span>
              <span className="sidebar-profile-email">{user?.email}</span>
            </div>
          </Link>
        </div>

        <div className="sidebar-groups-card">
          <div className="sidebar-card-header">
            <h3>Suggested Communities</h3>
            <Link to="/groups" className="see-all-link">
              See All
            </Link>
          </div>
          
          <div className="suggested-groups-list">
            {communities.length === 0 ? (
              <p className="empty-text">{loading ? "Loading..." : "No active groups found."}</p>
            ) : (
              communities.slice(0, 5).map((community) => (
                <div key={community.id} className="suggested-group-item">
                  <Link to={`/groups/${community.id}`} className="suggested-group-info">
                    {community.logo_url ? (
                      <img src={community.logo_url} alt={community.name} className="suggested-group-logo" />
                    ) : (
                      <div className="suggested-group-logo-placeholder">
                        {community.icon || "🌟"}
                      </div>
                    )}
                    <div className="suggested-group-meta">
                      <p className="suggested-group-name">{community.name}</p>
                      <span className="suggested-group-members">{community.memberCount} members</span>
                    </div>
                  </Link>
                  {!community.is_member && (
                    <button 
                      onClick={() => handleJoinGroup(community.id)}
                      className="btn-join-suggested"
                    >
                      Join
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <footer className="sidebar-footer-info">
          <p>© 2026 PIXLOOP FROM ANTIGRAVITY</p>
        </footer>
      </aside>
    </div>
  );
};
