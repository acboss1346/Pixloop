import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Heart, MessageSquare, UserPlus, Users, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

export const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchNotifications = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await api.get("/notifications");
      const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
      const count = res.data?.unreadCount !== undefined ? res.data.unreadCount : list.filter(n => !n.is_read).length;
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll every 10 seconds for new notifications
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 10000);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await api.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      }
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
        return <Heart size={14} className="text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageSquare size={14} className="text-purple-400" />;
      case 'friend_request':
      case 'friend_accept':
        return <UserPlus size={14} className="text-blue-400" />;
      case 'community':
        return <Users size={14} className="text-emerald-400" />;
      default:
        return <Bell size={14} className="text-purple-400" />;
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
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleToggle} 
        aria-label="Notifications"
        className="relative p-2.5 rounded-xl hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
      >
        <Bell size={21} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-lg shadow-purple-900/50 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 md:left-full md:right-auto md:-top-4 mt-3 md:mt-0 md:ml-4 w-80 sm:w-96 bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden z-50 animate-fadeIn">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800/60 flex justify-between items-center bg-zinc-900/40">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm tracking-tight m-0">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors cursor-pointer border-none bg-transparent font-medium"
              >
                {markingAll ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCheck size={14} />
                )}
                Mark all read
              </button>
            )}
          </div>
          
          {/* Body */}
          <div className="max-h-96 overflow-y-auto divide-y divide-zinc-900">
            {loading ? (
              <div className="p-8 flex justify-center items-center">
                <Loader2 size={24} className="animate-spin text-purple-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                <Bell size={28} className="mx-auto mb-2 opacity-30" />
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-zinc-900/60 transition-colors ${!notif.is_read ? 'bg-purple-950/20' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/60 overflow-hidden flex items-center justify-center">
                      {notif.sender_pic ? (
                        <img src={notif.sender_pic} alt={notif.sender_username || "User"} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-semibold">
                          {(notif.sender_username || "U").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      {getNotificationIcon(notif.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs text-zinc-200 leading-snug mb-1">
                      <span className="font-semibold text-white mr-1">{notif.sender_username}</span>
                      {formatNotificationText(notif)}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      {notif.created_at ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }) : 'just now'}
                    </p>
                  </div>

                  {notif.post_image && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-800">
                      <img src={notif.post_image} alt="post" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-purple-500 self-center flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
