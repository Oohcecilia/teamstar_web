export function hasAccessTask(user, task) {
  if (!user || !task) return false;

  const orgId = String(task.org_id);

  const access = user.access_rights?.find(
    (ar) => String(ar.org_id) === orgId
  );

  if (!access) return false;

  const role = access.role;

  return ["owner", "admin", "supervisor"].includes(role);
}