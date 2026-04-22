import { createContext, useContext, useState, useCallback, useEffect } from "react";
import usePouchChanges from "@/hooks/usePouchChanges";
import { useAuth } from "@/lib/AuthContext";
import { fetchedUserData } from "@/db/api";

const DataContext = createContext();

export function DataProvider({ children }) {

  const { user } = useAuth();
  const [data, setData] = useState({
    tasks: [],
    teams: [],
    members: [],
    organizations: [],
    timelogs: [],
    userList: [],
  });

  const loadData = useCallback(async () => {
    if (!user) return;

    const res = await fetchedUserData(user);
    setData(res);
  }, [user]);

  // 🔥 Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🔥 Real-time updates
  usePouchChanges(user, () => {
    console.log("📡 Data changed → reloading...");
    loadData(); // ✅ centralized refresh
  });

  return (
    <DataContext.Provider value={{ ...data, reload: loadData }}>
      {children}
    </DataContext.Provider>
  );
}

export const useAppData = () => useContext(DataContext);