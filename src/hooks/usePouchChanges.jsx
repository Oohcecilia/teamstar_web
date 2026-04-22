import { useEffect } from "react";
import { getDB } from "@/db/couch";

export default function usePouchChanges(user, callback, type) {
  useEffect(() => {
    if (!user?.id) return;

    const db = getDB(user.id);
    if (!db) return;

    const changes = db.changes({
      live: true,
      since: "now",
      include_docs: true,
    })
    .on("change", (change) => {
      const doc = change.doc;

      if (!type || doc?.type === type) {
        callback(doc); // 🔥 pass the changed doc
      }
    })
    .on("error", console.error);

    return () => changes.cancel();
  }, [user?.id, type, callback]);
}