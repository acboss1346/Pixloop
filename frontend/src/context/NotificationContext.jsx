import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchNotifications = useCallback(async (showLoader = false) => {
    if (!user || isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (showLoader) setLoading(true);

    try {
      const res = await api.get("/notifications");
      const list = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.notifications || []);
      const count = res.data?.unreadCount !== undefined 
        ? res.data.unreadCount 
        : list.filter(n => !n.is_read).length;

      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      isFetchingRef.current = false;
      if (showLoader) setLoading(false);
    }
  }, [user]);

  // Initial load and periodic polling
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications(true);

    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 12000);

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user || unreadCount === 0 || markingAll) return;
    setMarkingAll(true);

    try {
      const res = await api.put("/notifications/read-all");
      // Update local state only after server confirmation
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      toast.success(res.data?.message || "All notifications marked as read");
      return true;
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      toast.error(err.response?.data?.message || "Failed to mark all as read");
      // Retain the unread state on failure
      return false;
    } finally {
      setMarkingAll(false);
    }
  }, [user, unreadCount, markingAll, toast]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!user) return;
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: 1 } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markingAll,
        fetchNotifications,
        markAllAsRead,
        markAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
