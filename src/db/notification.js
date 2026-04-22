import { nanoid } from "nanoid";
import { getDB } from "@/db/couch";

export const createNotification = async (payload, userId) => {
  const db = getDB(userId);
  if (!db) return;

  const notification = {
    _id: `notif_${nanoid()}`,
    type: "notification", // The "PouchDB Table" identifier
    category: payload.type, // "task_created", "task_assigned", etc.
    title: payload.title,
    message: payload.message,

    task_id: payload.task_id ?? null,
    org_id: payload.org_id ?? null,
    team_id: payload.team_id ?? null,

    user_id: payload.user_id ?? null,
    created_by: payload.created_by ?? null,
    
    read: [],
    status: payload.status ?? "Pending",
    created_at: new Date().toISOString(),
  };

  await db.put(notification);

  // We don't really need the custom Event anymore if we use the usePouchChanges hook,
  // but keeping it doesn't hurt.
  window.dispatchEvent(new Event("notifications:changed"));

  return notification;
};