import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home as HomeIcon, PlusSquare, Users, LogOut, MessageSquare, Search, X, Loader2 } from "lucide-react";
import api from "../services/api";
import "./Navbar.css";

export const Navbar = () => {
  const { user, logout, unreadData } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Perform search on query change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/auth/search-users?query=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data || []);
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
          <div className="absolute top-0 left-0 bottom-0 w-full sm:w-[380px] bg-zinc-950 border-r border-zinc-900 shadow-2xl p-6 flex flex-col transform transition-transform duration-300 animate-slideIn">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Search Users</h2>
              <button 
                onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                className="p-1.5 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={20} />
              </button>
            </div>

            {/* Input Bar */}
            <div className="relative mb-6">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a username..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                autoFocus
              />
              {searching && (
                <div className="absolute right-3.5 top-3 text-zinc-500">
                  <Loader2 size={16} className="animate-spin text-purple-500" />
                </div>
              )}
            </div>

            {/* Results Grid */}
            <div className="flex-grow overflow-y-auto space-y-3">
              {searchResults.length > 0 ? (
                searchResults.map((usr) => (
                  <Link 
                    key={usr.id} 
                    to={`/profile/${usr.username}`}
                    onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-900/60 border border-transparent hover:border-zinc-900 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-white group-hover:border-purple-500 transition-colors flex-shrink-0">
                      {usr.profile_pic ? (
                        <img src={usr.profile_pic} alt={usr.username} className="w-full h-full object-cover" />
                      ) : (
                        usr.username?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-semibold text-xs text-zinc-300 group-hover:text-white transition-colors">
                      {usr.username}
                    </span>
                  </Link>
                ))
              ) : searchQuery.trim() && !searching ? (
                <p className="text-xs text-zinc-500 text-center italic py-4">No users found matching "{searchQuery}"</p>
              ) : (
                <p className="text-xs text-zinc-500 text-center italic py-4">Search for friends to connect and chat!</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};