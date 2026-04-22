import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { startSync, stopSync } from "@/db/sync";

export default function SyncProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const started = useRef(false);
 

  // SyncProvider.jsx
useEffect(() => {
  if (!isAuthenticated || !user) return;

  if (!started.current) {
    // 👈 ADD dbName here!
    startSync({
      id: user.id,
      dbName: user.dbName 
    });

    started.current = true;
    console.log("🚀 Sync started for:", user.dbName);
  }

  return () => {
    stopSync();
    started.current = false;
  };
}, [isAuthenticated, user]);


  return children;
}