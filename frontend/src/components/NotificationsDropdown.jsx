import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bell, Heart, MessageSquare, UserPlus, Users, Loader2, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "../context/NotificationContext";
import { parseSafeDate } from "../utils/date";

export const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead
  } = useNotifications();

  // Close on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    setIsOpen(false);
    if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.type === 'friend_request' || notification.type === 'friend_accept') {
      navigate(`/profile/${notification.sender_username || ''}`);
    } else if (notification.type === 'message') {
      navigate('/messages');
    } else if (notification.community_id) {
      navigate(`/groups/${notification.community_id}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart size={13} className="text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageSquare size={13} className="text-purple-400" />;
      case 'friend_request':
      case 'friend_accept':
        return <UserPlus size={13} className="text-blue-400" />;
      case 'community':
        return <Users size={13} className="text-emerald-400" />;
      default:
        return <Bell size={13} className="text-purple-400" />;
    }
  };

  const formatNotificationText = (notif) => {
    if (notif.message) return notif.message;
    if (notif.type === 'like') return 'liked your post.';
    if (notif.type === 'comment') return 'commented on your post.';
    if (notif.type === 'friend_request') return 'sent you a friend request.';
    if (notif.type === 'friend_accept') return 'accepted your friend request.';
    return 'interacted with your content.';
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button 
        onClick={handleToggle} 
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative p-2.5 rounded-xl hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-all cursor-pointer border-none bg-transparent flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-purple-500/50"
      >
        <Bell size={21} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-lg shadow-purple-900/50 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div 
          className="fixed md:absolute right-4 md:right-auto md:left-full md:-top-4 top-16 w-[calc(100vw-32px)] sm:w-96 max-w-[400px] bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/90 rounded-2xl shadow-2xl shadow-black/95 overflow-hidden z-50 animate-fadeIn flex flex-col max-h-[82vh] md:max-h-[520px]"
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-850 flex justify-between items-center bg-zinc-900/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm tracking-tight m-0">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>
          
          {/* Scrollable Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/80 overscroll-contain">
            {loading && notifications.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center text-zinc-500 gap-2">
                <Loader2 size={24} className="animate-spin text-purple-500" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-600">
                  <Bell size={22} className="opacity-40" />
                </div>
                <p className="text-xs font-semibold text-zinc-300 m-0">No notifications yet</p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
                  When people interact with your posts or profile, you'll see it here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.is_read;
                return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-zinc-900/70 transition-colors ${
                      isUnread ? 'bg-purple-950/25 border-l-2 border-purple-500' : 'bg-transparent'
                    }`}
                  >
                    {/* Sender Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-zinc-850 border border-zinc-700/60 overflow-hidden flex items-center justify-center">
                        {notif.sender_pic ? (
                          <img src={notif.sender_pic} alt={notif.sender_username || "User"} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-xs font-semibold">
                            {(notif.sender_username || "U").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow">
                        {getNotificationIcon(notif.type)}
                      </div>
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs text-zinc-200 leading-snug mb-1">
                        <span className="font-bold text-white mr-1 hover:underline">
                          {notif.sender_username}
                        </span>
                        <span className={isUnread ? "text-zinc-100 font-medium" : "text-zinc-400"}>
                          {formatNotificationText(notif)}
                        </span>
                      </p>
                      <p className="text-[10px] text-zinc-500 font-medium m-0 flex items-center gap-1.5">
                        {notif.created_at ? formatDistanceToNow(parseSafeDate(notif.created_at), { addSuffix: true }) : 'just now'}
                        {isUnread && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500" />
                        )}
                      </p>
                    </div>

                    {/* Post Thumbnail (if post interaction) */}
                    {notif.post_image && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-800 bg-zinc-900 self-center">
                        <img src={notif.post_image} alt="post" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Link to Full Notifications Page */}
          <div className="p-3 border-t border-zinc-850/80 bg-zinc-900/60 flex items-center justify-between flex-shrink-0 text-xs">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white flex items-center gap-1 font-semibold transition-colors text-decoration-none"
            >
              <span>View all notifications</span>
              <ArrowRight size={13} />
            </Link>
            <span className="text-[11px] text-zinc-600 font-medium">
              {notifications.length} total
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
