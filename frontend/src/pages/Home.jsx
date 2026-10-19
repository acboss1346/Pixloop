import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { PostItem } from "../components/PostItem";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Sparkles, Loader2, Users, ArrowUpRight } from "lucide-react";
import "./Home.css";

const POSTS_PER_PAGE = 10;

export const Home = () => {
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const toast = useToast();

  const handleJoinGroup = async (communityId) => {
    try {
      const res = await api.post(`/communities/${communityId}/join`);
      if (res.data.success) {
        setCommunities(communities.map(c => 
          c.id === communityId ? { ...c, is_member: true, memberCount: parseInt(c.memberCount) + 1 } : c
        ));
        toast.success("Joined community!");
      }
    } catch (err) {
      console.error("Failed to join group", err);
      toast.error(err.response?.data?.message || "Failed to join group");
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [postsRes, communitiesRes] = await Promise.allSettled([
        api.get(`/posts?page=1&limit=${POSTS_PER_PAGE}`),
        api.get("/communities")
      ]);
      
      if (postsRes.status === "fulfilled") {
        const fetchedPosts = Array.isArray(postsRes.value.data) ? postsRes.value.data : [];
        setPosts(fetchedPosts);
        if (fetchedPosts.length < POSTS_PER_PAGE) {
          setHasMore(false);
        }
      } else {
        setError(postsRes.reason?.response?.data?.message || "Failed to load posts");
      }

      if (communitiesRes.status === "fulfilled") {
        setCommunities(communitiesRes.value.data?.data || []);
      }
    } catch (err) {
      setError("An unexpected error occurred while loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await api.get(`/posts?page=${nextPage}&limit=${POSTS_PER_PAGE}`);
      const newPosts = Array.isArray(res.data) ? res.data : [];
      if (newPosts.length === 0 || newPosts.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const filteredNew = newPosts.filter(p => !existingIds.has(p.id));
        return [...prev, ...filteredNew];
      });
      setPage(nextPage);
    } catch (err) {
      console.error("Failed to load more posts", err);
    } finally {
      setLoadingMore(false);
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

  const handleDeletePost = (deletedId) => {
    setPosts(prev => prev.filter(p => p.id !== deletedId));
  };

  if (error) {
    return (
      <div className="home-error py-24 text-center">
        <div className="error-card max-w-md mx-auto p-8 rounded-2xl bg-zinc-950 border border-zinc-900">
          <div className="error-icon text-3xl mb-3">⚠️</div>
          <h3 className="text-lg font-bold text-white mb-2">Something went wrong</h3>
          <p className="text-zinc-500 text-sm mb-4">{error}</p>
          <button 
            onClick={fetchInitialData}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs cursor-pointer border-none"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Main Feed */}
      <main className="home-feed">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-4 space-y-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-24 h-3 rounded bg-zinc-800" />
                    <div className="w-16 h-2 rounded bg-zinc-800/60" />
                  </div>
                </div>
                <div className="w-full h-80 rounded-xl bg-zinc-900" />
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded bg-zinc-800" />
                  <div className="w-6 h-6 rounded bg-zinc-800" />
                  <div className="w-6 h-6 rounded bg-zinc-800 ml-auto" />
                </div>
                <div className="w-3/4 h-3 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state text-center py-24 px-4 bg-zinc-950/40 rounded-3xl border border-zinc-900">
            <Sparkles size={48} className="text-purple-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold text-white mb-2">Welcome to PixLoop!</h2>
            <p className="text-zinc-400 text-sm max-w-sm mx-auto mb-6">
              There are no posts in the feed yet. Be the first to share something amazing with the community.
            </p>
            <Link to="/create" className="btn-create-first inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-purple-950/60 text-decoration-none">
              Create a Post
            </Link>
          </div>
        ) : (
          <div className="posts-feed space-y-6">
            {posts.map((post) => (
              <PostItem 
                key={post.id} 
                post={post} 
                onLikeToggle={() => handleLikeToggle(post.id, post.is_liked)} 
                onSaveToggle={() => handleSaveToggle(post.id, post.is_saved)}
                onDelete={handleDeletePost}
              />
            ))}

            {/* Load more trigger */}
            {hasMore ? (
              <div className="py-6 text-center">
                <button
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-purple-400" />
                      Loading more posts...
                    </>
                  ) : (
                    "Load More Posts"
                  )}
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-600">
                You're all caught up! ✨
              </div>
            )}
          </div>
        )}
      </main>

      {/* Right Sidebar - Suggestions */}
      <aside className="home-sidebar-right hidden lg:block">
        <div className="sidebar-profile-card p-4 rounded-2xl bg-zinc-950 border border-zinc-900 mb-6">
          <Link to="/profile" className="profile-link-card flex items-center gap-3 text-decoration-none group">
            {user?.profile_pic ? (
              <img src={user.profile_pic} alt={user.username} className="w-12 h-12 rounded-full object-cover border border-zinc-800 group-hover:border-purple-500 transition-colors" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white font-bold text-base flex items-center justify-center">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="sidebar-profile-meta flex-1 min-w-0">
              <span className="sidebar-profile-username font-bold text-sm text-white group-hover:text-purple-400 transition-colors block truncate">
                {user?.username}
              </span>
              <span className="sidebar-profile-email text-xs text-zinc-500 truncate block">
                {user?.email}
              </span>
            </div>
          </Link>
        </div>

        <div className="sidebar-groups-card p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
          <div className="sidebar-card-header flex items-center justify-between mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 m-0">Suggested Communities</h3>
            <Link to="/groups" className="see-all-link text-xs font-semibold text-purple-400 hover:text-purple-300 text-decoration-none">
              See All
            </Link>
          </div>
          
          <div className="suggested-groups-list space-y-3">
            {communities.length === 0 ? (
              <p className="empty-text text-xs text-zinc-600 py-4 text-center">{loading ? "Loading..." : "No active groups found."}</p>
            ) : (
              communities.slice(0, 5).map((community) => (
                <div key={community.id} className="suggested-group-item flex items-center justify-between gap-3 group">
                  <Link to={`/groups/${community.id}`} className="suggested-group-info flex items-center gap-3 text-decoration-none flex-1 min-w-0">
                    {community.logo_url ? (
                      <img src={community.logo_url} alt={community.name} className="w-9 h-9 rounded-xl object-cover border border-zinc-800 group-hover:border-purple-500 transition-colors flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm flex-shrink-0">
                        {community.icon || "🌟"}
                      </div>
                    )}
                    <div className="suggested-group-meta flex-1 min-w-0">
                      <p className="suggested-group-name font-semibold text-xs text-zinc-200 group-hover:text-white truncate m-0">
                        {community.name}
                      </p>
                      <span className="suggested-group-members text-[10px] text-zinc-500">
                        {community.memberCount} members
                      </span>
                    </div>
                  </Link>
                  {!community.is_member && (
                    <button 
                      onClick={() => handleJoinGroup(community.id)}
                      className="btn-join-suggested px-3 py-1 rounded-full text-[11px] font-bold bg-white text-black hover:opacity-90 transition-opacity cursor-pointer border-none flex-shrink-0"
                    >
                      Join
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <footer className="sidebar-footer-info mt-6 px-2 text-[11px] text-zinc-600 font-medium">
          <p className="m-0">© 2026 PIXLOOP • DESIGNED WITH EXCELLENCE</p>
        </footer>
      </aside>
    </div>
  );
};
