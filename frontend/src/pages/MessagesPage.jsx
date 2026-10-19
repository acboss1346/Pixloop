import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { EmojiPicker } from "../components/EmojiPicker";
import {
  MessageSquare, Send, UserCheck, UserX, Loader2, ArrowLeft,
  Paperclip, Smile, X, Reply, Edit2, Trash2, Check,
  Download, FileText, Film, Image as ImageIcon, CornerDownRight
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import "./MessagesPage.css";

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

export const MessagesPage = () => {
  const { user, unreadData, fetchUnreadCount } = useAuth();
  const location = useLocation();
  const toast = useToast();

  const [conversations, setConversations] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  // Attachment state
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Reply & Edit state
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Lightbox for image preview
  const [lightboxImage, setLightboxImage] = useState(null);

  // Mobile layout state
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Poll for messages when a chat is open
  useEffect(() => {
    if (!activeFriend) return;

    fetchMessages(activeFriend.id);

    const interval = setInterval(() => {
      fetchMessages(activeFriend.id, false);
    }, 3500);

    return () => clearInterval(interval);
  }, [activeFriend]);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [convRes, reqRes] = await Promise.allSettled([
        api.get("/chat/conversations"),
        api.get("/friends/requests")
      ]);

      if (convRes.status === "fulfilled" && Array.isArray(convRes.value.data)) {
        setConversations(convRes.value.data);
      } else {
        // Fallback to /friends if /chat/conversations isn't loaded
        const fallbackFriends = await api.get("/friends");
        setConversations(fallbackFriends.data || []);
      }

      if (reqRes.status === "fulfilled") {
        setIncomingRequests(reqRes.value.data?.incoming || []);
      }

      // Autoselect friend if selectFriendId is passed in navigation state
      const selectFriendId = location.state?.selectFriendId;
      if (selectFriendId) {
        const friendIdNum = parseInt(selectFriendId);
        const list = convRes.status === "fulfilled" ? convRes.value.data : [];
        const found = list.find(f => f.id === friendIdNum);
        if (found) {
          setActiveFriend(found);
          setShowMobileChat(true);
        } else {
          // fetch user profile directly to start chat
          try {
            const userRes = await api.get(`/auth/user/${friendIdNum}`);
            if (userRes.data) {
              setActiveFriend(userRes.data);
              setShowMobileChat(true);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load messaging data", err);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (friendId, showLoader = true) => {
    if (showLoader) setLoadingChat(true);
    try {
      const res = await api.get(`/chat/${friendId}`);
      setMessages(res.data);
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      if (showLoader) setLoadingChat(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size must be under 25MB");
      return;
    }

    setAttachment(file);
    if (file.type.startsWith("image/")) {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview(null);
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !activeFriend || sendingMsg) return;

    const messageText = newMessage.trim();
    const currentAttachment = attachment;
    const currentReply = replyingTo;

    // Optimistically reset inputs
    setNewMessage("");
    clearAttachment();
    setReplyingTo(null);
    setShowEmojiPicker(false);
    setSendingMsg(true);

    try {
      let res;
      if (currentAttachment) {
        const formData = new FormData();
        formData.append("attachment", currentAttachment);
        if (messageText) formData.append("message", messageText);
        if (currentReply) formData.append("reply_to_id", currentReply.id);

        res = await api.post(`/chat/${activeFriend.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        res = await api.post(`/chat/${activeFriend.id}`, {
          message: messageText,
          reply_to_id: currentReply ? currentReply.id : undefined
        });
      }

      setMessages((prev) => [...prev, res.data]);
      fetchInitialData(); // update conversation preview
    } catch (err) {
      console.error("Failed to send message", err);
      toast.error(err.response?.data?.message || "Failed to send message");
      // Restore input text on error
      setNewMessage(messageText);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAddReaction = async (messageId, emoji) => {
    try {
      const res = await api.post(`/chat/message/${messageId}/react`, { emoji });
      const currentUserId = user?.id || user?._id;

      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        let reactions = m.reactions ? [...m.reactions] : [];
        if (res.data.action === "added") {
          reactions.push({ message_id: messageId, user_id: currentUserId, emoji, username: user?.username });
        } else {
          reactions = reactions.filter(r => !(r.user_id === currentUserId && r.emoji === emoji));
        }
        return { ...m, reactions };
      }));
    } catch (err) {
      console.error("Failed to toggle reaction", err);
      toast.error("Failed to add reaction");
    }
  };

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setEditText(msg.message);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingMessage) return;
    try {
      const res = await api.put(`/chat/message/${editingMessage.id}`, { message: editText.trim() });
      setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, message: res.data.message, is_edited: 1 } : m));
      setEditingMessage(null);
      setEditText("");
      toast.success("Message edited");
    } catch (err) {
      console.error("Failed to edit message", err);
      toast.error("Failed to update message");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/chat/message/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.info("Message deleted");
    } catch (err) {
      console.error("Failed to delete message", err);
      toast.error("Failed to delete message");
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.put(`/friends/request/${requestId}/accept`);
      toast.success("Friend request accepted!");
      fetchInitialData();
    } catch (err) {
      console.error("Failed to accept friend request", err);
      toast.error("Failed to accept request");
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await api.delete(`/friends/request/${requestId}`);
      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
      toast.info("Friend request declined");
    } catch (err) {
      console.error("Failed to decline request", err);
      toast.error("Failed to decline request");
    }
  };

  const selectFriend = (friend) => {
    setActiveFriend(friend);
    setShowMobileChat(true);
    setReplyingTo(null);
    setEditingMessage(null);
    clearAttachment();
  };

  const formatSeparatorDate = (dateString) => {
    const d = new Date(dateString);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
  };

  const formatConversationTime = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMM d");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 size={36} className="animate-spin text-purple-500" />
      </div>
    );
  }

  const currentUserId = user?.id || user?._id;

  return (
    <div className="messages-workspace">
      {/* Sidebar Section */}
      <div className={`workspace-sidebar ${showMobileChat ? 'hidden-mobile' : ''}`}>
        <div className="workspace-sidebar-header flex items-center justify-between">
          <h1 className="text-xl font-bold text-white tracking-tight">Messages</h1>
          <span className="text-xs text-purple-400 font-semibold px-2 py-0.5 rounded-full bg-purple-950/40 border border-purple-800/30">
            {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
          </span>
        </div>

        {/* Incoming Requests Panel */}
        {incomingRequests.length > 0 && (
          <div className="requests-panel">
            <h2>Friend Requests ({incomingRequests.length})</h2>
            <div className="requests-list">
              {incomingRequests.map((req) => (
                <div key={req.id} className="request-card">
                  <div className="request-user-info">
                    {req.sender_pic ? (
                      <img src={req.sender_pic} alt={req.sender_username} className="request-avatar" />
                    ) : (
                      <div className="request-avatar-placeholder">
                        {req.sender_username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>{req.sender_username}</span>
                  </div>
                  <div className="request-actions">
                    <button 
                      onClick={() => handleAcceptRequest(req.id)}
                      className="btn-accept" 
                      title="Accept Request"
                    >
                      <UserCheck size={14} />
                      <span>Accept</span>
                    </button>
                    <button 
                      onClick={() => handleDeclineRequest(req.id)}
                      className="btn-decline" 
                      title="Decline Request"
                    >
                      <UserX size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends / Chats List */}
        <div className="chats-container">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Conversations</h2>
          </div>
          {conversations.length === 0 ? (
            <div className="no-chats-placeholder text-center py-12 px-4">
              <MessageSquare size={36} className="mx-auto mb-3 text-zinc-700" />
              <p className="text-zinc-400 text-sm font-semibold">No conversations yet</p>
              <p className="text-zinc-600 text-xs mt-1 leading-relaxed">
                Add friends using search or accept pending requests to start messaging!
              </p>
            </div>
          ) : (
            <div className="friends-list space-y-1">
              {conversations.map((friend) => {
                const unreadCount = friend.unread_count || unreadData?.bySender?.[friend.id] || 0;
                const isSelected = activeFriend?.id === friend.id;

                return (
                  <div 
                    key={friend.id}
                    onClick={() => selectFriend(friend)}
                    className={`friend-item flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected ? 'bg-purple-900/25 border-l-2 border-purple-500' : 'hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {friend.profile_pic ? (
                        <img src={friend.profile_pic} alt={friend.username} className="w-11 h-11 rounded-full object-cover border border-zinc-800" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                          {friend.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold shadow-md animate-pulse px-1">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-sm text-zinc-200 truncate">{friend.username}</span>
                        {friend.last_message_time && (
                          <span className="text-[10px] text-zinc-500 flex-shrink-0 ml-1">
                            {formatConversationTime(friend.last_message_time)}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate ${unreadCount > 0 ? 'text-white font-semibold' : 'text-zinc-400'}`}>
                        {friend.last_attachment_type ? (
                          <span className="flex items-center gap-1 text-purple-400">
                            {friend.last_attachment_type === 'image' && <ImageIcon size={12} />}
                            {friend.last_attachment_type === 'video' && <Film size={12} />}
                            {friend.last_attachment_type === 'document' && <FileText size={12} />}
                            {friend.last_message || `[${friend.last_attachment_type}]`}
                          </span>
                        ) : (
                          friend.last_message || "Start a conversation"
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Direct Messaging Area */}
      <div className={`chat-workspace ${!showMobileChat ? 'hidden-mobile' : ''}`}>
        {!activeFriend ? (
          <div className="chat-welcome-screen flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600/20 to-pink-600/20 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-400 shadow-2xl shadow-purple-950/50">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Your Direct Messages</h3>
            <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
              Select a friend from the list or accept incoming requests to start private, rich conversations.
            </p>
          </div>
        ) : (
          <div className="chat-panel flex flex-col h-full bg-black">
            {/* Chat Header */}
            <div className="chat-header p-4 border-b border-zinc-900/80 flex items-center justify-between bg-zinc-950/60 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowMobileChat(false)}
                  className="btn-chat-back-mobile p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border-none bg-transparent cursor-pointer"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={18} />
                </button>
                
                <Link to={`/profile/${activeFriend.username}`} className="chat-user-details flex items-center gap-3 group text-decoration-none">
                  {activeFriend.profile_pic ? (
                    <img src={activeFriend.profile_pic} alt={activeFriend.username} className="w-10 h-10 rounded-full object-cover border border-zinc-800" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center font-bold text-white text-sm">
                      {activeFriend.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors block">
                      {activeFriend.username}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">Click to view profile</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Messages Body */}
            <div className="chat-messages-container flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {loadingChat ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3">
                  <Loader2 size={28} className="animate-spin text-purple-500" />
                  <span className="text-xs">Loading message history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 text-zinc-500">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3 text-purple-400">
                    <Smile size={24} />
                  </div>
                  <p className="font-semibold text-zinc-300 text-sm">No messages yet</p>
                  <p className="text-xs text-zinc-500 mt-1">Say hello to {activeFriend.username} to get things started!</p>
                </div>
              ) : (
                <div className="messages-log flex flex-col space-y-4">
                  {messages.map((msg, index) => {
                    const isOwnMessage = msg.sender_id === currentUserId;
                    const prevMsg = messages[index - 1];
                    const showDateSeparator = !prevMsg || 
                      format(new Date(prevMsg.created_at), "yyyy-MM-dd") !== format(new Date(msg.created_at), "yyyy-MM-dd");

                    // Group reactions by emoji
                    const reactionsSummary = {};
                    if (Array.isArray(msg.reactions)) {
                      msg.reactions.forEach(r => {
                        if (!reactionsSummary[r.emoji]) {
                          reactionsSummary[r.emoji] = { count: 0, hasReacted: false, users: [] };
                        }
                        reactionsSummary[r.emoji].count += 1;
                        reactionsSummary[r.emoji].users.push(r.username);
                        if (r.user_id === currentUserId) {
                          reactionsSummary[r.emoji].hasReacted = true;
                        }
                      });
                    }

                    return (
                      <div key={msg.id} className="flex flex-col">
                        {/* Date separator */}
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-4">
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400 shadow-sm">
                              {formatSeparatorDate(msg.created_at)}
                            </span>
                          </div>
                        )}

                        <div className={`message-bubble-wrapper group relative flex flex-col ${isOwnMessage ? 'own self-end items-end' : 'received self-start items-start'} max-w-[85%] sm:max-w-[70%]`}>
                          {/* Hover action bar */}
                          <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 px-1.5 py-0.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-lg z-10 ${
                            isOwnMessage ? 'self-end' : 'self-start'
                          }`}>
                            {/* Quick Reactions */}
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleAddReaction(msg.id, emoji)}
                                className="w-6 h-6 flex items-center justify-center text-xs hover:scale-125 transition-transform bg-transparent border-none cursor-pointer"
                                title={`React ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}

                            <div className="w-[1px] h-3 bg-zinc-800 mx-0.5" />

                            {/* Reply button */}
                            <button
                              type="button"
                              onClick={() => setReplyingTo(msg)}
                              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors bg-transparent border-none cursor-pointer"
                              title="Reply"
                            >
                              <Reply size={13} />
                            </button>

                            {/* Edit button (own only) */}
                            {isOwnMessage && msg.message && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(msg)}
                                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors bg-transparent border-none cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}

                            {/* Delete button (own only) */}
                            {isOwnMessage && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors bg-transparent border-none cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          {/* Message Bubble Container */}
                          <div className={`p-3.5 rounded-2xl shadow-md ${
                            isOwnMessage 
                              ? 'bg-gradient-to-tr from-purple-700 to-indigo-600 text-white rounded-br-xs'
                              : 'bg-zinc-900/90 border border-zinc-800 text-zinc-100 rounded-bl-xs'
                          }`}>
                            {/* Reply Quote preview */}
                            {msg.reply && (
                              <div className={`mb-2.5 px-3 py-1.5 rounded-lg border-l-2 text-xs ${
                                isOwnMessage
                                  ? 'bg-black/20 border-purple-300 text-purple-100'
                                  : 'bg-zinc-950/60 border-purple-500 text-zinc-300'
                              }`}>
                                <span className="font-semibold block text-[10px] opacity-80">
                                  {msg.reply.sender_username || "User"}
                                </span>
                                <p className="truncate line-clamp-1 italic text-[11px] opacity-90 m-0">
                                  {msg.reply.message || "Attachment"}
                                </p>
                              </div>
                            )}

                            {/* Attachment rendering */}
                            {msg.attachment_url && (
                              <div className="mb-2 rounded-xl overflow-hidden">
                                {msg.attachment_type === 'image' && (
                                  <img 
                                    src={msg.attachment_url} 
                                    alt={msg.attachment_name || "Attachment"}
                                    onClick={() => setLightboxImage(msg.attachment_url)}
                                    className="max-h-72 w-auto max-w-full rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity" 
                                  />
                                )}
                                {msg.attachment_type === 'video' && (
                                  <video 
                                    src={msg.attachment_url} 
                                    controls 
                                    className="max-h-72 w-full rounded-xl bg-black"
                                  />
                                )}
                                {msg.attachment_type === 'document' && (
                                  <a
                                    href={msg.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={msg.attachment_name}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-black/30 hover:bg-black/50 transition-colors border border-white/10 text-white text-decoration-none"
                                  >
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0">
                                      <FileText size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold truncate m-0">{msg.attachment_name || "Document"}</p>
                                      {msg.attachment_size && (
                                        <p className="text-[10px] text-zinc-400 m-0">
                                          {(msg.attachment_size / 1024).toFixed(1)} KB
                                        </p>
                                      )}
                                    </div>
                                    <Download size={16} className="text-zinc-400 flex-shrink-0" />
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Text content or edit input */}
                            {editingMessage?.id === msg.id ? (
                              <div className="mt-1 space-y-2">
                                <textarea
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="w-full bg-black/40 border border-white/20 rounded-lg p-2 text-xs text-white resize-none outline-none focus:border-purple-300"
                                  rows={2}
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingMessage(null)}
                                    className="px-2.5 py-1 text-[11px] rounded bg-white/10 hover:bg-white/20 text-white border-none cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleSaveEdit}
                                    className="px-2.5 py-1 text-[11px] rounded bg-emerald-500 hover:bg-emerald-600 text-white border-none cursor-pointer font-bold flex items-center gap-1"
                                  >
                                    <Check size={12} /> Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              msg.message && (
                                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words m-0">
                                  {msg.message}
                                </p>
                              )
                            )}
                          </div>

                          {/* Footer: timestamp + edited status */}
                          <div className={`flex items-center gap-1.5 mt-1 px-1 text-[10px] text-zinc-500 ${isOwnMessage ? 'self-end' : 'self-start'}`}>
                            {msg.is_edited ? <span className="italic">(edited)</span> : null}
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          {/* Reaction Chips */}
                          {Object.keys(reactionsSummary).length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'self-end justify-end' : 'self-start'}`}>
                              {Object.entries(reactionsSummary).map(([emoji, data]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleAddReaction(msg.id, emoji)}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all cursor-pointer ${
                                    data.hasReacted 
                                      ? 'bg-purple-900/40 border-purple-500/60 text-purple-200'
                                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                  }`}
                                  title={data.users.join(', ')}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-bold text-[10px]">{data.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Replying-to banner */}
            {replyingTo && (
              <div className="px-4 py-2 bg-zinc-900/90 border-t border-zinc-800/80 flex items-center justify-between text-xs animate-slideIn">
                <div className="flex items-center gap-2 overflow-hidden">
                  <CornerDownRight size={14} className="text-purple-400 flex-shrink-0" />
                  <span className="text-zinc-400 flex-shrink-0">Replying to <b className="text-white">{replyingTo.sender_username || "User"}</b>:</span>
                  <span className="text-zinc-300 truncate italic">
                    {replyingTo.message || "[Attachment]"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 bg-transparent border-none cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Attachment preview banner */}
            {attachment && (
              <div className="px-4 py-2.5 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between animate-slideIn">
                <div className="flex items-center gap-3">
                  {attachmentPreview ? (
                    <img src={attachmentPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-zinc-700" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate max-w-xs m-0">{attachment.name}</p>
                    <p className="text-[10px] text-zinc-400 m-0">{(attachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearAttachment}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 bg-transparent border-none cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="chat-input-bar relative p-3 sm:p-4 border-t border-zinc-900 bg-zinc-950 flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
              />

              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-zinc-400 hover:text-purple-400 hover:bg-zinc-900 transition-colors bg-transparent border-none cursor-pointer flex-shrink-0"
                title="Attach file"
              >
                <Paperclip size={19} />
              </button>

              {/* Emoji Button & Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-xl transition-colors bg-transparent border-none cursor-pointer flex-shrink-0 ${
                    showEmojiPicker ? "text-purple-400 bg-zinc-900" : "text-zinc-400 hover:text-purple-400 hover:bg-zinc-900"
                  }`}
                  title="Emoji picker"
                >
                  <Smile size={19} />
                </button>
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={(emoji) => setNewMessage(prev => prev + emoji)}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>

              {/* Message Input */}
              <input 
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={attachment ? "Add a caption..." : "Message..."}
                className="flex-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
              />

              {/* Send Button */}
              <button 
                type="submit"
                className="chat-send-btn p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-30 disabled:hover:bg-purple-600 transition-all cursor-pointer border-none flex-shrink-0 shadow-lg shadow-purple-900/40"
                disabled={sendingMsg || (!newMessage.trim() && !attachment)}
                title="Send message (Enter)"
              >
                {sendingMsg ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={lightboxImage} 
              alt="Fullscreen" 
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" 
            />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <a
                href={lightboxImage}
                target="_blank"
                rel="noopener noreferrer"
                download
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full bg-zinc-900/80 text-white hover:bg-zinc-800 transition-colors border border-zinc-700 text-decoration-none flex items-center justify-center"
                title="Download"
              >
                <Download size={18} />
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-full bg-zinc-900/80 text-white hover:bg-zinc-800 transition-colors border border-zinc-700 cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
