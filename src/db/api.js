import { getDB } from "./couch";


export async function fetchedUserData(user) {

  if (!user?.id) {
    return null; // or loader
  }

  const db = getDB(user?.id);

  
  if (!db) {
    return {
      tasks: [],
      teams: [],
      members: [],
      organizations: [],
      userList: [],
      timelogs: [],
    };
  }

  try {
    const result = await db.allDocs({ include_docs: true });
    const allDocs = result.rows.map((row) => row.doc).filter(Boolean);

    // -------------------------
    // MULTI-ORG SUPPORT (NEW)
    // -------------------------
    const accessRights = Array.isArray(user?.access_rights)
      ? user.access_rights
      : [];

    const orgIds = accessRights
      .map((a) => a.org_id)
      .filter(Boolean);

    const orgSet = new Set(orgIds);

    // helper
    const belongsToUserOrg = (doc) =>
      doc?.org_id && orgSet.has(doc.org_id);

    // -------------------------
    // FILTER BY TYPE + ORG
    // -------------------------
    const tasks = allDocs.filter(
      (d) => d.type === "task" && belongsToUserOrg(d)
    );

    const teams = allDocs.filter(
      (d) => d.type === "team" && belongsToUserOrg(d)
    );

    const organizations = allDocs.filter((d) =>
      d.type === "organization"
        ? orgSet.has(d._id)
        : false
    );

    const userBelongsToOrg = (userDoc) => {
      const rights = userDoc?.access_rights;

      if (!Array.isArray(rights)) return false;

      return rights.some((r) => orgSet.has(r.org_id));
    };
    const members = allDocs.filter(
      (d) => d.type === "user" && userBelongsToOrg(d)
    );

    const timelogs = allDocs.filter(
      (d) => d.type === "timelog" && belongsToUserOrg(d)
    );

    // -------------------------
    // RBAC TASK FILTER
    // -------------------------
    const filteredTasks = tasks.filter((task) => {
      const access = accessRights.find(
        (a) => a.org_id === task.org_id
      );

      if (!access) return false;

      const role = access.role;

      if (role === "owner" || role === "admin") {
        return true;
      }

      if (role === "member") {
        const userTeams = Array.isArray(access.team_id)
          ? access.team_id
          : [access.team_id].filter(Boolean);

        return Array.isArray(task.team_id)
          ? task.team_id.some((tid) =>
            userTeams.includes(tid)
          )
          : userTeams.includes(task.team_id);
      }

      return false;
    });

    return {
      tasks: filteredTasks,
      teams,
      members,
      organizations,
      timelogs,
      userList: allDocs
        .filter((d) => d.type === "user" && d.phone)
        .map((u) => ({
          user_id: u._id,
          phone: u.phone,
          first_name: u.first_name
        })),
    };
  } catch (err) {
    console.error("❌ PouchDB Fetch Error:", err);
    return {
      tasks: [],
      teams: [],
      members: [],
      organizations: [],
      userList: [],
      timelogs: [],
    };
  }
}



export async function getNotifications(user) {
  const db = getDB(user?.id);


  if (!db) return { notifications: [], unreadCount: 0 };

  try {
    const result = await db.allDocs({ include_docs: true });

    const allowedOrgIds =
      user?.access_rights?.map((ar) => ar.org_id) || [];

    const allDocs = result.rows
      .map((row) => row.doc)
      .filter(Boolean);


    // Only notifications
    const notifications = allDocs
      .filter((doc) => doc?.type === "notification")
      .filter((notif) => {
        const access = user?.access_rights?.find(
          (ar) => ar.org_id === notif.org_id
        );

        if (String(notif.user_id) === String(user?.id)) {
          return true;
        }

        if (!access) {
          return notif.category === "info";
        }

        const { role, team_ids } = access;
        const category = notif.category;

        if (category === "task_update" || category === "task_created") {
          if (role === "owner" || role === "admin") return true;
          if (role === "supervisor" || role === "member") {
            return team_ids?.includes(notif.team_id);
          }
        }

        return false;
      })
      .sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at); // 🔥 newest first
      });

    const unreadCount = notifications.filter((n) => {
      const readList = Array.isArray(n.read) ? n.read : [];

      const userId = user?.id || user?.id;

      // If user already read it → NOT unread
      if (readList.includes(userId)) return false;

      // Optional fallback if you still use status
      return n.status === "unread";
    }).length;

    return {
      notifications,
      unreadCount,
    };
  } catch (err) {
    console.error("❌ Notification Error:", err);
    return { notifications: [], unreadCount: 0 };
  }
}


export async function getTasksLogs(user, taskId) {
  const db = getDB(user?.id);

  if (!db) return { allLogs: [] };

  try {
    // 1. Get every document in the database
    const result = await db.allDocs({ include_docs: true });

    // 2. Extract the 'doc' from each row and apply your filters
    const logs = result.rows
      .map((row) => row.doc) // Extract the document
      .filter((doc) => 
        doc.type === "timelogs" && 
        String(doc.task_id) === String(taskId)
      );

    // 3. Sort and return
    return {
      allLogs: logs.sort((a, b) => {
        const aTime = a.created_at || a.started_at || "";
        const bTime = b.created_at || b.started_at || "";
        return bTime.localeCompare(aTime);
      }),
    };
  } catch (err) {
    console.error("Error fetching task logs:", err);
    return { allLogs: [] };
  }
}


export async function getTeam(teamId, userId) {
  const db = getDB(userId);
  if (!db || !teamId) return { team: null };

  try {
    // PouchDB fetches by ID directly from the single bucket
    const team = await db.get(teamId);

    // Optional: Safety check to ensure we didn't accidentally grab a different doc type
    if (team.type !== "team") {
      console.warn(`Document ${teamId} is not a team.`);
      return { team: null };
    }

    return { team };
  } catch (err) {
    // PouchDB throws a 404 error if not found
    if (err.status !== 404) {
      console.error("❌ Get team error:", err);
    }
    return { team: null };
  }
}

/**
 * Fetches a specific user document by ID
 */
export async function getUser(userId) {
  const db = getDB(userId);
  if (!db || !userId) return null;

  try {
    const userDoc = await db.get(userId);

    return userDoc;
  } catch (err) {
    if (err.status !== 404) {
      console.error("❌ Get user error:", err);
    }
    return null;
  }
}