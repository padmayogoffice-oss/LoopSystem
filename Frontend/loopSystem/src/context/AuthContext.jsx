import React, { createContext, useState, useContext } from "react";
import api from "../utils/api"; // This should now work if api.js is in src/
import { toast } from "react-toastify";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token"));

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post("/mail/login", {
        email,
        password,
      });

      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        setToken(response.data.token);
        setUser({ email });
        toast.success("Login successful!");
        return true;
      } else {
        toast.error(response.data.message || "Login failed");
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.message || "Login failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    toast.info("Logged out successfully");
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};
