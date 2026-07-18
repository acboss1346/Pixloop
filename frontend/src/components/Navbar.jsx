import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home as HomeIcon, PlusSquare, Users, LogOut } from "lucide-react";
import "./Navbar.css";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isActive = (path) => location.pathname === path;

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
    </>
  );
};