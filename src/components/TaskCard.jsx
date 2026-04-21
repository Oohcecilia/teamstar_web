import { Calendar, MapPin, Users, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, differenceInHours } from "date-fns";
import { getDB } from "@/db/couch";
import { createRecord } from "@/db/helpers";
import { useAuth } from "@/lib/AuthContext";



const priorityConfig = {
  high: { label: "High", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  low: { label: "Low", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

const statusConfig = {
  upcoming: { label: "Upcoming", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  today: { label: "Today", className: "bg-primary/10 text-primary" },
  previous: { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

function getDeadlineUrgency(due_date, status) {
  if (!due_date || status === "completed") return null;
  const due = new Date(due_date);
  const hoursUntil = differenceInHours(due, new Date());
  if (isPast(due) && !isToday(due)) return "overdue";
  if (isToday(due)) return "today";
  if (hoursUntil <= 48) return "soon";
  return null;
}

export default function TaskCard({ task, members, onClick }) {
  const { user } = useAuth();
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const status = statusConfig[task.status] || statusConfig.upcoming;
  const assignedMembers = (task.assigned_to || [])
    .map((id) => members?.find((m) => m.id === id))
    .filter(Boolean);

  const urgency = getDeadlineUrgency(task.due_date, task.status);
  const isCompleted = task.status === "completed";

  const handleComplete = async (task) => {
  try {

    const db = getDB(user?.username);
    // 1. UPDATE TASK IN POUCHDB
    // We must ensure the current _rev is included for the update to work
    const updatedTask = {
      ...task,
      status: "completed",
      updated_at: new Date().toISOString(),
    };

    // Assuming 'db' is your PouchDB instance for tasks
    // PouchDB uses .put() directly on the instance, not a table string
    await db.put(updatedTask);

    // 2. CREATE NOTIFICATION
    // Assuming createRecord is already set up to handle PouchDB logic
    await createRecord(user, "notifications", {
      type: "notification", // Crucial for your earlier filter logic!
      category: "task_updated",     // Added so your filter doesn't hide it
      title: "Task completed",
      message: `"${task.title}" was marked as completed.`,
      task_id: task._id,
      org_id: task.org_id ?? null,
      team_id: task.team_id ?? null,
      user_id: user?.id ?? null, // Best to assign the user who did it
      read: [],
    });

    // 3. TRIGGER UI UPDATE
    window.dispatchEvent(
      new CustomEvent("route:changed", {
        detail: { route: window.location.pathname }
      })
    );
    window.dispatchEvent(new Event("notifications:changed"));

  } catch (err) {
    if (err.name === 'conflict') {
      console.error("Conflict: This task was updated elsewhere.");
    } else {
      console.error("Complete task failed:", err);
    }
  }
};

  const urgencyBorder = {
    overdue: "border-red-400 dark:border-red-600",
    today: "border-amber-400 dark:border-amber-500",
    soon: "border-blue-300 dark:border-blue-500",
  };

  return (
    <div
      onClick={() => onClick?.(task)}
      className={cn(
        "bg-card border rounded-md p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 group relative",
        urgency ? urgencyBorder[urgency] : "border-border hover:border-primary/20"
      )}
    >
      {urgency && urgency !== "completed" && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-2 rounded-l-xl",
            urgency === "overdue" && "bg-red-500",
            urgency === "today" && "bg-amber-400",
            urgency === "soon" && "bg-blue-400"
          )}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <h3 className={cn("text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2", isCompleted && "line-through text-muted-foreground")}>
          {task.title}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", priority.className)}>
            {priority.label}
          </span>
          {!isCompleted && (
            <button
              onClick={(e) => { e.stopPropagation(); handleComplete(task); }}
              title="Mark as completed"
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap
                  bg-emerald-50 text-emerald-700
                  dark:bg-emerald-900/40 dark:text-emerald-300
                  hover:bg-emerald-100 dark:hover:bg-emerald-900/30
                  transition-colors
              "
            >
              <CheckCircle2 className="h-4 w-4" /> Complete
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", status.className)}>
          {status.label}
        </span>

        {task.due_date && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            urgency === "overdue" && "text-red-600 font-medium",
            urgency === "today" && "text-amber-600 font-medium",
            urgency === "soon" && "text-blue-600 font-medium",
            !urgency && "text-muted-foreground"
          )}>
            {urgency === "today" ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
            {format(new Date(task.due_date), "MMM d")}
            {urgency === "overdue" && <span className="ml-0.5">· Overdue</span>}
            {urgency === "today" && <span className="ml-0.5">· Due today</span>}
            {urgency === "soon" && <span className="ml-0.5">· Due soon</span>}
          </div>
        )}

        {task.location_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{task.location_name}</span>
          </div>
        )}
      </div>

      {assignedMembers.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3">
          <Users className="h-3 w-3 text-muted-foreground" />
          <div className="flex -space-x-2">
            {assignedMembers.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className="h-6 w-6 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center"
                title={m.full_name || m.email}
              >
                <span className="text-[9px] font-bold text-primary">
                  {(m.full_name || m.email || "?").charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
            {assignedMembers.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                <span className="text-[9px] font-bold text-muted-foreground">
                  +{assignedMembers.length - 3}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}