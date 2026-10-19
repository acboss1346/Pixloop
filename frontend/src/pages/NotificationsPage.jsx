import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bell, Heart, MessageSquare, UserPlus, Users, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "../context/NotificationContext";
import { parseSafeDate } from "../utils/date";

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all"); // 'all' vs 'unread'

  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead
  } = useNotifications();

  const filteredNotifications = filter === "unread"
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

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
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-colors w-fit border-none bg-transparent cursor-pointer font-semibold text-sm"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Main Container */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/40">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight m-0">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Stay updated with your community activities, likes, comments, and messages.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNotifications(true)}
              disabled={loading}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors border-none bg-transparent cursor-pointer"
              title="Refresh notifications"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-purple-400" : ""} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-zinc-850 px-6 gap-6 text-xs bg-zinc-950/60">
          <button
            onClick={() => setFilter("all")}
            className={`py-3 font-semibold transition-all bg-transparent border-none cursor-pointer flex items-center gap-2 ${
              filter === "all"
                ? "text-white border-b-2 border-purple-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`py-3 font-semibold transition-all bg-transparent border-none cursor-pointer flex items-center gap-2 ${
              filter === "unread"
                ? "text-white border-b-2 border-purple-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Unread Only ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-zinc-900">
          {loading && notifications.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-zinc-500 gap-3">
              <Loader2 size={28} className="animate-spin text-purple-500" />
              <span className="text-xs">Loading all notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-16 text-center text-zinc-500">
              <Bell size={36} className="mx-auto mb-3 opacity-30 text-purple-400" />
              <h3 className="text-sm font-bold text-white mb-1">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {filter === "unread" 
                  ? "You've read all your notifications! Check the 'All' tab to review previous interactions."
                  : "When people like your posts, comment, or interact with you, your notifications will appear here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isUnread = !notif.is_read;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 sm:p-5 flex items-start gap-4 cursor-pointer hover:bg-zinc-900/60 transition-colors ${
                    isUnread ? 'bg-purple-950/20 border-l-2 border-purple-500' : 'bg-transparent'
                  }`}
                >
                  {/* Sender Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-zinc-850 border border-zinc-700/60 overflow-hidden flex items-center justify-center">
                      {notif.sender_pic ? (
                        <img src={notif.sender_pic} alt={notif.sender_username || "User"} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-sm font-bold">
                          {(notif.sender_username || "U").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow">
                      {getNotificationIcon(notif.type)}
                    </div>
                  </div>

                  {/* Text Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 leading-snug mb-1">
                      <span className="font-bold text-white mr-1.5 hover:underline">
                        {notif.sender_username}
                      </span>
                      <span className={isUnread ? "text-zinc-100 font-medium" : "text-zinc-400"}>
                        {formatNotificationText(notif)}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500 font-medium m-0 flex items-center gap-2">
                      {notif.created_at ? formatDistanceToNow(parseSafeDate(notif.created_at), { addSuffix: true }) : 'just now'}
                      {isUnread && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-purple-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          Unread
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Post Image Thumbnail */}
                  {notif.post_image && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-800 bg-zinc-900 self-center">
                      <img src={notif.post_image} alt="post" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
