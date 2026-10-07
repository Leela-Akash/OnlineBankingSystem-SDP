import { createContext, useState, useContext, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const role = localStorage.getItem("userRole");
    const id = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    return role ? { role, id, username } : null;
  });

  // Dark Mode state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("bank_theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark-theme");
      localStorage.setItem("bank_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark-theme");
      localStorage.setItem("bank_theme", "light");
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  const login = useCallback((authData) => {
    const { accessToken, refreshToken, role, userId, username } = authData;
    if (accessToken) localStorage.setItem("token", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    if (role) localStorage.setItem("userRole", role);
    if (userId !== undefined && userId !== null) localStorage.setItem("userId", userId.toString());
    if (username) localStorage.setItem("username", username);

    setToken(accessToken);
    setUser({ role, id: userId, username });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    sessionStorage.clear();

    setToken(null);
    setUser(null);
  }, []);

  // Listen for auto-logout emitted by axios interceptor
  useEffect(() => {
    const handleAutoLogout = () => {
      logout();
    };
    window.addEventListener("auth:logout", handleAutoLogout);
    return () => window.removeEventListener("auth:logout", handleAutoLogout);
  }, [logout]);

  const value = {
    token,
    user,
    role: user?.role || null,
    isAuthenticated: Boolean(token && user?.role),
    isAdminLoggedIn: user?.role === "ADMIN",
    isCustomerLoggedIn: user?.role === "CUSTOMER",
    isStaffLoggedIn: user?.role === "STAFF",
    darkMode,
    toggleTheme,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
