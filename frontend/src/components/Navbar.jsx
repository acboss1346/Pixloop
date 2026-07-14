import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home as HomeIcon, PlusSquare, User, Search, Users, LogOut, X, Loader2 } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import api from "../services/api";
import "./Navbar.css";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [groupResults, setGroupResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef(null);
  const searchDrawerRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  // Handle clicking outside search drawer to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchDrawerRef.current && 
        !searchDrawerRef.current.contains(event.target) &&
        !event.target.closest('.search-nav-btn')
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setUserResults([]);
      setGroupResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        // Fetch users
        const usersRes = await api.get(`/auth/search-users?query=${searchQuery}`);
        setUserResults(usersRes.data);

        // Fetch groups and filter locally (or perform search)
        const groupsRes = await api.get("/communities");
        if (groupsRes.data && groupsRes.data.data) {
          const filtered = groupsRes.data.data.filter(g => 
            g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
          );
          setGroupResults(filtered);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearchClick = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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

          <button 
            onClick={handleSearchClick} 
            className={`sidebar-link search-nav-btn ${searchOpen ? "active" : ""}`}
          >
            <Search size={22} />
            <span className="link-label">Search</span>
          </button>

          <Link to="/create" className={`sidebar-link ${isActive("/create") ? "active" : ""}`}>
            <PlusSquare size={22} />
            <span className="link-label">Create</span>
          </Link>

          <Link to="/groups" className={`sidebar-link ${isActive("/groups") ? "active" : ""}`}>
            <Users size={22} />
            <span className="link-label">Communities</span>
          </Link>

          <div className="sidebar-link-notifications">
            <NotificationsDropdown />
            <span className="link-label">Notifications</span>
          </div>

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

      {/* Slide-out Search Drawer */}
      <div 
        ref={searchDrawerRef} 
        className={`search-drawer ${searchOpen ? "open" : ""}`}
      >
        <div className="search-drawer-header">
          <h2>Search</h2>
          <button onClick={() => setSearchOpen(false)} className="close-drawer-btn">
            <X size={20} />
          </button>
        </div>

        <div className="search-input-wrapper">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search users or communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-drawer-input"
          />
        </div>

        <div className="search-drawer-results">
          {searching ? (
            <div className="search-loader">
              <Loader2 size={24} className="animate-spin text-purple-500" />
              <span>Searching...</span>
            </div>
          ) : !searchQuery.trim() ? (
            <div className="search-placeholder">
              <Search size={36} className="text-zinc-700 mb-2" />
              <p>Find friends and groups of interest</p>
            </div>
          ) : userResults.length === 0 && groupResults.length === 0 ? (
            <div className="search-no-results">
              No matches found for "{searchQuery}"
            </div>
          ) : (
            <div className="results-list">
              {/* User Results */}
              {userResults.length > 0 && (
                <div className="results-section">
                  <h3>Users</h3>
                  {userResults.map((u) => (
                    <Link
                      key={u.id}
                      to={`/profile/${u.username}`}
                      onClick={() => setSearchOpen(false)}
                      className="search-result-item"
                    >
                      {u.profile_pic ? (
                        <img src={u.profile_pic} alt={u.username} className="result-avatar" />
                      ) : (
                        <div className="result-avatar-placeholder">
                          {u.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="result-info">
                        <span className="result-name">{u.username}</span>
                        <span className="result-meta">@{u.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Group Results */}
              {groupResults.length > 0 && (
                <div className="results-section">
                  <h3>Communities</h3>
                  {groupResults.map((g) => (
                    <Link
                      key={g.id}
                      to={`/groups/${g.id}`}
                      onClick={() => setSearchOpen(false)}
                      className="search-result-item"
                    >
                      {g.logo_url ? (
                        <img src={g.logo_url} alt={g.name} className="result-avatar" />
                      ) : (
                        <div className="result-avatar-placeholder text-lg">
                          {g.icon || "🌟"}
                        </div>
                      )}
                      <div className="result-info">
                        <span className="result-name">{g.name}</span>
                        <span className="result-meta">{g.memberCount} members</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <Link to="/" className={`mobile-nav-item ${isActive("/") ? "active" : ""}`}>
          <HomeIcon size={24} />
        </Link>
        <Link to="/groups" className={`mobile-nav-item ${isActive("/groups") ? "active" : ""}`}>
          <Users size={24} />
        </Link>
        <Link to="/create" className={`mobile-nav-item ${isActive("/create") ? "active" : ""}`}>
          <PlusSquare size={24} />
        </Link>
        <div className="mobile-nav-item">
          <NotificationsDropdown />
        </div>
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
    </>
  );
};