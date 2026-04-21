import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchedUserData } from "@/db/api";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { getSavedTheme, applyTheme } from "@/utils/theme";
import TaskDetailDialog from "../components/TaskDetailDialog";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import TaskFormDialog from "../components/TaskFormDialog";

export default function CalendarPage() {
  const { isAuthenticated, user, activeOrgId } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const [detailTask, setDetailTask] = useState(null);


  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : false;
  });

  const loadData = async () => {
    setLoading(true);

    const res = await fetchedUserData(user);

    setTasks(res?.tasks || []);
    setTeams(res?.teams || []);
    setMembers(res?.members || []);
    setOrganizations(res?.organizations?.flat?.() ?? []);

    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;

    const theme = getSavedTheme();
    setDarkMode(applyTheme(theme));

    loadData(); // 🔥 safe initial load
  }, [user]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), {
      weekStartsOn: 1,
    });
    const end = endOfWeek(endOfMonth(currentMonth), {
      weekStartsOn: 1,
    });

    const result = [];
    let day = start;

    while (day <= end) {
      result.push(day);
      day = addDays(day, 1);
    }

    return result;
  }, [currentMonth]);

  const getTasksForDate = (date) =>
    tasks.filter(
      (t) =>
        t.due_date &&
        isSameDay(new Date(t.due_date), date)
    );

  const selectedTasks = selectedDate
    ? getTasksForDate(selectedDate)
    : [];

  const priorityDot = {
    high: "bg-red-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Calendar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View tasks by date
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setCurrentMonth(subMonths(currentMonth, 1))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <h2 className="text-sm font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setCurrentMonth(addMonths(currentMonth, 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
            (d) => (
              <div
                key={d}
                className="text-xs font-medium text-muted-foreground text-center py-2"
              >
                {d}
              </div>
            )
          )}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayTasks = getTasksForDate(day);

            const isSelected =
              selectedDate &&
              isSameDay(day, selectedDate);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "min-h-[60px] md:min-h-[80px] p-1.5 border-b border-r border-border text-left transition-all relative",
                  !isSameMonth(day, currentMonth) &&
                  "opacity-30",
                  isSelected &&
                  "bg-primary/5 ring-2 ring-primary ring-inset",
                  isToday(day) && "bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full",
                    isToday(day) &&
                    "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>

                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayTasks.slice(0, 3).map((t) => (
                    <div
                      key={t._id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        priorityDot[t.priority] || "bg-primary"
                      )}
                      title={t.title}
                    />
                  ))}

                  {dayTasks.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">
                      +{dayTasks.length - 3}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date tasks */}
      {selectedDate && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Tasks for {format(selectedDate, "MMMM d, yyyy")}
            </h3>

            <span className="text-xs text-muted-foreground">
              {selectedTasks.length} task
              {selectedTasks.length !== 1 ? "s" : ""}
            </span>
          </div>

          {selectedTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No tasks for this date
            </p>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map((task) => (
                <div
                  key={task._id} // also fix this
                  onClick={() => setDetailTask(task)}
                  className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:shadow-md transition-all flex items-center gap-3"
                >
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      priorityDot[task.priority] ||
                      "bg-primary"
                    )}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {task.title}
                    </p>

                    {task.due_date && (
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(task.due_date),
                          "h:mm a"
                        )}
                      </p>
                    )}
                  </div>

                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                      task.status === "completed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <TaskDetailDialog
        open={!!detailTask}
        onOpenChange={(v) => { if (!v) setDetailTask(null); }}
        task={detailTask}
        members={members}
        onEdit={(t) => { setDetailTask(null); setEditTask(t); setShowForm(true); }}
      />

      <TaskFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        task={editTask}
        teams={teams}
        members={members}
        organizations={organizations}
        onSaved={loadData}
      />
    </div>
  );
}