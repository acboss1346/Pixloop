import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home as HomeIcon, PlusSquare, Users, LogOut, MessageSquare, Search, X, Loader2 } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import api from "../services/api";
import "./Navbar.css";

export const Navbar = () => {
  const { user, logout, unreadData } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTab, setSearchTab] = useState("all");
  const [searchResults, setSearchResults] = useState({ users: [], communities: [], posts: [] });
  const [searching, setSearching] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Perform global search on query change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ users: [], communities: [], posts: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/auth/search-all?query=${encodeURIComponent(searchQuery)}`);
        setSearchResults({
          users: res.data?.users || [],
          communities: res.data?.communities || [],
          posts: res.data?.posts || []
        });
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-black/85 backdrop-blur-xl border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="sidebar-logo flex items-center">
          <span className="logo-text text-xl font-extrabold tracking-tight">PixLoop</span>
        </Link>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowSearch(true)} 
            aria-label="Search"
            className="p-2.5 rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
          >
            <Search size={20} />
          </button>
          <NotificationsDropdown />
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className="sidebar-desktop">
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <span className="logo-text">PixLoop</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className={`sidebar-link ${isActive("/") ? "active" : ""}`}>
            <HomeIcon size={22} />
            <span className="link-label">Home</span>
          </Link>

          {/* Search Button Link */}
          <button 
            onClick={() => setShowSearch(true)} 
            className={`sidebar-link w-full text-left bg-transparent border-none cursor-pointer ${showSearch ? "active" : ""}`}
          >
            <Search size={22} />
            <span className="link-label">Search</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="sidebar-link-notifications group">
            <NotificationsDropdown />
            <span className="link-label">Notifications</span>
          </div>

          <Link to="/messages" className={`sidebar-link ${isActive("/messages") ? "active" : ""}`}>
            <div className="relative flex items-center justify-center">
              <MessageSquare size={22} />
              {unreadData?.total > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {unreadData.total}
                </span>
              )}
            </div>
            <span className="link-label">Messages</span>
          </Link>

          <Link to="/create" className={`sidebar-link ${isActive("/create") ? "active" : ""}`}>
            <PlusSquare size={22} />
            <span className="link-label">Create</span>
          </Link>

          <Link to="/groups" className={`sidebar-link ${isActive("/groups") ? "active" : ""}`}>
            <Users size={22} />
            <span className="link-label">Communities</span>
          </Link>

          <Link to="/profile" className={`sidebar-link ${isActive("/profile") ? "active" : ""}`}>
            {user?.profile_pic ? (
              <img src={user.profile_pic} alt={user.username} className="sidebar-avatar" />
            ) : (
              <div className="sidebar-avatar-placeholder">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="link-label">Profile</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <Link to="/" className={`mobile-nav-item ${isActive("/") ? "active" : ""}`}>
          <HomeIcon size={24} />
        </Link>
        <button onClick={() => setShowSearch(true)} className="mobile-nav-item bg-transparent border-none cursor-pointer">
          <Search size={24} />
        </button>
        <Link to="/messages" className={`mobile-nav-item relative ${isActive("/messages") ? "active" : ""}`}>
          <div className="relative flex items-center justify-center">
            <MessageSquare size={24} />
            {unreadData?.total > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                {unreadData.total}
              </span>
            )}
          </div>
        </Link>
        <Link to="/groups" className={`mobile-nav-item ${isActive("/groups") ? "active" : ""}`}>
          <Users size={24} />
        </Link>
        <Link to="/create" className={`mobile-nav-item ${isActive("/create") ? "active" : ""}`}>
          <PlusSquare size={24} />
        </Link>
        <Link to="/profile" className={`mobile-nav-item ${isActive("/profile") ? "active" : ""}`}>
          {user?.profile_pic ? (
            <img src={user.profile_pic} alt={user.username} className="mobile-avatar" />
          ) : (
            <div className="mobile-avatar-placeholder">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      </nav>

      {/* Search Drawer Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="absolute top-0 left-0 bottom-0 w-full sm:w-[420px] bg-zinc-950 border-r border-zinc-900 shadow-2xl p-6 flex flex-col transform transition-transform duration-300 animate-slideIn">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Explore PixLoop</h2>
              <button 
                onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                className="p-1.5 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={20} />
              </button>
            </div>

            {/* Input Bar */}
            <div className="relative mb-4">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users, communities, or posts..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                autoFocus
              />
              {searching && (
                <div className="absolute right-3.5 top-3 text-zinc-500">
                  <Loader2 size={16} className="animate-spin text-purple-500" />
                </div>
              )}
            </div>

            {/* Search Filter Tabs */}
            <div className="flex gap-2 mb-4 pb-2 border-b border-zinc-900 text-xs">
              {[
                { id: "all", label: "All" },
                { id: "users", label: `Users (${searchResults.users.length})` },
                { id: "communities", label: `Communities (${searchResults.communities.length})` },
                { id: "posts", label: `Posts (${searchResults.posts.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSearchTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border-none ${
                    searchTab === tab.id
                      ? "bg-purple-600 text-white"
                      : "bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Results Grid */}
            <div className="flex-grow overflow-y-auto space-y-4 pr-1">
              {/* Users Results */}
              {(searchTab === "all" || searchTab === "users") && searchResults.users.length > 0 && (
                <div className="space-y-2">
                  {searchTab === "all" && (
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">People</h3>
                  )}
                  {searchResults.users.map((usr) => (
                    <Link 
                      key={usr.id} 
                      to={`/profile/${usr.username}`}
                      onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-900/60 border border-transparent hover:border-zinc-900 transition-all group text-decoration-none"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-white group-hover:border-purple-500 transition-colors flex-shrink-0">
                        {usr.profile_pic ? (
                          <img src={usr.profile_pic} alt={usr.username} className="w-full h-full object-cover" />
                        ) : (
                          usr.username?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-xs text-zinc-200 group-hover:text-white transition-colors block truncate">
                          {usr.username}
                        </span>
                        {usr.bio && (
                          <p className="text-[10px] text-zinc-500 truncate m-0">{usr.bio}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Communities Results */}
              {(searchTab === "all" || searchTab === "communities") && searchResults.communities.length > 0 && (
                <div className="space-y-2">
                  {searchTab === "all" && (
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Communities</h3>
                  )}
                  {searchResults.communities.map((comm) => (
                    <Link 
                      key={comm.id} 
                      to={`/groups/${comm.id}`}
                      onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-900/60 border border-transparent hover:border-zinc-900 transition-all group text-decoration-none"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-white group-hover:border-purple-500 transition-colors flex-shrink-0">
                        {comm.logo_url ? (
                          <img src={comm.logo_url} alt={comm.name} className="w-full h-full object-cover" />
                        ) : (
                          comm.icon || "🌟"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-xs text-zinc-200 group-hover:text-white transition-colors block truncate">
                          {comm.name}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {comm.memberCount || 0} members
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Posts Results */}
              {(searchTab === "all" || searchTab === "posts") && searchResults.posts.length > 0 && (
                <div className="space-y-2">
                  {searchTab === "all" && (
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Posts</h3>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {searchResults.posts.map((p) => (
                      <Link 
                        key={p.id} 
                        to={`/post/${p.id}`}
                        onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                        className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group text-decoration-none block"
                      >
                        <div className="aspect-square overflow-hidden bg-zinc-950">
                          <img src={p.image_url} alt={p.caption || "Post"} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <p className="p-2 text-[10px] text-zinc-400 group-hover:text-white truncate m-0 font-medium">
                          {p.caption || `@${p.username}`}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty / Initial State */}
              {searchQuery.trim() && !searching && 
               searchResults.users.length === 0 && 
               searchResults.communities.length === 0 && 
               searchResults.posts.length === 0 && (
                <p className="text-xs text-zinc-500 text-center italic py-8">
                  No results found for "{searchQuery}"
                </p>
              )}

              {!searchQuery.trim() && (
                <div className="text-center py-12 text-zinc-500">
                  <Search size={32} className="mx-auto mb-3 opacity-30 text-purple-400" />
                  <p className="text-xs text-zinc-400 font-semibold mb-1">Global Discovery</p>
                  <p className="text-[11px] text-zinc-600 max-w-xs mx-auto">
                    Search for friends, discover communities, or explore inspiring posts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};