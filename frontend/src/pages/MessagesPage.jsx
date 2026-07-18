import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { MessageSquare, Send, UserCheck, UserX, Loader2, ArrowLeft } from "lucide-react";
import "./MessagesPage.css";

export const MessagesPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  
  // Mobile layout state: show list vs active chat panel
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Poll for messages when a chat is open
  useEffect(() => {
    if (!activeFriend) return;
    
    // Fetch immediately on active friend change
    fetchMessages(activeFriend.id);

    // Set polling interval
    const interval = setInterval(() => {
      fetchMessages(activeFriend.id, false); // silent background fetch
    }, 4000);

    return () => clearInterval(interval);
  }, [activeFriend]);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [friendsRes, requestsRes] = await Promise.all([
        api.get("/friends"),
        api.get("/friends/requests")
      ]);
      setFriends(friendsRes.data);
      setIncomingRequests(requestsRes.data.incoming || []);

      // Autoselect friend if selectFriendId is passed in navigation state
      const selectFriendId = location.state?.selectFriendId;
      if (selectFriendId) {
        const found = friendsRes.data.find(f => f.id === parseInt(selectFriendId));
        if (found) {
          setActiveFriend(found);
          setShowMobileChat(true);
        }
      }
    } catch (err) {
      console.error("Failed to load messaging data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (friendId, showLoader = true) => {
    if (showLoader) setLoadingChat(true);
    try {
      const res = await api.get(`/chat/${friendId}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch message logs", err);
    } finally {
      if (showLoader) setLoadingChat(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeFriend) return;

    const messageText = newMessage.trim();
    setNewMessage(""); // optimistic clear input
    setSendingMsg(true);

    try {
      const res = await api.post(`/chat/${activeFriend.id}`, { message: messageText });
      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Failed to send message");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.put(`/friends/request/${requestId}/accept`);
      alert("Friend request accepted!");
      // Reload friends list and requests
      fetchInitialData();
    } catch (err) {
      console.error("Failed to accept friend request", err);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to decline this request?")) return;
    try {
      await api.delete(`/friends/request/${requestId}`);
      setIncomingRequests(incomingRequests.filter(r => r.id !== requestId));
    } catch (err) {
      console.error("Failed to decline request", err);
    }
  };

  const selectFriend = (friend) => {
    setActiveFriend(friend);
    setShowMobileChat(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 size={36} className="animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="messages-workspace">
      {/* Sidebar Section */}
      <div className={`workspace-sidebar ${showMobileChat ? 'hidden-mobile' : ''}`}>
        <div className="workspace-sidebar-header">
          <h1>Messages</h1>
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
          <h2>Chats</h2>
          {friends.length === 0 ? (
            <div className="no-chats-placeholder">
              <p className="text-zinc-500 text-sm">No friends added yet.</p>
              <p className="text-zinc-600 text-xs mt-1">Search for users and add them as friends to start chatting!</p>
            </div>
          ) : (
            <div className="friends-list">
              {friends.map((friend) => (
                <div 
                  key={friend.id}
                  onClick={() => selectFriend(friend)}
                  className={`friend-item ${activeFriend?.id === friend.id ? 'active' : ''}`}
                >
                  {friend.profile_pic ? (
                    <img src={friend.profile_pic} alt={friend.username} className="friend-avatar" />
                  ) : (
                    <div className="friend-avatar-placeholder">
                      {friend.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="friend-meta">
                    <span className="friend-name">{friend.username}</span>
                    <span className="friend-status-text">Click to message</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Direct Messaging Area */}
      <div className={`chat-workspace ${!showMobileChat ? 'hidden-mobile' : ''}`}>
        {!activeFriend ? (
          <div className="chat-welcome-screen">
            <div className="welcome-icon-circle">
              <MessageSquare size={36} />
            </div>
            <h3>Your Messages</h3>
            <p>Send private messages and requests to friends.</p>
          </div>
        ) : (
          <div className="chat-panel">
            {/* Chat Header */}
            <div className="chat-header">
              <button 
                onClick={() => setShowMobileChat(false)}
                className="btn-chat-back-mobile"
              >
                <ArrowLeft size={20} />
              </button>
              
              <Link to={`/profile/${activeFriend.username}`} className="chat-user-details">
                {activeFriend.profile_pic ? (
                  <img src={activeFriend.profile_pic} alt={activeFriend.username} className="chat-user-avatar" />
                ) : (
                  <div className="chat-user-avatar-placeholder">
                    {activeFriend.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="chat-username">{activeFriend.username}</span>
                  <span className="chat-user-status">View Profile</span>
                </div>
              </Link>
            </div>

            {/* Messages Body */}
            <div className="chat-messages-container">
              {loadingChat ? (
                <div className="chat-messages-loader">
                  <Loader2 size={24} className="animate-spin text-purple-500" />
                  <span>Loading history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="empty-conversation">
                  <p>No messages yet.</p>
                  <p className="text-zinc-500 mt-1">Say hello to {activeFriend.username}!</p>
                </div>
              ) : (
                <div className="messages-log">
                  {messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user._id || msg.sender_id === user.id;
                    return (
                      <div 
                        key={msg.id}
                        className={`message-bubble-wrapper ${isOwnMessage ? 'own' : 'received'}`}
                      >
                        <div className="message-bubble">
                          <p>{msg.message}</p>
                        </div>
                        <span className="message-timestamp">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Messages Input Box */}
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <input 
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message..."
                className="chat-text-input"
                required
              />
              <button 
                type="submit"
                className="chat-send-btn"
                disabled={sendingMsg || !newMessage.trim()}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
