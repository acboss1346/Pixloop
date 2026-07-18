import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedInUser = localStorage.getItem("user");
    if (loggedInUser) {
      const parsed = JSON.parse(loggedInUser);
      const normalized = {
        ...parsed,
        id: parsed.id || parsed._id,
        _id: parsed._id || parsed.id
      };
      setUser(normalized);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data) {
        const normalizedUser = {
          ...response.data,
          id: response.data.id || response.data._id,
          _id: response.data._id || response.data.id
        };
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        setUser(normalizedUser);
        return true;
      }
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post("/auth/register", { username, email, password });
      if (response.data) {
        const normalizedUser = {
          ...response.data,
          id: response.data.id || response.data._id,
          _id: response.data._id || response.data.id
        };
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        setUser(normalizedUser);
        return true;
      }
    } catch (error) {
      console.error("Registration failed:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (updatedData) => {
    const merged = { ...user, ...updatedData };
    const updatedUser = {
      ...merged,
      id: merged.id || merged._id,
      _id: merged._id || merged.id
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within the AuthProvider");
  }
  return context;
};
