import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import { apiRequest } from "@/api/client";
import { resetLocalDB } from "@/db/couch";

const AuthContext = createContext();

// -------------------------
const STORAGE_KEYS = {
  ID: "id",
  TOKEN: "token",
  USERNAME: "username",
  DB: "dbName",
  ACCESS_RIGHTS: "access_rights",
};
// -------------------------

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  // -------------------------
  // SAVE SESSION
  // -------------------------
  const saveSession = useCallback((session) => {
    if (!session) return;

    localStorage.setItem(STORAGE_KEYS.ID, session.id || "");
    localStorage.setItem(STORAGE_KEYS.TOKEN, session.token || "");
    localStorage.setItem(STORAGE_KEYS.USERNAME, session.username || "");
    localStorage.setItem(STORAGE_KEYS.DB, session.dbName || "");
    localStorage.setItem(
      STORAGE_KEYS.ACCESS_RIGHTS,
      JSON.stringify(session.access_rights || [])
    );
  }, []);

  // -------------------------
  // CLEAR SESSION
  // -------------------------
  const clearSession = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach((key) =>
      localStorage.removeItem(key)
    );
  }, []);

  // -------------------------
  // INIT SESSION (ON RELOAD)
  // -------------------------
  useEffect(() => {
    const init = () => {
      try {
        const id = localStorage.getItem(STORAGE_KEYS.ID);
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const username = localStorage.getItem(STORAGE_KEYS.USERNAME);
        const dbName = localStorage.getItem(STORAGE_KEYS.DB);

        let access_rights = [];
        try {
          access_rights = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.ACCESS_RIGHTS) || "[]"
          );
        } catch {
          access_rights = [];
        }

        if (token && username && dbName) {
          const session = {
            id,
            username,
            token,
            dbName,
            access_rights,
          };

          setUser(session);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    init();
  }, []);

  // -------------------------
  // LOGIN
  // -------------------------
  const login = useCallback(async ({ phone, pin }) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const data = await apiRequest("/login", {
        method: "POST",
        body: {
          username: phone,
          password: pin,
        },
      });

      if (!data?.success) {
        throw new Error(data?.error || "Invalid credentials");
      }

      const { username, token, db, user } = data;

      const session = {
        id: user?.id || user?._id,
        username,
        token,
        dbName: db,
        access_rights: user?.access_rights || [],
      };

      saveSession(session);
      setUser(session);
      setIsAuthenticated(true);

      return session;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoadingAuth(false);
    }
  }, [saveSession]);

  // -------------------------
  // REGISTER
  // -------------------------
  const register = useCallback(async (formData) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const data = await apiRequest("/register", {
        method: "POST",
        body: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          username: formData.phone,
          password: formData.pin,
          role: formData.role,
          orgName: formData.orgName,
          orgDesc: formData.orgDesc,
        },
      });

      if (!data?.success) {
        throw new Error(data?.error || "Registration failed");
      }

      const { username, token, db, user } = data;

      const session = {
        id: user?.id || user?._id,
        username,
        token,
        dbName: db,
        access_rights: user?.access_rights || [],
      };

      saveSession(session);
      setUser(session);
      setIsAuthenticated(true);

      return session;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoadingAuth(false);
    }
  }, [saveSession]);

  // -------------------------
  // LOGOUT
  // -------------------------
  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    clearSession();
    resetLocalDB();
  }, [clearSession]);

  // -------------------------
  // ROLE HELPERS
  // -------------------------
  const hasFullAccess = useMemo(() => {
    if (!Array.isArray(user?.access_rights)) return false;

    return user.access_rights.some((a) =>
      ["owner", "admin"].includes(a.role)
    );
  }, [user]);

  // -------------------------
  // CONTEXT VALUE
  // -------------------------
  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      hasFullAccess,
      login,
      register,
      logout,
      setAuthError,
    }),
    [
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      hasFullAccess,
      login,
      register,
      logout,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// -------------------------
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};