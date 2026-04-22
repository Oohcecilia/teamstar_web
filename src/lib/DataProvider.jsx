import { createContext, useContext, useState, useCallback, useEffect } from "react";
import usePouchChanges from "@/hooks/usePouchChanges";
import { useAuth } from "@/lib/AuthContext";
import { fetchedUserData } from "@/db/api";

const DataContext = createContext();

export function DataProvider({ children }) {
  const { user } = useAuth();

  // =========================
  // SAFE INITIAL STATE
  // =========================
  const [data, setData] = useState({
    tasks: [],
    teams: [],
    members: [],
    organizations: [],
    timelogs: [],
    userList: [],
  });

  const [loading, setLoading] = useState(false);

  // =========================
  // SAFE LOADER
  // =========================
  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const res = await fetchedUserData(user);

      // 🔥 CRITICAL: sanitize everything
      setData({
        tasks: res?.tasks ?? [],
        teams: res?.teams ?? [],
        members: res?.members ?? [],
        organizations: res?.organizations ?? [],
        timelogs: res?.timelogs ?? [],
        userList: res?.userList ?? [],
      });

    } catch (err) {
      console.error("DataProvider loadData error:", err);

      // fallback safe state (NEVER leave undefined)
      setData({
        tasks: [],
        teams: [],
        members: [],
        organizations: [],
        timelogs: [],
        userList: [],
      });

    } finally {
      setLoading(false);
    }
  }, [user]);

  // =========================
  // INITIAL LOAD (SAFE)
  // =========================
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  // =========================
  // REALTIME POUCHDB CHANGES
  // (debounced to avoid reload spam)
  // =========================
  usePouchChanges(user, () => {
    if (!user) return;

    console.log("📡 Data changed → reloading...");

    loadData();
  });

  // =========================
  // SAFE CONTEXT VALUE
  // =========================
  const safeData = {
    tasks: data.tasks ?? [],
    teams: data.teams ?? [],
    members: data.members ?? [],
    organizations: data.organizations ?? [],
    timelogs: data.timelogs ?? [],
    userList: data.userList ?? [],
  };

  return (
    <DataContext.Provider
      value={{
        ...safeData,
        reload: loadData,
        loading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useAppData = () => useContext(DataContext);